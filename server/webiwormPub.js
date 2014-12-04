//Connect to Earthworm waveserver to retrieve traceBuf2 packages for a given SCNL and time window 
//use redis sub/pub design to broadcast to listening node app(s)
//call with following format 
//node webiwormPub.js server=128.95.16.15 port=16017 sta=RCM chan=EHZ net=UW
var net = require('net');
var Waveserver = require(__dirname + '/lib/waveserver');
var redis = require('redis');

//ARGS 

var ARGS={};
process.argv.forEach(function(val, index, array) {

  if(val.match(/=.*/i)){
    var keyVal = val.split("=");
    ARGS[keyVal[0]] = keyVal[1];
  }
});

//wave server
// var HOST = '128.95.16.15';
// var PORT = 16017; 

var HOST = ARGS['server'];
var PORT = ARGS['port'];
var scnl={
  'sta':  ARGS['sta'].toUpperCase(),
  'chan': ARGS['chan'].toUpperCase(),
  'net' : ARGS['net'].toUpperCase(),
  'loc' : ARGS['loc'] ? ARGS['LOC'].toUpperCase() : "--"
};

//run this as a realtime daemon or as a discreet chunk 
if(ARGS['start'] && ARGS['end']){
  var daemon =false;
}else{
  var daemon = true;
  var end = Date.now()/1000 -600;
  var start = end  -15;
}
var lastBufStart = start;
var responseHeader;
var pub = redis.createClient();

//use scnl to create redis key worm:sta:chan:net:loc:start
//FIXME: this is temp for testing
var redisKey = "wave";
// var redisKey = "worm:" + ARGS['sta'] + ":" + ARGS['chan'] + ":" + ARGS['net'] + ":" + ARGS['loc'];
pub.publish('wave', "testing");


//call recursively 
function getData(start, end){
  var ws = new Waveserver(HOST, PORT, scnl, start, end);
  ws.connect();
  //parse getScnlRaw header to decide what to do next
  ws.on('header', function(header){
    responseHeader = header;    
    console.log("start = " + start + " end = " + end);
    console.log("end - start= " + (end - start));
    console.log(header.flag);    
    if (header.flag ==="FR" && daemon){ //most common error missed by current data not in ws yet
      ws.disconnect();
    }else if(header.flag === 'FB'){
      console.log("there has been a terrible error of some sort or other. ");
      ws.disconnect();
    }else{
      console.log("Return flag: " + ws.returnFlagKey()[header.flag]);
    }
    

  
  });

  ws.on('data', function(message){
    // console.log(lastBufStart);
    // console.log(message.starttime);
    if(message.starttime > lastBufStart){
      lastBufStart = message.starttime;
      // console.log("message.....");
      pub.publish(redisKey, JSON.stringify(message));    
      // pub.publish(redisKey, message.starttime);
    }
  
  });

  ws.on('error', function(error){
    console.log("on the client error: ");// + error);
  });
  
  //called when all data are processed
  //keep going when running as daemon
  ws.on("close", function(){
    setTimeout(function(){
      if(responseHeader.flag === 'F'){
        lastBufStart ++;
      }
      console.log("in the client close?");
      getData(lastBufStart, Date.now()/1000);
    });
  }, 1000);

}

//the first call
getData(start,end);

