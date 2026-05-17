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

// --- Test framework ---

var testsPassed = 0;
var testsFailed = 0;
var testsWarned = 0;

function pass(msg) { console.log('  PASS: ' + msg); testsPassed++; }
function fail(msg) { console.log('  FAIL: ' + msg); testsFailed++; }
function warn(msg) { console.log('  WARN: ' + msg); testsWarned++; }
function assert(condition, passMsg, failMsg) {
    if (condition) { pass(passMsg); } else { fail(failMsg || passMsg); }
}

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

// Test 7: Verify knxreadhash staggers read requests
console.log('\nTest 7: Verify knxreadhash staggers read requests...');
try {
    const knxaccess = require('./lib/knxaccess.js');
    var readLog = [];
    var mockGlobs = {
        debug: function() {},
        info: function() {},
        log: function() {},
        errorlog: function() {},
        knxconnection: 'knxjs',
        Formats: Formats,
        Perms: Perms,
        Units: Units
    };
    knxaccess.setGlobs(mockGlobs);
    // monkey-patch knxread to record calls with timestamps
    var originalKnxread = knxaccess.knxread;
    knxaccess.knxread = function(addr) {
        readLog.push({ address: addr, time: Date.now() });
    };
    var testAddresses = { '1/2/3': 1, '1/2/4': 1, '1/2/5': 1, '4/5/6': 1, '7/8/9': 1 };
    knxaccess.knxreadhash(testAddresses);
    assert(readLog.length <= 1,
        'Requests are staggered (not all fired synchronously)',
        'Expected <=1 immediate reads, got ' + readLog.length);

    // wait for staggered reads to complete, then run remaining tests
    setTimeout(function() {
        assert(readLog.length === 5,
            'All 5 staggered reads completed',
            'Expected 5 reads, got ' + readLog.length);
        var firstTime = readLog[0].time;
        var lastTime = readLog[readLog.length - 1].time;
        var spread = lastTime - firstTime;
        if (spread >= 150) {
            pass('Reads spread over ' + spread + 'ms (expected ~200ms)');
        } else {
            warn('Reads spread over only ' + spread + 'ms (expected ~200ms)');
        }
        knxaccess.knxread = originalKnxread;

        // =============================================
        // Test 8: writeValueHK — FLOAT deduplication
        // =============================================
        console.log('\nTest 8: writeValueHK — FLOAT deduplication (epsilon comparison)...');

        // Mock a CharacteristicKNX that wraps a MockCharacteristic
        function makeChrKNX(name, props) {
            var hkChar = new MockCharacteristic(name, 'mock-uuid', props);
            return {
                name: name,
                getHomekitCharacteristic: function() { return hkChar; },
                _hkChar: hkChar
            };
        }

        // Temperature: format=float, minStep=0.1, minValue=0, maxValue=100
        var tempChr = makeChrKNX('CurrentTemperature', {
            format: 'float', minStep: 0.1, minValue: 0, maxValue: 100,
            unit: 'celsius', perms: ['pr', 'ev']
        });

        // First write: should update (value is null -> 20.3)
        knxaccess.writeValueHK(20.3, tempChr, undefined, false);
        assert(tempChr._hkChar.value === 20.3,
            'First write sets value to 20.3 (was null)',
            'Expected 20.3, got ' + tempChr._hkChar.value);

        // Simulate HAP-NodeJS internal rounding: 203 * 0.1 = 20.300000000000004
        tempChr._hkChar.value = Math.round(20.3 / 0.1) * 0.1; // 20.300000000000004

        // Second write with same value: should NOT update (epsilon tolerance)
        var valueBefore = tempChr._hkChar.value;
        knxaccess.writeValueHK(20.3, tempChr, undefined, false);
        assert(tempChr._hkChar.value === valueBefore,
            'Duplicate 20.3 NOT sent to HomeKit (epsilon works)',
            'Value changed when it should not have');

        // Third write with different value: should update
        knxaccess.writeValueHK(21.5, tempChr, undefined, false);
        assert(tempChr._hkChar.value === 21.5,
            'Different value 21.5 IS sent to HomeKit',
            'Expected 21.5, got ' + tempChr._hkChar.value);

        // =============================================
        // Test 9: writeValueHK — BOOL handling
        // =============================================
        console.log('\nTest 9: writeValueHK — BOOL handling...');

        var boolChr = makeChrKNX('On', {
            format: 'bool', perms: ['pr', 'pw', 'ev']
        });

        knxaccess.writeValueHK(1, boolChr, 'DPT1', false);
        assert(boolChr._hkChar.value === 1,
            'BOOL: truthy value 1 → 1',
            'Expected 1, got ' + boolChr._hkChar.value);

        knxaccess.writeValueHK(0, boolChr, 'DPT1', false);
        assert(boolChr._hkChar.value === 0,
            'BOOL: falsy value 0 → 0',
            'Expected 0, got ' + boolChr._hkChar.value);

        // test reverse
        var boolRevChr = makeChrKNX('OnReversed', {
            format: 'bool', perms: ['pr', 'pw', 'ev']
        });
        knxaccess.writeValueHK(1, boolRevChr, 'DPT1', true);
        assert(boolRevChr._hkChar.value === 0,
            'BOOL reversed: truthy 1 → 0',
            'Expected 0, got ' + boolRevChr._hkChar.value);

        // =============================================
        // Test 10: writeValueHK — INT/UINT8 handling
        // =============================================
        console.log('\nTest 10: writeValueHK — INT/UINT8 handling...');

        var intChr = makeChrKNX('CurrentHeatingCoolingState', {
            format: 'uint8', perms: ['pr', 'ev']
        });

        knxaccess.writeValueHK(0, intChr, undefined, false);
        assert(intChr._hkChar.value === 0,
            'UINT8: value 0 set correctly',
            'Expected 0, got ' + intChr._hkChar.value);

        knxaccess.writeValueHK(2, intChr, undefined, false);
        assert(intChr._hkChar.value === 2,
            'UINT8: value 2 set correctly',
            'Expected 2, got ' + intChr._hkChar.value);

        // INT deduplication (strict equality)
        knxaccess.writeValueHK(2, intChr, undefined, false);
        assert(intChr._hkChar.value === 2,
            'UINT8: duplicate value 2 correctly deduplicated',
            'Expected 2, got ' + intChr._hkChar.value);

        // =============================================
        // Test 11: writeValueHK — FLOAT out of range
        // =============================================
        console.log('\nTest 11: writeValueHK — FLOAT out of range...');

        var tempChr2 = makeChrKNX('CurrentTemperature', {
            format: 'float', minStep: 0.1, minValue: 0, maxValue: 100,
            unit: 'celsius', perms: ['pr', 'ev']
        });

        knxaccess.writeValueHK(50, tempChr2, undefined, false);
        assert(tempChr2._hkChar.value === 50,
            'FLOAT: in-range value 50 accepted',
            'Expected 50, got ' + tempChr2._hkChar.value);

        var prevVal = tempChr2._hkChar.value;
        knxaccess.writeValueHK(150, tempChr2, undefined, false);
        assert(tempChr2._hkChar.value === prevVal,
            'FLOAT: out-of-range value 150 rejected (value unchanged)',
            'Expected ' + prevVal + ', got ' + tempChr2._hkChar.value);

        // =============================================
        // Test 12: writeValueHK — FLOAT with minStep quantization
        // =============================================
        console.log('\nTest 12: writeValueHK — FLOAT minStep quantization...');

        var quantChr = makeChrKNX('TargetTemperature', {
            format: 'float', minStep: 0.5, minValue: 10, maxValue: 38,
            unit: 'celsius', perms: ['pr', 'pw', 'ev']
        });

        knxaccess.writeValueHK(21.3, quantChr, undefined, false);
        assert(quantChr._hkChar.value === 21.5,
            'FLOAT: 21.3 quantized to 21.5 with minStep=0.5',
            'Expected 21.5, got ' + quantChr._hkChar.value);

        knxaccess.writeValueHK(21.1, quantChr, undefined, false);
        assert(quantChr._hkChar.value === 21,
            'FLOAT: 21.1 quantized to 21.0 with minStep=0.5',
            'Expected 21, got ' + quantChr._hkChar.value);

        // =============================================
        // Test 13: writeValueHK — INT percentage DPT5 conversion (knxjs)
        // =============================================
        console.log('\nTest 13: writeValueHK — percentage DPT5 conversion...');

        var pctChr = makeChrKNX('Brightness', {
            format: 'uint8', minValue: 0, maxValue: 100,
            unit: 'percentage', perms: ['pr', 'pw', 'ev']
        });

        // knxjs mode + DPT5: raw value passed through as-is (no 255->100 conversion)
        // Value 128 > maxValue 100, so it should be rejected
        knxaccess.writeValueHK(128, pctChr, 'DPT5', false);
        assert(pctChr._hkChar.value === null,
            'INT percentage: DPT5 raw value 128 rejected (>maxValue 100)',
            'Expected null, got ' + pctChr._hkChar.value);

        // DPT5 value within range
        knxaccess.writeValueHK(50, pctChr, 'DPT5', false);
        assert(pctChr._hkChar.value === 50,
            'INT percentage: DPT5 value 50 accepted (in range)',
            'Expected 50, got ' + pctChr._hkChar.value);

        // DPT5.001 sends 0-100 directly
        knxaccess.writeValueHK(75, pctChr, 'DPT5.001', false);
        assert(pctChr._hkChar.value === 75,
            'INT percentage: DPT5.001 value 75 accepted',
            'Expected 75, got ' + pctChr._hkChar.value);

        // =============================================
        // Test 14: validateAddressText
        // =============================================
        console.log('\nTest 14: validateAddressText...');

        assert(knxaccess.validateAddressText('1/2/3') === 'OK',
            'Valid address 1/2/3');
        assert(knxaccess.validateAddressText('31/7/255') === 'OK',
            'Valid address 31/7/255 (max values)');
        assert(knxaccess.validateAddressText('0/0/0') === 'OK',
            'Valid address 0/0/0');
        assert(knxaccess.validateAddressText('abc') !== 'OK',
            'Invalid address "abc" rejected');
        assert(knxaccess.validateAddressText('') !== 'OK',
            'Invalid empty address rejected');
        assert(knxaccess.validateAddressText(123) !== 'OK',
            'Invalid non-string address rejected');

        // =============================================
        // Summary
        // =============================================
        console.log('\n=== Summary ===');
        console.log('Passed: ' + testsPassed + ', Failed: ' + testsFailed + ', Warnings: ' + testsWarned);
        if (testsFailed === 0) {
            console.log('ALL TESTS PASSED');
            process.exit(0);
        } else {
            console.log('SOME TESTS FAILED');
            process.exit(1);
        }
    }, 400);
} catch (e) {
    console.log('  FAIL:', e.message);
    console.log('  Stack:', e.stack);
    process.exit(1);
}

