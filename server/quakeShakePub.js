//Connect to Earthworm waveserver to retrieve traceBuf2 packages for a given SCNL and time window 
//use redis sub/pub design to broadcast to listening node app(s)
//call with following format 
//node quakeShakePub.js server=host port=port sta=RCM chan=EHZ net=UW
//or
//node server/quakeShakePub.js server=import02.ess.washington.edu  port=16022 sta=HWK1 chan=HNZ net=UW

//ALL EPOCH TIMES ARE MILLISECONDS!!!!

// var net = require('net');
var Waveserver = require(__dirname + '/../lib/waveserver');
var redis = require('redis');

//ARGS 

var ARGS={};
process.argv.forEach(function(val, index, array) {

  if(val.match(/=.*/i)){
    var keyVal = val.split("=");
    ARGS[keyVal[0]] = keyVal[1];
  }
});


var HOST = ARGS['server'];
var PORT = ARGS['port'];
var scnl={
  'sta':  ARGS['sta'].toUpperCase(),
  'chan': ARGS['chan'].toUpperCase(),
  'net' : ARGS['net'].toUpperCase(),
  'loc' : (ARGS['loc'] == null ? "--" : ARGS['loc'].toUpperCase())// : "--")
};

//run this as a realtime daemon or as a discreet chunk 
if(ARGS['start'] && ARGS['end']){
  var daemon =false;
}else{
  var daemon = true;
  var end = Date.now();
  var start = end  -1;
}
var lastBufStart = start;
var responseHeader;
var pub = redis.createClient();
pub.publish(redisKey, "are you ready for this");
//use scnl to create redis key worm:sta:chan:net:loc:start
//FIXME: this is temp for testing
// var redisKey = "wave";
var redisKey = "worm:" + scnl['sta'] + ":" + scnl['chan'] + ":" + scnl['net'] + ":" + scnl['loc'];
pub.publish(redisKey, "hello love");
console.log("To subscribe to this channel start quakeShakeSub with:");
console.log("node server/quakeShakeSub channel=" + redisKey + " port=n");


//Times in seconds
var lastTime = Date.now();
function getData(start, end){
  //create connection then attach listeners 
  // header: fires when getscnlraw header is processed
  //data: fires when data is buffered
  //close fires on waverserver close
  
  var ws = new Waveserver(HOST, PORT, scnl, start, end);
  ws.connect();
  //parse getScnlRaw flag and decide whether to disconnect or continue
  ws.on('header', function(header){
    responseHeader = header;
    if (header.flag ==="FR" && daemon){ //most common error missed by current data not in ws yet
      ws.disconnect();
    }else if(header.flag === 'FB'){
      console.log("there has been a terrible error of some sort or other.");
      ws.disconnect();
    }
  
  });
  ///TEMP!!!!
  
  ws.on('data', function(message){
    if(message.starttime > lastBufStart){
      lastBufStart = message.starttime;
      pub.publish(redisKey, JSON.stringify(message));
      console.log("packet length " + message.data.length);
      console.log("elapsed time = " + (message.endtime - message.starttime));
      console.log("time between packets = "+ (message.starttime- lastTime));
      lastTime = message.endtime;
    }
  
  });

  ws.on('error', function(error){
    // console.log("on the client error: ");// + error);
  });
  
  //called when all data are processed or socket timesout
  //keep going when running as daemon
  
  ws.on("close", function(){
    setTimeout(function(){
      getData(lastBufStart, Date.now());
    }, 500);
  });

}

//the first call
getData(start,end);

