'use strict';

// Adapted from upstream's smoke tests, using the real Homebridge 2.x HAP library.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const hap = require('@homebridge/hap-nodejs');
const CharacteristicKNX = require('../lib/characteristic-knx');

test('plugin registers and its custom characteristic works with real HAP', (t) => {
    const storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'homebridge-knx-hap-'));
    t.after(() => fs.rmSync(storagePath, { recursive: true, force: true }));
    const registered = [];
    require('../index.js')({
        version: 2.7,
        hap,
        user: { storagePath: () => storagePath },
        registerPlatform: (...args) => registered.push(args),
        on: () => {}
    });
    assert.equal(registered.length, 1);
    assert.equal(registered[0][0], 'homebridge-knx');
    assert.equal(registered[0][1], 'KNX');
    assert.equal(typeof registered[0][2], 'function');
    assert.equal(registered[0][3], true);

    const chr = new hap.Characteristic.KNXThermAtHome();
    assert.ok(chr instanceof hap.Characteristic);
    assert.equal(chr.UUID, '00001025-0000-1000-8000-0026BB765292');
    assert.equal(chr.props.format, hap.Formats.BOOL);
    assert.deepEqual([...chr.props.perms].sort(),
        [hap.Perms.PAIRED_READ, hap.Perms.PAIRED_WRITE, hap.Perms.NOTIFY].sort());
});

test('DPT inference uses actual HAP formats and percentage units', () => {
    function getDPT(chr, config = {}) {
        return CharacteristicKNX.prototype.getDPT.call({
            chr, config, globs: { Formats: hap.Formats, Units: hap.Units }
        });
    }

    assert.equal(getDPT(new hap.Characteristic.On()), 'DPT1');
    assert.equal(getDPT(new hap.Characteristic.CurrentHeatingCoolingState()), 'DPT5');
    assert.equal(getDPT(new hap.Characteristic.CurrentTemperature()), 'DPT9');
    assert.equal(getDPT(new hap.Characteristic.Brightness()), 'DPT5.001');
    assert.equal(getDPT(new hap.Characteristic.CurrentRelativeHumidity()), 'DPT5.001');
    assert.equal(getDPT(new hap.Characteristic.Name()), undefined);
    assert.equal(getDPT({ props: {} }), undefined);
    assert.equal(getDPT(new hap.Characteristic.Brightness(), { DPT: 'DPT5' }), 'DPT5');
});

test('new device resolves HKCategory using real HAP categories and services', () => {
    const KNXDevice = require('../lib/knxdevice');
    const registered = [];
    // Homebridge wraps a HAP Accessory; adapt only that wrapper's constructor.
    class PlatformAccessory extends hap.Accessory {
        constructor(name, uuid, category) {
            super(name, uuid);
            this.category = category;
        }
    }
    const uuid = hap.uuid.generate('homebridge-knx-hap-category-test');
    const device = new KNXDevice({
        API: {
            hap,
            platformAccessory: PlatformAccessory,
            registerPlatformAccessories: (...args) => registered.push(args)
        },
        Service: hap.Service,
        Characteristic: hap.Characteristic,
        debug: () => {}, info: () => {}, log: () => {}, errorlog: () => {}
    }, { DeviceName: 'HAP category test', UUID: uuid, HKCategory: 'SENSOR', Services: [] });
    const accessory = device.getPlatformAccessory();
    assert.equal(accessory.category, hap.Categories.SENSOR);
    assert.equal(accessory.UUID, uuid);
    assert.ok(accessory.getService(hap.Service.AccessoryInformation));
    assert.equal(registered.length, 1);
    assert.equal(registered[0][2][0], accessory);
});
