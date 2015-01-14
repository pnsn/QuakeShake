//Subscription side of redis pub/sub
//To start get channel name for output of quakeShakePub
// node server/quakeShakeSub --channel=someChannelName, --redisHost=someRedisHost, --redisPort=redisport

var http = require('http');
// var sockjs = require('sockjs');
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
  console.log("Add config file to the config directory and name it [config]Sub.conf.js");
  console.log("node server/quakeShakeSub config=[config]");
  process.exit(1);
}

var SubScnls = require(__dirname + "/../config/" + ARGS['config'] +  "Sub.conf.js"); //unique conf file for this process


//very general. Otherwise we need to JSON.parse each packet to get a time
//so we are making  a few assumptions
//packets are about 2.25seconds, 200 seconds wanted (little padding)
//assumes three packets. 
var buffMax = parseInt(200/2.25, 0)*3;
var buffer =[];

var subScnls = new SubScnls();
var io = require('socket.io')(subScnls.port); //port connection for client
var sub = redis.createClient(subScnls.redisPort, subScnls.redisHost);
sub.subscribe(subScnls.key);//subscribe to Pub channel

io.on('connection', function(client){ 
     //catch buffer up here
   for(var i=0; i < buffer.length; i++){
     client.send(buffer[i]);
   }
  
  sub.on('message', function(channel, msg) {
    // console.log("from channel: " + channel + " msg: " + msg);
    console.log("msg.length: " + msg.length );
    console.log("buffer length :" + buffer.length);
    client.send(msg);
    updateBuffer(msg);
  });
      
    client.on('connect', function() {
 
        
     });
    
    
     client.on('error', function(err) {
           console.log(err);
      });
    
    client.on('disconnect', function() {
         //don't do this
        // sub.quit();
    });
  
});

//simple buffer treated as queue.
//this queue shift is really O(n) but
//since this is such a small array it shouldn't matter
function updateBuffer(msg){
  var packetFound=false;
  //check for dupes. Only need to look at the tail end of buffer
  for(var i=buffer.length -6; i< buffer.length; i++){
    if(msg == buffer[i]){
      packetFound=true;
      break;
    }
  }
  if(!packetFound){
    buffer.push(msg);
  }
  while(buffer.length > buffMax ){
    buffer.shift();
  }
  
  // console.log(buffer);
}

