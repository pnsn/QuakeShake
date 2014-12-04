//some basic tests to analyze a given waveserver's content

var net = require('net');
var Connection = require('ssh2');
var req = "/earthworm/bin/getmenu mazama.ess.washington.edu:16017";
var getMenuResAll = ""; ///one long string since buffer response doesn't break on \n
var HOST = '128.95.16.15';
var PORT = 16017;

var conn = new Connection();
conn.on('ready', function() {
  console.log('Connection :: ready');
  conn.exec(req, function(err, stream) {
    if (err) throw err;
    stream.on('exit', function(code, signal) {
      console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
    }).on('close', function() {
      var getMenuRes = getMenuResAll.split("\n");
      for(i=0; i< getMenuRes.length; i++){
        var scnl = getMenuRes[i].match(/.{3,4}\..{3}\..{2}\..{2}/);
        
        
        if(scnl){
          console.log("tst");
          //go to the right 'FR' since we only care about the header
          var end = Date.now()/1000 + 100;
          var start = end  -10;
          scnl = scnl[0].trim().split(".");
          var ws = new Waveserver(HOST, PORT, scnl, start, end);
          ws.connect();
          console.log(ws.rawResponse);
        
        }else{
          console.log("Can't process line " + getMenuRes[i]);
        }
        
      }
      conn.end();
    }).on('data', function(data) {
      getMenuResAll += String.fromCharCode.apply(null,data);
      // getMenuRes = getMenuRes.concat(arr);
      
    }).stderr.on('data', function(data) {
      // console.log(s instanceof Buffer);
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: 'tunk.ess.washington.edu',
  port: 7777,
  username: 'joncon',
  privateKey: require('fs').readFileSync('/Users/joncon/.ssh/id_rsa')
});



// //connect to socket
// var client = new net.Socket();
// var socket  = client.connect(PORT, HOST, function() {
//   // var bl = new BufferList();
//   client.write(reqStr);
// });
// 
// 
// // listen for incoming data
// socket.on("data", function(data){
//      console.log(data);
// 
// 
// });
// 
// 
// 
// // I am not sure why this isn't working ....
// client.on('close', function() {
//   console.log("clossing time....");
// });