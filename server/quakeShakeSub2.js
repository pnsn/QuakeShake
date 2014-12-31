//prototype of a sub server that saves all bufs to as redis keys for querying discreet time chunks.
//Subscription side of redis pub/sub
//To start get channel name for output of quakeShakePub
var http = require('http');
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
var sub = redis.createClient();
var redis = redis.createClient();

////SUBSCRIBE/////
sub.subscribe(ARGS['channel']);//subscribe to Pub channel
var d = Date.now();
sub.on('message', function(channel, msg) {
  // console.log("from channel: " + channel + " msg: " + msg);
  // console.log(msg);
  var json = JSON.parse(msg);
  // console.log(json);
  // var json = msg;
  var scnl = json.sta.toLowerCase() + ":" + json.chan.toLowerCase() + ":" + json.net.toLowerCase() + ":" +  json.loc.toLowerCase();
  var key = scnl + "_" +  json.starttime;
  redis.set(key, msg);
  redis.keys(scnl + "_*", function(err, reply){
    var keys= [];
    for(var i=0; i < reply.length; i++){
      if(parseInt(reply[i].split("_")[1],0) > d){
        keys.push(reply[i]);
      }
    }
    console.log(keys);
  });
});

////END SUBSCRIBE////


///CLIENT CONNECT (WEB BROWSER)////
io.on('connection', function(client){   
  
  
  client.send(msg);
  


  client.on('message', function(msg) {
       
       
  });
  
  
  client.on('disconnect', function() {
       //don't do this
      // sub.quit();
  });
  
});
