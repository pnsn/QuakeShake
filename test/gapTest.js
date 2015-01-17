//client side of quakeShake 
$(function(){  
  var gapTest = new GapTest();

  
//websocket stuff

  var socket = io('http://eew.pnsn.org:80');
  socket.on('connect', function(data){
    console.log("Starting Test");
  
  });

  socket.on('reconnecting', function(data){
    setStatus('reconnecting');
  });

  socket.on('message', function (message) {
      var data = JSON.parse(message);
      gapTest.updateBuffer(data);

  });
  
//end socket stuff

  //initial params that should be consistent across all channels on page
  function GapTest(config){
      this.testTime      = 60*1000; 
      this.pixPerSec      = 20;  //10 pix/sec = samples second i.e. the highest resolution we can display
      this.timeWindowSec  = 102.4;
      this.timeStep       = 1000/this.pixPerSec;
      this.buffer         = null;
      this.starttime      = Date.now()*1000; //make these real big and real small so they will be immediately overwritten
      this.endtime        = 0;
      this.stationScalar  =3.207930*Math.pow(10,5)*9.8; // count/scalar => %g
    };


    channels = [
        new Scnl({
        sta: "HWK1",  
        chan: "HNZ", 
        net: "UW", 
        loc: "--", 
        max: null

      }),
          new Scnl({
          sta: "HWK2",  
          chan: "HNZ", 
          net: "UW", 
          loc: "00", 
          max: null
 
          
        }),
          new Scnl({
          sta: "HWK3",  
          chan: "HNZ", 
          net: "UW", 
          loc: "--", 
          max: null
 
          
        })
    ];

    host = "http://eew.pnsn.org/";

    function Scnl(scnl){
      //this.buf = [];
      this.sta = scnl.sta;
      this.chan = scnl.chan;
      this.net = scnl.net;
      this.loc = scnl.loc;
      var loc = (!this.loc || this.loc == "--" || this.loc =="") ?  "" : ("_" + this.loc);
      this.key =  this.sta.toLowerCase() + "_" + this.chan.toLowerCase() + "_" + this.net.toLowerCase() + loc;
      this.maxGap = 0;
      this.cumlativeGaps = 0;
      this.gapCount =  0;
    
    
    }
  
  //called when new data arrive. Function independently from 
  // drawSignal method which is called on a sampRate interval
  
  
  GapTest.prototype.updateBuffer = function(packet){
    if(this.buffer == null)
      this.buffer = {};
    //update times to track oldest and youngest data points
    if(packet.starttime < this.starttime)
      this.starttime = this.makeTimeKey(packet.starttime);
    if(packet.endtime > this.endtime)
      this.endtime = this.makeTimeKey(packet.endtime);
    //decimate data
    var _decimate = packet.samprate/this.pixPerSec;
    var _i = 0;
    var _t = packet.starttime;
    while(_i < packet.data.length){
      var _index = Math.round(_i+= _decimate);
      if(_index < packet.data.length){
        if(!this.buffer[this.makeTimeKey(_t)]){
          this.buffer[this.makeTimeKey(_t)] ={};
        }
        this.buffer[this.makeTimeKey(_t)][this.makeChanKey(packet)] = packet.data[_index]/this.stationScalar;
        _t+=this.timeStep; 
        
      }
    } 
  };
  
  //make a key based on new samprate that zeros out the insignificant digits. 
  GapTest.prototype.makeTimeKey = function(t){
    return parseInt(t/this.timeStep,0)*this.timeStep;
  };

  GapTest.prototype.makeChanKey = function(packet){
    //remove the dashes that are the default for loc = null
    var loc = (!packet.loc || packet.loc == "--" || this.loc =="") ?  "" : ("_" + packet.loc);
    return  packet.sta.toLowerCase() + "_" + packet.chan.toLowerCase() + "_" + packet.net.toLowerCase()  + loc;
  };

// run test for amount of time, close socket and analyze
setTimeout(function(){
  socket.close();
  totalTime = (gapTest.endtime - gapTest.starttime)/1000;
  $("#summary").text("Test length: " + totalTime + "secs. All time are in milliseconds" );
  
  for(var i=0; i< channels.length; i++){
    var gap =false;
    var lastVal =null;
    var channel = channels[i];
    var starttime = gapTest.starttime;
    while(starttime <= gapTest.endtime){
      //if there is a gap and this gap is not at the front of buffer (lastVal != null)
      //only consider gaps once we have a value on either side
      if(!gapTest.buffer[starttime] || !gapTest.buffer[starttime][channel.key] && lastVal!=null){
        gap = true;
      }else{ // no gap here
        if(gap){ //did we just close a gap
          channel.gapCount++;
          var lastGap = starttime - lastVal;
          if(lastGap > channel.maxGap)
            channel.maxGap = lastGap;
          channel.cumlativeGaps+= lastGap;
        }
        lastVal = starttime;
        gap = false;
      }
      starttime+=gapTest.timeStep;
    }//while
    $("#results").append("<tr><td>"+ channel.sta + "</td><td>"+ channel.maxGap + "</td> <td>"+ channel.gapCount + "</td> <td>"+ channel.cumlativeGaps + "</td> <td>"+ Math.round(channel.cumlativeGaps/channel.gapCount) + "</td> </tr>");
    
  }
  
  
  
}, gapTest.testTime);
  

});