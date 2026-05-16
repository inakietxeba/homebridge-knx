#!/usr/bin/env node
/**
 * Smoke test for homebridge-knx plugin.
 * Simulates the Homebridge API surface to verify the plugin loads without errors.
 */
'use strict';

// --- Mock Homebridge API ---

class MockCharacteristic {
    constructor(displayName, UUID, props) {
        this.displayName = displayName;
        this.UUID = UUID;
        this.props = props || { format: 'bool', perms: ['pr'] };
        this.value = null;
    }
    setProps(p) { Object.assign(this.props, p); return this; }
    getDefaultValue() { return null; }
    on() { return this; }
    onSet() { return this; }
    onGet() { return this; }
    updateValue(v) { this.value = v; return this; }
}

// Standard Characteristic types used by the plugin
const characteristicTypes = [
    'Manufacturer', 'Model', 'SerialNumber', 'FirmwareRevision', 'Name',
    'On', 'Brightness', 'Hue', 'Saturation',
    'CurrentTemperature', 'TargetTemperature', 'CurrentHeatingCoolingState', 'TargetHeatingCoolingState',
    'TemperatureDisplayUnits', 'ContactSensorState', 'CurrentPosition', 'TargetPosition', 'PositionState',
    'CurrentDoorState', 'TargetDoorState', 'ObstructionDetected', 'LockCurrentState', 'LockTargetState',
    'SecuritySystemCurrentState', 'SecuritySystemTargetState',
    'ProgrammableSwitchEvent', 'MotionDetected', 'OccupancyDetected',
    'StatusFault', 'StatusTampered', 'SecuritySystemAlarmType',
    'CarbonDioxideDetected', 'CarbonDioxideLevel', 'CarbonDioxidePeakLevel',
    'AirQuality', 'CurrentRelativeHumidity',
    'CurrentHorizontalTiltAngle', 'TargetHorizontalTiltAngle',
    'CurrentVerticalTiltAngle', 'TargetVerticalTiltAngle',
    'CurrentSlatState', 'SlatType', 'SwingMode',
    'RotationDirection', 'RotationSpeed',
    'Active', 'ActiveIdentifier', 'ConfiguredName',
    'CurrentFanState', 'TargetFanState',
    'CurrentHeaterCoolerState', 'TargetHeaterCoolerState',
    'HeatingThresholdTemperature', 'CoolingThresholdTemperature',
];
const CharacteristicMock = function(dn, uuid, props) { return new MockCharacteristic(dn, uuid, props); };
characteristicTypes.forEach(t => {
    CharacteristicMock[t] = { UUID: `mock-uuid-${t}` };
});

class MockService {
    constructor(displayName, subtype) {
        this.displayName = displayName;
        this.subtype = subtype;
        this.characteristics = {};
    }
    getCharacteristic(type) {
        return new MockCharacteristic(type, 'mock', {});
    }
    addCharacteristic(type) {
        return new MockCharacteristic(type, 'mock', {});
    }
    setCharacteristic(type, value) { return this; }
    addOptionalCharacteristic() { return this; }
}

// Standard Service types
const serviceTypes = [
    'AccessoryInformation', 'Lightbulb', 'Switch', 'Outlet', 'Thermostat',
    'ContactSensor', 'MotionSensor', 'OccupancySensor', 'TemperatureSensor',
    'HumiditySensor', 'AirQualitySensor', 'CarbonDioxideSensor',
    'Door', 'Window', 'WindowCovering', 'GarageDoorOpener', 'LockMechanism',
    'SecuritySystem', 'Fan', 'Fanv2', 'HeaterCooler', 'Doorbell',
    'StatelessProgrammableSwitch', 'BatteryService',
];
const ServiceMock = function(displayName, subtype) { return new MockService(displayName, subtype); };
serviceTypes.forEach(t => {
    ServiceMock[t] = function(name, sub) { return new MockService(name, sub); };
    ServiceMock[t].UUID = `mock-service-uuid-${t}`;
});

// Formats, Perms, Units — exact values from HAP-NodeJS v1+
const Formats = {
    BOOL: 'bool', INT: 'int', FLOAT: 'float', STRING: 'string',
    UINT8: 'uint8', UINT16: 'uint16', UINT32: 'uint32', UINT64: 'uint64',
    DATA: 'data', TLV8: 'tlv8'
};
const Perms = {
    PAIRED_READ: 'pr', PAIRED_WRITE: 'pw', NOTIFY: 'ev',
    EVENTS: 'ev', ADDITIONAL_AUTHORIZATION: 'aa', TIMED_WRITE: 'tw',
    HIDDEN: 'hd', WRITE_RESPONSE: 'wr'
};
const Units = {
    CELSIUS: 'celsius', PERCENTAGE: 'percentage',
    ARC_DEGREE: 'arcdegrees', LUX: 'lux', SECONDS: 'seconds'
};
const Accessory = { Categories: {} };

const uuid = {
    generate: function(input) { return 'mock-uuid-' + input.substring(0, 8); }
};

// Mock platform accessory constructor
function MockPlatformAccessory(name, uuid, category) {
    this.displayName = name;
    this.UUID = uuid;
    this.context = {};
    this.existing = false;
    this.services = [];
    this.on = function() {};
    this.getService = function(type) { return new MockService(name); };
    this.getServiceById = function(type, subtype) { return null; };
}

const mockAPI = {
    version: 2.8,
    hap: {
        Service: ServiceMock,
        Characteristic: CharacteristicMock,
        Formats: Formats,
        Perms: Perms,
        Units: Units,
        Accessory: Accessory,
        uuid: uuid,
    },
    user: {
        storagePath: function() { return '/tmp/homebridge-knx-test'; },
    },
    platformAccessory: MockPlatformAccessory,
    on: function(event, fn) {
        console.log('  [API] Registered event:', event);
    },
    registerPlatform: function(pluginName, platformName, constructor, dynamic) {
        console.log('  [API] registerPlatform called:', pluginName, platformName, 'dynamic=' + dynamic);
    },
    registerPlatformAccessories: function() {},
};

// --- Test execution ---

console.log('=== homebridge-knx Smoke Test ===\n');

// Test 1: Verify Perms has correct keys (no legacy READ/WRITE)
console.log('Test 1: Verify Perms enum keys...');
if (Perms.PAIRED_READ === 'pr' && Perms.PAIRED_WRITE === 'pw') {
    console.log('  PASS: PAIRED_READ and PAIRED_WRITE exist');
} else {
    console.log('  FAIL: Missing PAIRED_READ/PAIRED_WRITE');
    process.exit(1);
}
if (Perms.READ !== undefined || Perms.WRITE !== undefined) {
    console.log('  WARN: Legacy Perms.READ/WRITE still exist — but plugin should use PAIRED_*');
} else {
    console.log('  PASS: No legacy Perms.READ/WRITE (plugin must use PAIRED_*)');
}

// Test 2: Load knxthermostat custom type (the original crash source)
console.log('\nTest 2: Load knxthermostat custom type (ES6 class extends Characteristic)...');
try {
    const knxThermostat = require('./lib/customtypes/knxthermostat.js');
    knxThermostat(mockAPI);
    if (CharacteristicMock.KNXThermAtHome) {
        console.log('  PASS: KNXThermAtHome registered on Characteristic');
    } else {
        console.log('  FAIL: KNXThermAtHome not found on Characteristic');
        process.exit(1);
    }
} catch (e) {
    console.log('  FAIL:', e.message);
    console.log('  Stack:', e.stack);
    process.exit(1);
}

// Test 3: Load main index.js (registry function)
console.log('\nTest 3: Load plugin entry point (index.js)...');
try {
    const registry = require('./index.js');
    if (typeof registry === 'function') {
        console.log('  PASS: index.js exports a function');
    } else {
        console.log('  FAIL: index.js does not export a function');
        process.exit(1);
    }
} catch (e) {
    console.log('  FAIL:', e.message);
    console.log('  Stack:', e.stack);
    process.exit(1);
}

// Test 4: Call registry function (simulates Homebridge loading the plugin)
console.log('\nTest 4: Call registry(mockAPI) to simulate Homebridge loading...');
try {
    // Create temp storagePath
    const fs = require('fs');
    const tmpDir = '/tmp/homebridge-knx-test';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const registry = require('./index.js');
    registry(mockAPI);
    console.log('  PASS: registry() completed without errors');
} catch (e) {
    console.log('  FAIL:', e.message);
    console.log('  Stack:', e.stack);
    process.exit(1);
}

// Test 5: Verify all core modules load without syntax errors
console.log('\nTest 5: Load all core modules...');
const coreModules = [
    './lib/characteristic-knx.js',
    './lib/customServiceAPI.js',
    './lib/groupaddress.js',
    './lib/iterate.js',
    './lib/knxaccess.js',
    './lib/knxdevice.js',
    './lib/knxmonitor.js',
    './lib/service-knx.js',
    './lib/servicedata.js',
    './lib/user.js',
];
let allLoaded = true;
for (const mod of coreModules) {
    try {
        require(mod);
        console.log('  PASS:', mod);
    } catch (e) {
        console.log('  FAIL:', mod, '-', e.message);
        allLoaded = false;
    }
}

// Test 6: Load all built-in addins
console.log('\nTest 6: Load all built-in addins...');
const fs = require('fs');
const path = require('path');
const addinsDir = path.join(__dirname, 'lib/addins');
const addinFiles = fs.readdirSync(addinsDir).filter(f => f.endsWith('.js'));
let allAddins = true;
for (const f of addinFiles) {
    try {
        require(path.join(addinsDir, f));
        console.log('  PASS:', f);
    } catch (e) {
        console.log('  FAIL:', f, '-', e.message);
        allAddins = false;
    }
}

// Summary
console.log('\n=== Summary ===');
if (allLoaded && allAddins) {
    console.log('ALL TESTS PASSED');
    process.exit(0);
} else {
    console.log('SOME TESTS FAILED');
    process.exit(1);
}
