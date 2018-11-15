//var DataView = require('fast-dataview');


function lasreader(buff) {
  if (!(this instanceof lasreader)) return new lasreader(buff);
  this.buff = buff;
  this.header = this.loadHeaderFromFile();
}
/**
 * read the las header from the binary datas and populate the good header properties according to the las revision number
 * @returns {Number} the offset in bytes from the start of the binary stream after reading the header.
 */
lasreader.prototype.loadHeaderFromFile = function() {
  /* -------------- let's go ----------------- */
  var offset = this.getHeaderRoot();

  if (this.header.versionMajor === 1) {
    switch (this.header.versionMinor) {
      case 0:
        offset = this.getHeaderRevision1_0(offset);
        break;
      case 1:
        offset = this.getHeaderRevision1_1(offset);
        break;
      case 2:
        offset = this.getHeaderRevision1_2(offset);
        break;
      case 3:
        offset = this.getHeaderRevision1_3(offset);
        break;
      case 4:
        offset = this.getHeaderRevision1_4(offset);
        break;
      default:
        console.log('unsupported version ' + this.header.versionMinor);
        break;
    }
  }
  return this.header;
}
lasreader.prototype.getHeaderRoot = function() {
  var dv = new DataView(this.buff, 0, 90);
  this.header = {};
  this.header.sourceId = dv.getUint16(4);
  this.header.globalEncoding = dv.getUint16(6); //2
  this.header.id_guid_data1 = dv.getUint32(8), //4
    this.header.id_guid_data2 = dv.getUint16(12), //2
    this.header.id_guid_data3 = dv.getUint16(14), //2
    //header.id_guid_data4  : dv.getUint32(16), //8
    this.header.versionMajor = dv.getUint8(24), //1
    this.header.versionMinor = dv.getUint8(25), //1
    this.header.systemId = ""; //32
  this.header.generatingSoftware = ""; //32
  return 90;
};
lasreader.prototype.getHeaderDateRevision_1_0 = function(offset) {
  var dv = new DataView(this.buff, offset, 4);
  this.header.flightDateJulian = dv.getUint16(0, true); //2
  this.header.year = dv.getUint16(2, true); //2
  return offset + 4;
};
lasreader.prototype.getHeaderDateRevision_1_1to4 = function(offset) {
  var dv2 = new DataView(this.buff, offset, 4);
  this.header.fileCreationDayOfYear = dv2.getUint16(0, true); //2
  this.header.fileCreationYear = dv2.getUint16(2, true); //2
  return offset + 4;
};
lasreader.prototype.getBasicPointDataInfo = function(offset) {
  var dv = new DataView(this.buff, offset, 13);
  this.header.headerSize = dv.getUint16(0, true); //2
  this.header.offsetToPointData = dv.getUint32(2, true); //4
  this.header.numberOfVLR = dv.getUint32(6, true); //4
  this.header.pointDataRecordFormat = dv.getUint8(10, true); //1
  this.header.pointDataRecordLength = dv.getUint16(11, true); //2
  return offset + 13;
};

lasreader.prototype.getLegacyPointNumbers = function(offset, old) {
  var dv = new DataView(this.buff, offset, 24);
  var numpoint = dv.getUint32(0, true); //4
  var numpointReturn = [];
  var loffset = 4;
  for (var i = 0; i < 5; i++) {
    numpointReturn.push(dv.getUint32(loffset, true)); //4
    loffset += 4;
  }
  if (old) {
    this.header.numberOfPointRecords = numpoint;
    this.header.numberOfPointsByReturn = numpointReturn;
  } else {
    this.header.legacyNumberOfPointRecords = numpoint;
    this.header.legacyNumberOfPointsByReturn = numpointReturn;
  }
  return offset + loffset;
}

lasreader.prototype.getBBoxInformations = function(offset) {
  var dv = new DataView(this.buff, offset, 96);

  this.header.XScaleFactor = dv.getFloat64(0, true); //8
  this.header.YScaleFactor = dv.getFloat64(8, true); //8
  this.header.ZScaleFactor = dv.getFloat64(16, true); //8
  this.header.XOffset = dv.getFloat64(24, true); //8
  this.header.YOffset = dv.getFloat64(32, true); //8
  this.header.ZOffset = dv.getFloat64(40, true); //8
  this.header.maxX = dv.getFloat64(48, true); //8
  this.header.minX = dv.getFloat64(56, true); //8
  this.header.maxY = dv.getFloat64(64, true); //8
  this.header.minY = dv.getFloat64(72, true); //8
  this.header.maxZ = dv.getFloat64(80, true); //8
  this.header.minZ = dv.getFloat64(88, true); //8
  return offset + 96;
};

/**
 * load the waveform data part of the header starting at the provided offset
 * @param {number} offset the offset in bytes the reader will start at
 * @return {number} the new position of the reading head.
 */
lasreader.prototype.getHeaderWaveFormData = function(offset) {
  var dv = new DataView(this.buff, offset, 4 + (15 * 8));
  this.header.startOfEVLR = dv.getUint32(offset + 8, true); //4
  this.header.numberOfPointByRecord = [];
  var loffset = 4;
  for (var i = 0; i < 15; i++) {
    this.header.numberOfPointByRecord.push(dv.getUint32(loffset, true) * Math.pow(2, 32) + dv.getUint32(loffset + 4, true)); //8
    loffset += 8;
  };
  return offset + loffset;
};

// -------------- start building up things together ------------------
lasreader.prototype.getHeaderRevion1_0 = function(offset) {
  offset = this.getHeaderDateRevision_1_0(offset);
  offset = this.getBasicPointDataInfo(offset);
  offset = this.getLegacyPointNumbers(offset);
  offset = this.getBBoxInformations(offset);
  return offset;
};

lasreader.prototype.getHeaderRevision1_1 = function(offset) {
  offset = this.getHeaderDateRevision_1_1to4(offset); //different from 1.0
  offset = this.getBasicPointDataInfo(offset);
  offset = this.getLegacyPointNumbers(offset, true);
  offset = this.getBBoxInformations(offset);
  return offset;
};


lasreader.prototype.getHeaderRevision1_2 = function(offset) {
  offset = this.getHeaderRevision1_1(offset);
};

lasreader.prototype.getHeaderRevision1_3 = function(offset) {
  offset = this.getHeaderRevision1_2(offset);
  var dv = new DataView(this.buff, offset, 8);
  this.header.startOfWaveFormDataPacketRecord = dv.getUint32(offset, true) * Math.pow(2, 32) + dv.getUint32(offset + 4, true); //8
  return offset + 8;
};
lasreader.prototype.getHeaderRevision1_4 = function(offset) {
  offset = this.getHeaderDateRevision_1_1to4(offset); //different from 1.0
  offset = this.getBasicPointDataInfo(offset);
  offset = this.getLegacyPointNumbers(offset, false);
  offset = this.getBBoxInformations(offset);
  var dv = new DataView(this.buff, offset, 8);
  this.header.startOfWaveFormDataPacketRecord = dv.getUint32(offset, true) * Math.pow(2, 32) + dv.getUint32(offset + 4, true);
  offset += 8;
  offset = this.getHeaderWaveFormData(offset);
  return offset;
};

lasreader.prototype.getRawPointData = function(pointNumber) {
  var pointPosition = this.header.offsetToPointData + (pointNumber * this.header.pointDataRecordLength);
  var pointData = {}
  pointData.X = pointPosition;
  pointData.Y = pointPosition + 4;
  pointData.Z = pointPosition + 8;
  pointData.intensity = pointPosition + 12;
  return pointData;
};
lasreader.prototype.getPointData = function(pointNumber) {
  return laspoint(this.buff, this.header, pointNumber);
}
/**
 * get the datas associated with the point number
 * @param {number} pointNumber id of the point to be retrieved.
 * @returns {object} an object containing the datas for this point.
 */
laspoint = function(buff, header, pointNumber) {
  if (!(this instanceof laspoint)) return new laspoint(buff, header, pointNumber);
  this.buff = buff;
  this.header = header;
  var pointPosition = this.header.offsetToPointData + (pointNumber * this.header.pointDataRecordLength);
  this.pdv = new DataView(this.buff, pointPosition, this.header.pointDataRecordLength)
  this.pointData = {};
  this.pointDataFormat = {
    0: this.getDataForPointFormat0.bind(this),
    1: this.getDataForPointFormat1.bind(this),
    2: this.getDataForPointFormat2.bind(this),
    3: this.getDataForPointFormat3.bind(this),
    4: this.getDataForPointFormat4.bind(this),
    5: this.getDataForPointFormat5.bind(this),
    6: this.getDataForPointFormat6.bind(this),
    7: this.getDataForPointFormat7.bind(this),
    8: this.getDataForPointFormat8.bind(this),
    9: this.getDataForPointFormat9.bind(this),
    10: this.getDataForPointFormat10.bind(this),
  }
  this.ppos = {
    b1: 1, //00000001
    b2: 2, //00000010
    b3: 4, //00000100
    b4: 8, //00001000
    b5: 16, //00010000
    b6: 32, //00100000
    b7: 64, //01000000
    b8: 128, //10000000
  }
  this.pointDataFormat[this.header.pointDataRecordFormat]();
  return this.pointData;
}

laspoint.prototype.getDataForPointFormat0 = function() {
  this.pointData.X = this.pdv.getInt32(0, true); // 4
  this.pointData.Y = this.pdv.getInt32(4, true); // 4
  this.pointData.Z = this.pdv.getInt32(8, true); // 4
  this.pointData.intensity = this.pdv.getUint16(12, true); // 2 -- to be normalized to 65535 before use
  var packedBit = this.pdv.getUint8(14, true); // 1
  this.pointData.returnNumber = packedBit & (this.ppos.b1 | this.ppos.b2 | this.ppos.b3); //3bits
  this.pointData.numberOfReturns = packedBit >> 3 & (this.ppos.b1 | this.ppos.b2 | this.ppos.b3) // 3bits
  this.pointData.scanDirectionFlag = packedBit >> 6 & (this.ppos.b1); // 1 bit
  this.pointData.edgeOfFlightLine = packedBit >> 7 & (this.ppos.b1); //1 bit
  this.pointData.classification = this.pdv.getUint8(15, true); //1
  this.pointData.scanAngleRank = this.pdv.getInt8(16, true); //1
  this.pointData.userData = this.pdv.getUint8(17, true); //1
  this.pointData.pointSourceID = this.pdv.getUint16(18, true); //2
  return 20;
}
laspoint.prototype.getDataForPointFormat1 = function() {
  var offset = this.getDataForPointFormat0()
  this.pointData.gpsTime = this.pdv.getFloat64(offset, true); //8
  return offset + 8;
}

laspoint.prototype.getRVB = function(offset) {
  this.pointData.red = this.pdv.getUint16(offset, true); //2
  this.pointData.green = this.pdv.getUint16(offset + 2, true); //2
  this.pointData.blue = this.pdv.getUint16(offset + 4, true); //2
  return offset + 6;
}

laspoint.prototype.getDataForPointFormat2 = function() {
  var offset = this.getDataForPointFormat0();
  offset = this.getRVB(offset);
  return offset;
}
laspoint.prototype.getDataForPointFormat3 = function() {
  var offset = this.getDataForPointFormat0();
  this.pointData.gpsTime = this.pdv.getFloat64(offset, true); //8
  offset = getRVB(offset + 8);
  return offset;
}

laspoint.prototype.getWaveFormPacketData = function(offset) {
  this.pointData.wavePacketDescriptorIdx = this.pdv.getInt8(offset, true); //1
  this.pointData.byteOffsetToWaveFormData1 = this.pdv.getUint32(offset + 1, true); //4 Achtung this is an int64 !
  this.pointData.byteOffsetToWaveFormData2 = this.pdv.getUint32(offset + 5, true); //4 not provided in dataview
  this.pointData.waveFormPacketSizeInBytes = this.pdv.getUint32(offset + 9, true); //4
  this.pointData.returnPointWaveformLocation = this.pdv.getFloat32(offset + 13, true); //4
  this.pointData.Xt = this.pdv.getFloat32(offset + 17, true); //4
  this.pointData.Yt = this.pdv.getFloat32(offset + 21, true); //4
  this.pointData.Zt = this.pdv.getFloat32(offset + 25, true); //4
  return offset + 29;
}
laspoint.prototype.getDataForPointFormat4 = function() {
  var offset = this.getDataForPointFormat1();
  offset = this.getWaveFormPacketData(offset);
  return offset;
}

laspoint.prototype.getDataForPointFormat5 = function() {
  var offset = this.getDataForPointFormat3();
  offset = this.getWaveFormPacketData(offset);
  return offset;
}

laspoint.prototype.getDataForPointFormat6 = function() {
  this.pointData.X = this.pdv.getInt32(0, true); // 4
  this.pointData.Y = this.pdv.getInt32(4, true); // 4
  this.pointData.Z = this.pdv.getInt32(8, true); // 4
  this.pointData.intensity = this.pdv.getUint16(12, true); // 2 -- to be normalized to 65535 before use
  var packedBit1 = this.pdv.getUint8(14, true); // 1
  this.pointData.returnNumber = packedBit1 & (this.ppos.b1 | this.ppos.b2 | this.ppos.b3 | this.ppos.b4); //4bits <!--
  this.pointData.numberOfReturns = packedBit1 >> 4 & (this.ppos.b1 | this.ppos.b2 | this.ppos.b3 | this.ppos.b4) //4bits <!--
  var packedBit2 = this.pdv.getUint8(15, true); // 1 <!--
  this.pointData.classificationFlags = packedBit2 & (this.ppos.b1 | this.ppos.b2 | this.ppos.b3 | this.ppos.b4); //4bits <!--
  this.pointData.scannerChannel = packedBit2 >> 4 & (this.ppos.b1 | this.ppos.b2); //2bits <!--
  this.pointData.scanDirectionFlag = packedBit2 >> 6 & (this.ppos.b1); // 1 bit
  this.pointData.edgeOfFlightLine = packedBit2 >> 7 & (this.ppos.b1); //1 bit
  this.pointData.classification = this.pdv.getUint8(16, true); //1
  this.pointData.userData = this.pdv.getUint8(17, true); //1
  this.pointData.scanAngleRank = this.pdv.getInt16(18, true); //2 <!--
  this.pointData.pointSourceID = this.pdv.getUint16(20, true); //2
  this.pointData.gpsTime = this.pdv.getFloat64(22, true); //8
  return 30;
}

laspoint.prototype.getDataForPointFormat7 = function() {
  var offset = this.getDataForPointFormat6();
  offset = this.getRVB(offset);
  return offset;
}
laspoint.prototype.getDataForPointFormat8 = function() {
  var offset = this.getDataForPointFormat7();
  this.pointData.nir = this.pdv.getUint16(offset, true); //2
  return offset + 2;
}
laspoint.prototype.getDataForPointFormat9 = function() {
  var offset = this.getDataForPointFormat6();
  offset = this.getWaveFormPacketData(offset);
  return offset;
}
laspoint.prototype.getDataForPointFormat10 = function() {
  var offset = this.getDataForPointFormat8();
  offset = this.getWaveFormPacketData(offset);
  return offset;
}
var cacheBuffer = new ArrayBuffer(8);
var uint8Array = new Uint8Array(cacheBuffer);
var int8Array = new Int8Array(cacheBuffer);
var uint16Array = new Uint16Array(cacheBuffer);
var int16Array = new Int16Array(cacheBuffer);
var uint32Array = new Uint32Array(cacheBuffer);
var int32Array = new Int32Array(cacheBuffer);
var float32Array = new Float32Array(cacheBuffer);
var float64Array = new Float64Array(cacheBuffer);

function DataView(buff, offset, count) {
  this.buff = buff;
  this.offset = offset;
  this.count = count;

  this.uint8Array = uint8Array;
  this.int8Array = int8Array;
  this.int16Array = int16Array;
  this.int32Array = int32Array;
  this.float32Array = float32Array;
  this.float64Array = float64Array;
}
DataView.prototype.getInt8 = function(offset) {
  // Use TypedArray
  this.uint8Array[0] = this.buff[offset + this.offset];
  return this.int8Array[0];
};
DataView.prototype.getInt16 = function(offset, lendian) {
  // Use TypedArray
  offset += this.offset;
  if (lendian) {
    this.uint8Array[0] = this.buff[offset + 0];
    this.uint8Array[1] = this.buff[offset + 1];
  } else {
    this.uint8Array[0] = this.buff[offset + 1];
    this.uint8Array[1] = this.buff[offset + 0];
  }
  return this.int16Array[0];
};
DataView.prototype.getInt32 = function(offset, lendian) {
  // Use TypedArray
  offset += this.offset;
  if (lendian) {
    this.uint8Array[0] = this.buff[offset + 0];
    this.uint8Array[1] = this.buff[offset + 1];
    this.uint8Array[2] = this.buff[offset + 2];
    this.uint8Array[3] = this.buff[offset + 3];
  } else {
    this.uint8Array[0] = this.buff[offset + 3];
    this.uint8Array[1] = this.buff[offset + 2];
    this.uint8Array[2] = this.buff[offset + 1];
    this.uint8Array[3] = this.buff[offset + 0];
  }
  return this.int32Array[0];
};

DataView.prototype.getUint8 = function(offset, lendian) {
  return this.buff[offset + this.offset]
}
DataView.prototype.getUint16 = function(offset, lendian) {
  offset += this.offset;
  if (lendian) {
    return (this.buff[offset + 1] << 8) | this.buff[offset + 0];
  } else {
    return (this.buff[offset + 0] << 8) | this.buff[offset + 1];
  }
}
DataView.prototype.getUint32 = function(offset, lendian) {
  if (lendian) {
    return ((this.buff[offset + 3] << 24) >>> 0) + ((this.buff[offset + 2] << 16) | (this.buff[offset + 1] << 8) | this.buff[offset + 0]);
  } else {
    return ((this.buff[offset + 0] << 24) >>> 0) + ((this.buff[offset + 1] << 16) | (this.buff[offset + 2] << 8) | this.buff[offset + 3]);
  }
}
DataView.prototype.getFloat32 = function(offset, lendian) {
  // Use TypedArray
  offset += this.offset;
  if (lendian) {
    this.uint8Array[0] = this.buff[offset + 0];
    this.uint8Array[1] = this.buff[offset + 1];
    this.uint8Array[2] = this.buff[offset + 2];
    this.uint8Array[3] = this.buff[offset + 3];
  } else {
    this.uint8Array[0] = this.buff[offset + 3];
    this.uint8Array[1] = this.buff[offset + 2];
    this.uint8Array[2] = this.buff[offset + 1];
    this.uint8Array[3] = this.buff[offset + 0];
  }
  return this.float32Array[0];
};
DataView.prototype.getFloat64 = function(offset, lendian) {
  offset += this.byteOffset;
  // Use TypedArray
  if (lendian) {
    this.uint8Array[0] = this.buff[offset + 0];
    this.uint8Array[1] = this.buff[offset + 1];
    this.uint8Array[2] = this.buff[offset + 2];
    this.uint8Array[3] = this.buff[offset + 3];
    this.uint8Array[4] = this.buff[offset + 4];
    this.uint8Array[5] = this.buff[offset + 5];
    this.uint8Array[6] = this.buff[offset + 6];
    this.uint8Array[7] = this.buff[offset + 7];
  } else {
    this.uint8Array[0] = this.buff[offset + 7];
    this.uint8Array[1] = this.buff[offset + 6];
    this.uint8Array[2] = this.buff[offset + 5];
    this.uint8Array[3] = this.buff[offset + 4];
    this.uint8Array[4] = this.buff[offset + 3];
    this.uint8Array[5] = this.buff[offset + 2];
    this.uint8Array[6] = this.buff[offset + 1];
    this.uint8Array[7] = this.buff[offset + 0];
  }
  return this.float64Array[0];
};



if (typeof module !== "undefined" && ('exports' in module)) {
  module.exports = lasreader;
} else window.lasreader = lasreader
