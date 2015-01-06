//Subscription side of redis pub/sub
//To start get channel name for output of quakeShakePub
// node server/quakeShakeSub --channel=someChannelName, --redisHost=someRedisHost, --redisPort=redisport

var http = require('http');
// var sockjs = require('sockjs');
var redis = require('redis');
var SubScnls = require(__dirname + '/../config/hawks3ZSub.conf.js'); //unique conf file for this process


 
// Listen for messages being published to this server.
 
// var ARGS={};
// process.argv.forEach(function(val, index, array) {
// 
//   if(val.match(/=.*/i)){
//     var keyVal = val.split("=");
//     ARGS[keyVal[0]] = keyVal[1];
//   }
// });
// console.log(ARGS);

// if(ARGS['channel']==null || ARGS['port'] == null || ARGS['redisHost']==null || ARGS['redisPort'] == null ){
//   console.log("channel and port arguement not found. Usage:");
//   console.log("node server/quakeShakeSub port=[port] channel=[chan] redisHost=[redis pub host] redisPort=[port]");
//   process.exit(1);
//   
// }else{
//   console.log("Connected");
//   console.log("To view in browser use port " + ARGS['port']);
// }

var subScnls = new SubScnls();
var io = require('socket.io')(subScnls.port); //port connection for client
var sub = redis.createClient(subScnls.redisPort, subScnls.redisHost);
sub.subscribe(subScnls.key);//subscribe to Pub channel
io.on('connection', function(client){ 
  sub.on('message', function(channel, msg) {
    // console.log("from channel: " + channel + " msg: " + msg);
    console.log("msg.length: " + msg.length );
    client.send(msg);
  });
      
    // This is a one way street  
    // client.on('message', function(msg) {
    //      });

    client.on('disconnect', function() {
         //don't do this
        // sub.quit();
    });
  
});
