//remove example from name before using this file
//all conf files will be gitignored
var Scnl = require(__dirname + '/../lib/scnl.js');


function PublishScnls(){
  
  //uniquie name the subscriber will subscribe to 
  this.key = "coastal";
  this.waveHost = "import02.ess.washington.edu";
  this.wavePort = 16021;
  this.redisHost = "localhost";
  this.redisPort = 6379;
  //all channels you want to publish to this key
  this.scnls = [
             new Scnl({sta: 'JEDS', chan: 'ENZ', net: 'UW', loc: '--'}),
             new Scnl({sta: 'BABR', chan: 'ENZ', net: 'UW', loc: '--'}),
             new Scnl({sta: 'HEBO', chan: 'ENZ', net: 'UW', loc: '--'}),
             new Scnl({sta: 'RADR', chan: 'ENZ', net: 'UW', loc: '--'}),
             new Scnl({sta: 'WISH', chan: 'ENZ', net: 'UW', loc: '--'}),
             new Scnl({sta: 'FORK', chan: 'ENZ', net: 'UW', loc: '--'})   
            ];
             
}

module.exports = PublishScnls;
