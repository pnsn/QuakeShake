//Subscription side of redis pub/sub
//To start get channel name for output of quakeShakePub
// node server/quakeShakeSub --channel=someChannelName
var http = require('http');
// var sockjs = require('sockjs');
var redis = require('redis');

 
// Listen for messages being published to this server.
 
var ARGS={};
process.argv.forEach(function(val, index, array) {

  if(val.match(/=.*/i)){
    var keyVal = val.split("=");
    ARGS[keyVal[0]] = keyVal[1];
  }
});
console.log(ARGS);

if(ARGS['channel']==null || ARGS['port'] == null){
  console.log("channel and port arguement not found. Usage:");
  console.log("node server/quakeShakeSub port=[port] channel=[chan]");
  process.exit(1);
  
}else{
  console.log("Connected");
  console.log("To view in browser use port " + ARGS['port']);
}

var io = require('socket.io')(ARGS['port']); //port connection for client
//server node (subscriber)
var sub = redis.createClient();
sub.subscribe(ARGS['channel']);//subscribe to Pub channel
io.on('connection', function(client){ 
  sub.on('message', function(channel, msg) {
    console.log("from channel: " + channel + " msg: " + msg);
  
    client.send(msg);
  });

    client.on('message', function(msg) {
         });

    client.on('disconnect', function() {
         //don't do this
        // sub.quit();
    });
  
});
