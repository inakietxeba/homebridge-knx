'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const address = require('knx/src/Address');
const protocol = require('knx/src/KnxProtocol');

test('knx resolves the patched binary-parser dependency', () => {
    const knxRequire = createRequire(require.resolve('knx'));
    assert.equal(knxRequire('binary-parser/package.json').version, '2.3.0');
});

test('patched parser preserves physical and two/three-level group addresses', () => {
    const cases = [
        ['0.0.0', address.TYPE.PHYSICAL, false, '0000'],
        ['1.2.3', address.TYPE.PHYSICAL, false, '1203'],
        ['15.15.255', address.TYPE.PHYSICAL, false, 'ffff'],
        ['0/0/0', address.TYPE.GROUP, false, '0000'],
        ['1/2/3', address.TYPE.GROUP, false, '0a03'],
        ['31/7/255', address.TYPE.GROUP, false, 'ffff'],
        ['0/0', address.TYPE.GROUP, true, '0000'],
        ['1/257', address.TYPE.GROUP, true, '0901'],
        ['31/2047', address.TYPE.GROUP, true, 'ffff']
    ];
    for (const [text, type, twoLevel, hex] of cases) {
        const bytes = Buffer.from(hex, 'hex');
        assert.equal(address.toString(bytes, type, twoLevel), text);
        assert.deepEqual(address.parse(text, type, twoLevel), bytes);
    }
});

test('patched parser decodes and re-encodes KNX/IP routing telegrams', () => {
    const cases = [
        ['0610053000112900bce011011203010000', 'GroupValue_Read', [0]],
        ['0610053000112900bce011011203010041', 'GroupValue_Response', [1]],
        ['0610053000112900bce011011203010080', 'GroupValue_Write', [0]],
        ['0610053000112900bce011011203010081', 'GroupValue_Write', [1]],
        ['0610053000122900bce01101120302008064', 'GroupValue_Write', [100]],
        ['0610053000132900bce0110112030300800c1a', 'GroupValue_Write', [12, 26]]
    ];
    for (const [hex, apci, data] of cases) {
        const bytes = Buffer.from(hex, 'hex');
        const reader = protocol.createReader(bytes);
        reader.KNXNetHeader('packet');
        const packet = reader.next().packet;
        assert.equal(packet.service_type, 0x0530);
        assert.equal(packet.total_length, bytes.length);
        assert.equal(packet.cemi.src_addr, '1.1.1');
        assert.equal(packet.cemi.dest_addr, '2/2/3');
        assert.equal(packet.cemi.ctrl.destAddrType, 1);
        assert.equal(packet.cemi.ctrl.hopCount, 6);
        assert.equal(packet.cemi.apdu.apci, apci);
        assert.deepEqual(packet.cemi.apdu.data, Buffer.from(data));
        assert.deepEqual(protocol.createWriter().KNXNetHeader(packet).buffer, bytes);
    }
});
