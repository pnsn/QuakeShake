#Webiworm

Webiworm is a Node.js app designed to connect to a variety of binary seismic trace data, convert it to JSON and use Redis pub-sub to broadcast. Note at this time it is an unfinished project. 


#Data Types
#curently only the Earthworm Tracebuf2 is supported

##TRACEBUF2

The data are requested via the Earthworm module GETSNLRAW http://folkworm.ceri.memphis.edu/ew-doc/ovr/wave_serverV_ovr.html#Tools
The reposnse will look like this:
<code> uniqId ddd sta chan net loc flag datatype start end bytes_of_binary_data_to_follow  <code>


<pre>
uniqId = id you pass from GETSNCLRAW command
ddd= integer id
sta = station 
chan = channel
net = network
loc = location
flag = it consists of the letter F followed by zero or more letters. A space terminates the flags. The bare letter F by itself means that the requested data was returned; there may be gaps in the data but it is up to the client to detect those. Currently "FR", "FL", and "FG" are implemented to indicate that the request totally missed the tank. "FL" means that the requested interval was before anything in the tank; "FR" means the requested interval was after anything in the tank. "FG" is used to indicate that the requested interval fell wholy within a gap in the tank.
dataytpe = only i2, i4, s2, and s4 are implemented. i means Intel byte order; s means Sparc byte order; 2 and 4 meaning two- four-byte signed integer.
bytes to follow = number of byest of data to follow for a given request Intel = little Endian
</pre>

###Examples

For request:

GETSCNLRAW: getRaw RCM EHZ UW -- 1404165651 1404165655 

Header response:

getRaw 362 RCM EHZ UW -- F i2 1.4041656508200073E9 1.4041656558200073E9 1320

##MiniSeed

Coming soon


##Client
The client is currently under development