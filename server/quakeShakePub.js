//Connect to Earthworm waveserver to retrieve traceBuf2 packages for a given SCNL and time window 
//use redis sub/pub design to broadcast to listening node app(s)
//call with following format 
//node quakeShakePub.js waveHost=host wavePort=port# sta=RCM chan=EHZ net=UW redisPort=redisPort redisHost = port#
//or
//node server/quakeShakePub.js server=import02.ess.washington.edu  port=16022 sta=HWK1 chan=HNZ net=UW

//ALL EPOCH TIMES ARE MILLISECONDS!!!!

// var net = require('net');
var Waveserver = require(__dirname + '/../lib/waveserver');
var redis = require('redis');

var ARGS={};
process.argv.forEach(function(val, index, array) {

  if(val.match(/=.*/i)){
    var keyVal = val.split("=");
    ARGS[keyVal[0]] = keyVal[1];
  }
});

if(ARGS['config']==null){
  console.log("You must supply config file as first arguement Usage:");
  console.log("Add config file to the config directory and name it [config]Pub.conf.js");
  console.log("node server/quakeShakePub config=[config]");
  process.exit(1);
}

var PublishScnls = require(__dirname + "/../config/" + ARGS['config'] + "Pub.conf.js"); //unique conf file for this process


var scnlIndex = 0;

//get configs

var conf = new PublishScnls();
var redisKey=conf.key;
var scnls = conf.scnls;
var waveHost = conf.waveHost;
var wavePort = conf.wavePort;
var redisPort = conf.redisPort;
var redisHost = conf.redisHost;



var daemon, start, stop;
//daemon mode will run indefinetly with current data
//daemon is assumed if stop is blank
if(conf.stop ===null){
  daemon = true;
  stop = Date.now();
  start = stop - 1000; //1 second
}else{
  daemon = false;
  start = conf.start;
  stop =  conf.stop;
}
var pub = redis.createClient(redisPort, redisHost);


console.log("To subscribe to this channel start quakeShakeSub with:");
console.log("node server/quakeShakeSub channel=" + redisKey + " port=n redisHost=thishost redisPort=" + redisPort);

//for testing
// var lastEndtime = Date.now();

function getData(scnl){
  console.log('getData called');
  if(scnl.lastBufStart === null){
    scnl.lastBufStart = start;
  }
  if(daemon){
    var scnlStop = Date.now();
  }else{
    var scnlStop = scnl.lastBufStart + 5*1000; //move 5 seconds at a time for back filling
  }
  var ws = new Waveserver(waveHost, wavePort, scnl);
  ws.connect(scnl.lastBufStart, scnlStop);
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
  ws.on('data', function(message){
    console.log("dataa!!!!");
    var scnl = findChan(message);
    if(message.starttime > scnl.lastBufStart){
      scnl.lastBufStart = message.starttime;
      pub.publish(redisKey, JSON.stringify(message));
      console.log("from scnl:" + message.sta + ":" + message.chan + ":" + message.net + ":" + message.loc);
      // console.log(scnl.sta + " " + (lastEndtime - message.starttime));
      // lastEndtime = message.endtime;
      console.log("packet length " + message.data.length);
      console.log("elapsed time = " + (message.endtime - message.starttime));
    }
  
  });

  ws.on('error', function(error){
    // console.log("on the client error: ");// + error);
  });
  
  //called when all data are processed or socket timesout
  //keep going when running as daemon
  
  ws.on("close", function(){
    setTimeout(function(){
      scnlIndex ++;
      scnlIndex = scnlIndex == scnls.length ? 0 : scnlIndex;
      var scnl = scnls[scnlIndex];
      getData(scnl);
    }, 500);
  });

}



//find channel object based on returned message
//needed to track each channels last start
function findChan(msg){
  var chan;
  for(var i=0; i < scnls.length; i++){
    var c = scnls[i];
    if(c.sta == msg.sta && c.chan == msg.chan && c.net == msg.net && c.loc == msg.loc){
     chan = c;
     break;
    }
  }
  return chan;
}


//the first call
var end = Date.now();
getData(scnls[0]);