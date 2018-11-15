# lasparser
LAS File parser based upon itowns old code.  Uses plain javascript.
This library is adopted from:  https://github.com/iTowns/itowns-legacy/blob/ea94e8ed246d3bc5b567cfdb50e2151ba58cc7d3/src/LasReader.js

The library supports las version 1.0-1.10.  Although, it is currently not recognizing the number of points for version 1.4 which will be fixed shortly.

The sample usage below requires laszip to be installed from lastools (https://rapidlasso.com/lastools/)
```
var fname = 'USGS_LPC_CA_LosAngeles_2016_L4_6477_1857c_LAS_2018.laz',
  { exec } = require('child_process');

var lasreader = require('./lasreader');
exec('laszip -i ' + fname + ' -stdout', {maxBuffer: 1024 * 5000000, encoding: 'buffer'}, handle);
function handle(err, stdout, stderr){
  var lasobj = lasreader(stdout),
    p = 0, len = lasobj.header.numberOfPointRecords,
    laspoint;
  for (; p < len; p++) {
    lasPoint = lasobj.getPointData(p);
  }
}
```
