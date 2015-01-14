//client side of quakeShake 
$(function(){  
  var canvas = new Canvas(new canvasConfig);
  //returns param value (from stack overflow)
  $.urlParam = function(name){
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results==null){
         return null;
      }
      else{
         return results[1] || 0;
      }
  }
// Controls stuff
   $("#playback-slider").slider({
     slide: function(e, ui){
       if (!canvas.realtime){
         $("#button-play").removeClass("disabled");
         $("#button-stop, #button-realtime").addClass("disabled");
       }
       canvas.selectPlayback(e, ui);
     }
   });
    
   $("#zoom-slider").slider({
     min: canvas.zoomSliderMin, //logs
     max: canvas.zoomSliderMax,
     value: canvas.scale,
     step: .05,
     slide: function(e, ui){
       canvas.selectScale(e, ui);
       $("#quickShakeScale").css("color", "red");
     }
   });
   
   
  //every sample rate(pixel) redraw

  $("#button-play").click(function(){
    if(!$("#button-play").hasClass("disabled")){
      canvas.playScroll();
      $("#button-realtime, #button-stop").removeClass("disabled");
      $("#button-play").addClass("disabled");
    }
    return false;
  });

  $("#button-stop").click(function(){
    if(!$("#button-stop").hasClass("disabled")){
      canvas.pauseScroll();
      $("#button-play").removeClass("disabled");
      $("#button-stop, #button-realtime").addClass("disabled");
    }
    return false;
  });

  $("#button-realtime").click(function(){
      //hide when done
    if(!$("#button-realtime").hasClass("disabled") && !canvas.realtime){
      $("#button-realtime").addClass("disabled");
      canvas.realtime=true;
    }
    return false;
  });
//end controls stuff
  
//websocket stuff

  // var socket = io('http://realtime.pnsn.org:80');
   var socket = io(host);
  socket.on('connect', function(data){
    // setStatus('connected');
    // socket.emit('subscribe', {channel: "worm:RS:EHZ:UW:--"});
    canvas.setTimeout();
    canvas.fullWidth();
  });

  socket.on('reconnecting', function(data){
    setStatus('reconnecting');
  });

  socket.on('message', function (message) {
      var data = JSON.parse(message);
      canvas.updateBuffer(data);

  });
  
//end socket stuff

  //initial params that should be consistent across all channels on page
  function Canvas(config){
    this.pixPerSec      = config.pixPerSec;  //10 pix/sec = samples second i.e. the highest resolution we can display
    this.timeWindowSec  = config.timeWindowSec;
    this.timeStep       = config.timeStep; 
    this.channelHeight  = config.channelHeight; //how many pix for each signal
    this.height         = config.height;
    this.width          = config.width;
    this.buffer         = config.buffer;
    this.axisColor      = config.axisColor;
		this.lineWidth      = config.lineWidth;
		this.tickInterval   = config.tickInterval;
    this.starttime      = config.starttime; //make these real big and real small so they will be immediately overwritten
    this.endtime        = config.endtime;
    this.startPixOffset = config.startPixOffset; //starttime pixelOffset
    this.lastTimeFrame  = config.lastTimeFrame; // track the time of the last time frame(left side of canvas this will be incremented each interval)
    this.canvasElement  = config.canvasElement;
    this.localTime      = config.localTime;
    this.stationScalar  = config.stationScalar;
    this.scale          = config.scale;
    this.zoomSliderMin  = config.zoomSliderMin;
    this.zoomSliderMax  = config.zoomSliderMax;
    this.realtime       = config.realtime; //realtime will fast forward if tail of buffer gets too long.
    this.scroll         = config.scroll; //sets scrolling
    this.timeout        = config.timeout; //Number of minutes to keep active
  };
  
  // incoming data are appended to buf
  // drawing is done from left to right (old to new)
  
  //buffer will be of form:
  
  //  {
  //    milliseconds: {
  //      chan1: val,
  //      chan2: val,
  //      ....
  //      chanN: val
  //  }
  //        ....
  //}
  
  //called when new data arrive. Function independently from 
  // drawSignal method which is called on a sampRate interval
  Canvas.prototype.updateBuffer = function(packet){
     //we want to be writting new data just inside of canvas left
    if(this.lastTimeFrame == null){
      this.lastTimeFrame = this.makeTimeKey(packet.starttime);
    
      this.startPixOffset -=(this.pixPerSec*4);
    
      //400 for each channel + 20 pix for top and bottom time line plus 2px margin
      this.height = channels.length*this.channelHeight + 44; 
      this.canvasElement.height = this.height;
      this.canvasElement.width = this.width;
      // this.updateGs(this.scale);
         
    }
    
    
    
    if(this.buffer == null)
      this.buffer = {};
    //update times to track oldest and youngest data points
    if(packet.starttime < this.starttime)
      this.starttime = this.makeTimeKey(packet.starttime);
    if(packet.endtime > this.endtime)
      this.endtime = this.makeTimeKey(packet.endtime);
    //decimate data
    this.updatePlaybackSlider();
    var _decimate = packet.samprate/this.pixPerSec;
    var _i = 0;
    var _t = packet.starttime;
    // this.buffer[this.makeTimeKey(_t)][this.makeChanKey(packet)] = packet.data[_i];
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
  
  Canvas.prototype.drawSignal = function(){
    if(this.scroll){
      //OFFSET at start
      if(this.startPixOffset >  0){
        this.startPixOffset--;
      }else{
        this.lastTimeFrame += this.timeStep;
      }
      
      //ADJUST PLAYwe need to adjust play if data on end of buffer tails off canvas
      //ideally we want new data written on canvas at about 10 seconds in 
      if(this.realtime){
        var tail = parseInt(this.startPixOffset + ((this.endtime - this.lastTimeFrame)/1000 * this.pixPerSec) - this.width, 0);
        if(tail < -50)
          pad=0;
        else if(tail < 20)
          pad =2;
        else if(tail < 100)
          pad = 4;
        else if(tail < 1000)
          pad =9;
        else if(tail < 10000)
          pad=99;
        else
          pad=9999;
          //need to adjust these two values if we added padding
        this.lastTimeFrame += pad*this.timeStep;
        this.startPixOffset = Math.max(0,   this.startPixOffset -pad);
      }
    
      //PRUNE the buffer at 6 canvas widths by three canvas widths
      if(((this.endtime - this.starttime)/1000)*this.pixPerSec > 6*this.width){
        var time= this.starttime;
        while(time < this.starttime + 3*this.timeWindowSec*1000){          
          delete this.buffer[time];
          time+=this.timeStep; 
        }
        this.starttime = time;
      }
    }
    
    // FIND MEAN AND Extreme vals
    var start = this.lastTimeFrame;
	  var stop = this.lastTimeFrame + this.timeWindowSec*1000;
	  if(start < stop){
	    var ctx = this.canvasElement.getContext("2d");
      ctx.clearRect( 0, 0, this.width, this.height );
  		ctx.lineWidth = this.lineWidth;
      this.drawAxes(ctx);
  		
      ctx.beginPath();

      //iterate through all channels and draw
      for(var i=0; i< channels.length; i++){
        var channel = channels[i];
        start = this.lastTimeFrame;
      
        
        //find mean and max
        var sum=0;
        // var min = Number.MAX_VALUE;
        // var max = -Number.MAX_VALUE;
        //use full array for ave an max
        var starttime = this.starttime;
        var count =0;
        while(starttime <= this.endtime){
          if(this.buffer[starttime] && this.buffer[starttime][channel.key]){
            var val = this.buffer[starttime][channel.key];
            sum+=val;
            // max = val > max ? val : max;
            // min = val < min ? val :min;
            count++;
            
          }
          starttime+=this.timeStep;
        }
        var mean = sum/count;
        
        // //switch vals if min is further from center
        // if(Math.abs(max - mean) < Math.abs(min - mean)){
        //   max = min;
        // };
        //
        // this.scale is default 1 and adjusted by zoom slider
        // max = parseInt(Math.abs(max-mean)*this.scale,0);
        
        // //FIXME Debugging
        // $("#status").text("Pad by " + pad + ", tail:" + tail + ", bufferLength: " + count );
        // var s = channel.sta.toLowerCase();
        // $("#status-" + s).text(s+ ":" +  " mean: " + mean + ", max: " + max + ", min:" + min + ", sum: " + sum  );        
      
        
    		ctx.strokeStyle = channel.lineColor;
    
    
    		//Draw!! from left to write
    		//if startPixOffset > 0 , this is offset, start drawing there
    		//this is only the case while plot first renders till it reaches left side of canvas
    	  var canvasIndex = this.startPixOffset;
    	  //boolean to use moveTo or lineTo
    	  // first time through we want to use moveTo
    	  var gap = true;
    	  // draw Always start from lastTimeFrame and go one canvas width
    	  count = 0;
        
        while(start <= stop){
          if(this.buffer[start] && this.buffer[start][channel.key]){
            var val = this.buffer[start][channel.key];
            var norm = ((val - mean) *Math.pow(10,this.scale)); 
            
            if(norm < -1)
              norm = -1;
            if(norm > 1)
              norm = 1;
            
            var chanAxis = 22 + (this.channelHeight/2) + this.channelHeight*channel.position; //22 is offset for header timeline.
            var yval= Math.round( (this.channelHeight) / 2 * norm + chanAxis);
            
            if(gap){
              ctx.moveTo( canvasIndex, yval);
              gap =false;
            }else{
              ctx.lineTo(canvasIndex, yval);            
            }
          }else{
            gap = true;
          }
          canvasIndex++;
          start+= this.timeStep;
        
        }//while
        ctx.stroke();
      
      }
    }
  };
  
  //make a key based on new samprate that zeros out the insignificant digits. 
  Canvas.prototype.makeTimeKey = function(t){
    return parseInt(t/this.timeStep,0)*this.timeStep;
  };

  Canvas.prototype.makeChanKey = function(packet){
    //remove the dashes that are the default for loc = null
    var loc = (!packet.loc || packet.loc == "--" || this.loc =="") ?  "" : ("_" + packet.loc);
    return  packet.sta.toLowerCase() + "_" + packet.chan.toLowerCase() + "_" + packet.net.toLowerCase()  + loc;
  };  
  
  Canvas.prototype.drawAxes = function(ctx){
    //actual edge of display (axes labels are outside of this frame)
    var edge = {
      left:  0,
      right: this.width,
      top:  20,
      bottom: this.height-20
    };
  
    //some axis lines
    ctx.beginPath();
    //x-axes
    ctx.moveTo(edge.left, edge.top); //top
    ctx.lineTo(edge.right, edge.top);
    ctx.moveTo(edge.left,  edge.bottom); //bottom
    ctx.lineTo(edge.right, edge.bottom);

    //y-axes
    ctx.moveTo(edge.left, edge.top);// left
    ctx.lineTo(edge.left, edge.bottom);
    ctx.moveTo(edge.right, edge.top);//right
    ctx.lineTo(edge.right, edge.bottom);
    
    //scnl label
    ctx.font = "15px Helvetica, Arial, sans-serif";
    ctx.strokeStyle = "#119247"; // axis color    
    ctx.stroke();
    
    ctx.beginPath();
    //channel center lines and labels:
    for(var i=0; i< channels.length; i++){
      var channel = channels[i];
      var yOffset= channel.position*this.channelHeight; 
      ctx.fillText(channel.sta, edge.left + 10, 40+ yOffset);
      var chanCenter = 22 + this.channelHeight/2 +yOffset;      
      ctx.moveTo(edge.left,  chanCenter);
      ctx.lineTo(edge.right, chanCenter);
    }
    ctx.strokeStyle = "#CCCCCC"; //middle line
    ctx.stroke();
    //end axis
    
    
    //plot a tick and time at all tickIntervals
    ctx.beginPath();
    ctx.font = "13px Helvetica, Arial, sans-serif";
    
    //centerline
    
    var offset = this.lastTimeFrame%this.tickInterval;  //should be number between 0 & 9999 for 10 second ticks
    //what is time of first tick to left  of startPixOffset
    var tickTime = this.lastTimeFrame - offset;
    
    var canvasIndex = this.startPixOffset - offset/this.timeStep;
    var pixInterval = this.tickInterval/this.timeStep;
    while(canvasIndex < edge.right + 20){ //allow times to be drawn off of canvas
      // ctx.moveTo(canvasIndex, this.height -19);
      ctx.moveTo(canvasIndex, 20);
      ctx.lineTo(canvasIndex, this.height - 15);
      
      ctx.fillText(this.dateFormat(tickTime), canvasIndex - 23, 12); //top
      ctx.fillText(this.dateFormat(tickTime), canvasIndex - 23, this.height -1); //bottom
      canvasIndex+= pixInterval;
      tickTime+=this.tickInterval;
    }
    ctx.strokeStyle = "#CCCCCC"; //vertical time lines
    ctx.stroke();
  };
  
  //accept milliseconds and return data string of format HH:MM:SS in UTC or local
  Canvas.prototype.dateFormat = function(milliseconds){
    var d = new Date(milliseconds);
    if(this.localTime){
      var hours =  d.getHours();
      var minutes = d.getMinutes();
      var seconds = d.getSeconds();
    }else{
      var hours =  d.getUTCHours();
      var minutes = d.getUTCMinutes();
      var seconds = d.getUTCSeconds();
    }
    var time;
    if(hours < 10)
     hours = "0" + hours;
    if(minutes < 10)
      minutes = "0" + minutes;
    if(seconds < 10)
      seconds = "0" + seconds;
    time = hours + ":" + minutes + ":" + seconds;
    if(seconds == "00")
      time += " PST";
    return time;
  };
  
  //playback slider
  Canvas.prototype.updatePlaybackSlider=function(){
    $("#playback-slider" ).slider( "option", "max", this.endtime);
    $("#playback-slider").slider( "option", "min", this.starttime);
    if(this.scroll){
      $("#playback-slider").slider( "option", "value", this.lastTimeFrame);
    }
  };
  
  Canvas.prototype.pauseScroll = function(){
    clearInterval(this.scroll);
    this.scroll = null;
    //take things out of realtime mode once scroll is stopped
    this.realtime = false;
  };
    
  Canvas.prototype.playScroll = function(){
      _this = this;
      this.scroll = setInterval(function(){
        if(_this.buffer != null){
          _this.drawSignal();
        }
      }, 1000/this.pixPerSec);
  };
  
  Canvas.prototype.selectPlayback=function(e,ui){
    if(this.startPixOffset == 0){
      if(this.scroll){
        this.pauseScroll();
      }
      var val = ui.value;
      if(val > this.endtime){
        $("#playback-slider").slider( "option", "value", this.lastTimeFrame);
      
      }else{
        this.lastTimeFrame= this.makeTimeKey(val);
        this.drawSignal();
      }
    }
  };
  
  //Handles the connection timeout 
  Canvas.prototype.setTimeout = function(){
    if($.urlParam('timeout')==true||$.urlParam('timeout')==null){ //for some reason I have to put == true...
      //Initial interval for checking state  
      var idleInterval = setInterval(timerIncrement, 60000); // 60000 = 1 minute
    
      var idleTime = 0;
      
      //Zero the idle timer on mouse movement or key press
      // $("body").mousemove(resume);
      $("body").keypress(resume);
      $("body").click(resume);
  
      var MAXTIME = this.timeout + 5; //minute (time to )
      var MINTIME = this.timeout; //minute
      var timeAlert = $("#timeout");
      
      //I need to fix this
      var pageHeight = this.channelHeight * (channels.length + 0.5) + 44 + 35;//44 for time offset and 100 for controls;
      timeAlert.css("height", $(window).height()+"px"); 
      timeAlert.css("width", $(window).width()+"px"); 
      $("#timeout").css("padding-top", $(window).height()/2-30 + "px");
      function timerIncrement() {
        if (MAXTIME-idleTime>1){
          $("#timer").html("Stream will stop in "+(MAXTIME-idleTime)+" minutes.");
        }else if(MAXTIME-idleTime ==1){
          $("#timer").html("Stream will stop in "+(MAXTIME-idleTime)+" minute.");
        }else{
          $("#timer").html("Stream has ended.");
        }

        if (idleTime == MINTIME){
          timeAlert.css("display", "block");
        } else if (idleTime == MAXTIME){
          socket.close();
          // canvas.realtime=false;
        }
        timeAlert.click(resume);
        idleTime++;
      }
  
      // Hide the information and 
      function resume(){
        if (!socket.connected){
          // console.log("open socket");
          socket.open();
          canvas.realtime=true;
          // location.reload();
        }
        timeAlert.css("display", "none");
        idleTime = 0;
      }
    }
  };
  
  Canvas.prototype.selectScale=function(e,ui){
    this.scale = ui.value;
    if(!this.scroll){
      this.drawSignal();
    }
    // this.updateGs(ui.value);
    this.updateScale();
  };
  
  Canvas.prototype.updateScale=function(){
    $("#quickShakeScale").css("height", this.channelHeight/2);
    var scale = Math.pow(10,-this.scale);//3 sig. digits
    if (scale < 0.000099){
      scale = scale.toExponential(2);
    } else {
      scale = scale.toPrecision(2);
    }

    // console.log(scale);
    $("#top").html(scale);
  }
  
  Canvas.prototype.fullWidth=function(){
    $("#header, #footer, #stage-warning, #full-width, #quick-oops").hide();
    $("#quick-body, #quakeLogo").show();
    $("#page").css("margin-top", "0px");
    var offSet=60; //Offset from edge
    var bannerHeight=$("#hawkBanner").height(); //Make sure there is space for the banner
    var height = $(window).height()-$("#page").height()-105; //banner height && controls height 
    var width = $(window).width()-1.2*offSet;
    if (!$("#quickShake").is(":visible")){ 
      var height = $(window).height()-150; //banner height && controls height
      var width = $(window).width()-20;
      
      // canvas.mobile();
    }
    $("#quakeShake").css("top", $("#page").height()+"px");
    $("#quickShakeScale").css("top", $("#page").height()+21+"px");
    this.channelHeight = height/channels.length;
    this.width = width;
    this.startPixOffset = this.width;
    this.updateScale();
  };
  
  //absolutely hideous code to deal with mobile menu
  //I'll fix it when it isn't midnight
  function mobile(playback) {
    $("#zoom label").html("Scale (%g)");
    if(playback && $("#quake-buttons").is(":visible")){
      $("#playback").show();
      $("#quake-buttons").toggle("slide");
      $("#mobile-playback").html("Close");
    }else if(playback && $("#zoom").is(":visible")){
      $("#zoom").hide();
      $("#playback").show();
      $("#mobile-scale").html("Scale");
      $("#mobile-playback").html("Close");
    } else if(!playback && $("#playback").is(":visible")){
      $("#zoom").show();
      $("#playback").hide();
      $("#mobile-playback").html("Playback");
      $("#mobile-zoom").html("Close");
    }else if(playback && !$("#quake-buttons").is(":visible")){
      $("#playback").hide();
      $("#quake-buttons").toggle("slide");
      $("#mobile-playback").html("Playback");
    }else if(!playback && $("#quake-buttons").is(":visible")){
      $("#zoom").show();
      $("#quake-buttons").toggle("slide");
      $("#mobile-scale").html("Close");
    }else if(!playback && !$("#quake-buttons").is(":visible")){
      $("#zoom").hide();
      $("#quake-buttons").toggle("slide");
      $("#mobile-scale").html("Scale");
    }
  }
  
    $("#mobile-scale").click(function(event){
      mobile(false);
      event.preventDefault();
    });
    
    $("#zoom")
      .mouseenter(function(){
        $("#quickShakeScale").css("color", "red");
      })
      .mouseleave(function(){
        $("#quickShakeScale").css("color", "initial");
      });
    
    $("#mobile-playback").click(function(event){
      mobile(true);
      event.preventDefault();
    });
  
  $( window ).resize(function(){
    if($("#quickShake").is(":visible")){
      location.reload();
    }
  });
  canvas.playScroll(); //get these wheels moving!
  
  //end playback slider

});