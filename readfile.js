const readline = require('readline')
const iconv = require('iconv-lite')
const fs = require('fs')
const os = require('os')
const board = []
var res=fs.createReadStream('./2018061410.saw');

var chunks=[];
var size=0;
res.on('data',function(chunk){
    chunks.push(chunk);
    size+=chunk.length;
});
res.on('end',function(){
    var buf=Buffer.concat(chunks,size);
    var str=iconv.decode(buf, 'gbk');
    let tt = str.split('\r\n').filter(__ => {
      return __.match(/^MAT2.*$/)
    })
    console.log(tt)
    // console.log(str);
});
const buffer = require('buffer')

let fRead = fs.createReadStream('./2018061410.saw')

let objReadline = readline.createInterface({
    input: fRead
});
let i = 1
objReadline.on('line', (line)=>{
    if (line.match(/^MAT2.*$/)) {
      // buf = new Buffer(line, 'gbk');
      buf = new Buffer(1024);
      buf.write(line);
      var str=iconv.decode(buf, 'gbk');
      // let str = buf.toString('UTF8');
      // var result = encoding.convert(line, "UTF8", "GBK");
      // console.log(str)
    }
});
