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
//commenting these out right now and 
//hard coding in three hawk chans
// var scnl={
//   'sta':  ARGS['sta'].toUpperCase(),
//   'chan': ARGS['chan'].toUpperCase(),
//   'net' : ARGS['net'].toUpperCase(),
//   'loc' : (ARGS['loc'] == null ? "--" : ARGS['loc'].toUpperCase())// : "--")
// };

//use scnl to create redis key worm:sta:chan:net:loc:start
// var redisKey = "worm:" + scnl['sta'] + ":" + scnl['chan'] + ":" + scnl['net'] + ":" + scnl['loc'];
var redisKey= "hawks3Z";
var scnlIndex = 0;

var scnls = [new Scnl({sta: 'HWK1', chan: 'HNZ', net: 'UW', loc: '--'}),
             new Scnl({sta: 'HWK2', chan: 'HNZ', net: 'UW', loc: '--'}),
             new Scnl({sta: 'HWK3', chan: 'HNZ', net: 'UW', loc: '--'})];
             
//run this as a realtime daemon or as a discreet chunk 
//discreet chunks aren't really part of the plan right now
// if(ARGS['start'] && ARGS['end']){
//   var daemon =false;
// }else{
//   var daemon = true;
//   var end = Date.now();
//   var start = end  -1;
// }
var  daemon = true;

var pub = redis.createClient();


console.log("To subscribe to this channel start quakeShakeSub with:");
console.log("node server/quakeShakeSub channel=" + redisKey + " port=n");

//for testing
var lastEndtime = Date.now();

function getData(chan){
  //create connection then attach listeners 
  // header: fires when getscnlraw header is processed
  //data: fires when data is buffered
  //close fires on waverserver closes connection

  var ws = new Waveserver(HOST, PORT, chan, Date.now());
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
  ws.on('data', function(message){
    var chan = findChan(message);
    if(message.starttime > chan.start){
      chan.start = message.starttime;
      pub.publish(redisKey, JSON.stringify(message));
      // console.log("from scnl:" + message.sta + ":" + message.chan + ":" + message.net + ":" + message.loc);
      // console.log(chan.sta + " " + (lastEndtime - message.starttime));
      lastEndtime = message.endtime;
      // console.log("packet length " + message.data.length);
      // console.log("elapsed time = " + (message.endtime - message.starttime));
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
      var chan = scnls[scnlIndex];
      getData(chan);
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

//simple scnl object
function Scnl(scnl){
  this.sta = scnl.sta;
  this.chan = scnl.chan;
  this.net = scnl.net;
  this.loc = scnl.loc;
  this.stop= Date.now();
  this.start = this.stop -1000;
  this.lastBufStart = this.start;
}

