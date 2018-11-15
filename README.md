# lasparser
LAS File parser based upon itowns old code.  Uses plain javascript.

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
