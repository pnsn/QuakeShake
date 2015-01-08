//remove example from name before using this file
//all conf files will be gitignored

function SubScnls(){
  
  //uniquie name the subscriber will subscribe to 
  this.key = "coastal";
  this.redisHost = "localhost";
  this.redisPort = 6379;
  this.port = 2112; //port browser connects to
             
}

module.exports = SubScnls;

