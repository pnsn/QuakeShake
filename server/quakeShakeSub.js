//Subscription side of redis pub/sub
//To start get channel name for output of quakeShakePub
// node server/quakeShakeSub --channel=someChannelName, --redisHost=someRedisHost, --redisPort=redisport

var http = require('http');
// var sockjs = require('sockjs');
var redis = require('redis');
var SubScnls = require(__dirname + '/../config/hawks3ZSub.conf.js'); //unique conf file for this process


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
      
    client.on('disconnect', function() {
         //don't do this
        // sub.quit();
    });
  
});
