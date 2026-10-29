'use strict';

// A prepare step makes npm install dependencies before packing Git installs.
// The bundle must contain the patched parser, even when our overrides are
// ignored by the consuming Homebridge installation.
const { createRequire } = require('node:module');
const knxRequire = createRequire(require.resolve('knx'));
const { version } = knxRequire('binary-parser/package.json');
if (version !== '2.3.0') {
    throw new Error('Expected patched binary-parser 2.3.0 for KNX, got ' + version);
}
