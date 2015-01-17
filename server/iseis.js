//server.js
var PORT = 10552;

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

//As soon as the server is ready to receive messages, handle it with this handler
server.on('listening', function () {
  var address = server.address();
  console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

var newPacket =true;
//When getting a message, handle it like so:
server.on('message', function (buf, remote) {
  //lets make packets
  var arr = buf.toString('utf-8', 0, buf.length -1 ).split(",");
  var t = arr[1];
  if(newPacket){
    var starttime=arr[1]
    var xbuf=[];
    var ybuf=[];
    var zbuf=[];
  }else{
    xbuf.push(arr[2]);
    ybuf.push(arr[3]);
    zbuf.push(var[4]);
    // console.log("t: " + t + ", x: " + x + ", y: " + y + ", z: " + z);
  //make 1 second packets
  if(t - starttime > 1000){
    
  }

});

server.bind(PORT);


function quakeShakeObj(starttime, endtime, samp, chan, data){
    'starttime':  Math.round(startti),
    'endtime':    Math.round(this.endtime*1000),
    'samprate':   parseInt((this.endtime - this.starttime)/data.length,0); 
    'sta':        "iphone"
    'chan':       chan,
    'net':        "UW",
    'loc':        "--",
    'data':       data
  };
};


