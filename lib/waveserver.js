//Connect to Earthworm waveserver to retrieve traceBuf2 packages for a given SCNL and time window

var net = require('net');
const BufferList = require('bl');
var TraceBuf2 = require(__dirname + '/traceBuf2');
var getScnlRawHeader = require(__dirname + '/getScnlRawHeader');
var EventEmitter = require('events').EventEmitter;



function Waveserver(host, port,scnl,start,end){
  this.host= host;
  this.port= port;
  this.scnl = scnl;
  this.start= start;
  this.end = end;
  this.bufferList  = new BufferList();
  this.rawResponse;
  this.socket;
  this.requestedBytes;
  EventEmitter.call(this);
}

Waveserver.prototype = Object.create(EventEmitter.prototype);

Waveserver.prototype.requestStr = function(){
  return "GETSCNLRAW: getRaw " + this.scnl.sta + " " + this.scnl.chan + " " + this.scnl.net + " " + this.scnl.loc  + " " + this.start + " " + this.end +  " \n";
};

Waveserver.prototype.returnFlagKey= function(){
    return {
        'F':'success',
        'FR':'requested data right (later) than tank contents',
        'FL':'requested data left (earlier) than tank contents',
        'FG':'requested data lie in tank gap',
        'FB':'syntax error in request',
        'FC':'data tank corrupt',
        'FN':'requested tank not found',
        'FU':'unknown error',
        '--':'unknown Winston error'
        };
  };
  

  

Waveserver.prototype.connect = function(){
  //connect to socket
  var _this = this;
  var client = new net.Socket();
  // var _bufferList = this.bufferList;  
  _this.socket  = client.connect(_this.port, _this.host, function() {
  client.write(_this.requestStr());
  });


  // listen for incoming data
  _this.socket.on("data", function(data){    
    if(!_this.rawResponse){ //getSnclRaw Header
        _this.requestedBytes =0;
        var  responseString = String.fromCharCode.apply(null, data);
        var index = responseString.indexOf("\n");
        responseString = responseString.slice(0, index);
        data = data.slice(index + 1, data.length);
        _this.rawResponse = new getScnlRawHeader(responseString.split(" "));
        console.log(responseString);
        _this.emit("header", _this.rawResponse);
    }
    if(data.length > 0){
      _this.bufferList.append(data);
      _this.makeTraceBuf2();  
    }
  });

  _this.socket.on('close', function() {
    console.log("Have a nice day!");
    _this.emit("close");
  });


  _this.socket.on('error', function(err) {
    console.log("You got an error brah: " + err);
    _this.emit("error", err);
  });
  
  
};

Waveserver.prototype.makeTraceBuf2 = function(){
    //there needs to be at least enough for header
    while(this.bufferList.length >= 64){      
      var tb = new TraceBuf2(this.bufferList, this.rawResponse.datatype);
      var traceBufSize = tb.nsamp * tb.intByteLength() + 64;
      if(this.bufferList.length >= traceBufSize){
        this.emit('data', tb.webiwormObj());
        this.bufferList.consume(traceBufSize);
        this.requestedBytes += traceBufSize;
      }else{
        break;
      }
    
  }
  //close connection when all bytes have been received
   if(this.requestedBytes >= this.rawResponse.numBytes){
     this.socket.end();
   }
  
};

Waveserver.prototype.disconnect = function(){
  console.log("disconnecting...");
  this.socket.end();
};

module.exports = Waveserver;