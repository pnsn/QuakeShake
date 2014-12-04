$(function(){
  var socket = io.connect('http://localhost:3300');

  socket.on('connect', function(data){
    setStatus('connected');
    socket.emit('subscribe', {channel: "wave#emitter"});
  });

  socket.on('reconnecting', function(data){
    setStatus('reconnecting');
  });

  socket.on('message', function (data) {

  	  console.log(data);
      addMessage(data);
  });

  function addMessage(data) {
      $('#online').html(data);
  }

  function setStatus(msg) {
      $("#status").text('Connection Status : ' + msg);
  }
  
  
  
  


});