//Simple server that subscribes to a redis pub/sub channel and broadcasts out to the tubes

var http = require('http');
// var sockjs = require('sockjs');
var redis = require('redis');
var io = require('socket.io')(3300); 
 
// Listen for messages being published to this server.
 


//server node (subscriber)
var sub = redis.createClient();

sub.subscribe("wave");//subscribe to Pub channel

io.on('connection', function(client){
  sub.on('message', function(channel, msg) {
    console.log("from channel: " + channel + " msg: " + msg);
    client.send(msg);
  });

    client.on('message', function(msg) {
         });

    client.on('disconnect', function() {
        sub.quit();
    });
  
});
