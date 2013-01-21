var express = require("express");
var app = express();
var http = require('http');
var net = require('net');

var WebSocketServer = require('ws').Server;

function getSoundBuffer(samples) {
  // header yanked from
  // http://html5-demos.appspot.com/static/html5-whats-new/template/index.html#30
  var header = new Buffer([
      0x52,0x49,0x46,0x46, // "RIFF"
      0, 0, 0, 0,          // put total size here
      0x57,0x41,0x56,0x45, // "WAVE"
      0x66,0x6d,0x74,0x20, // "fmt "
      16,0,0,0,            // size of the following
      1, 0,                // PCM format
      1, 0,                // Mono: 1 channel
      0x44,0xAC,0,0,       // 44,100 samples per second
      0x88,0x58,0x01,0,    // byte rate: two bytes per sample
      2, 0,                // aligned on every two bytes
      16, 0,               // 16 bits per sample
      0x64,0x61,0x74,0x61, // "data"
      0, 0, 0, 0           // put number of samples here
  ]);
  header.writeUInt32LE(36 + samples.length, 4, true);
  header.writeUInt32LE(samples.length, 40, true);
  var data = new Buffer(header.length + samples.length);
  header.copy(data);
  samples.copy(data, header.length);
  return data;
}

function makeSamples(frequency, duration) {
  var samplespercycle = 44100 / frequency;
  var samples = new Uint16Array(4100 * duration);
  var da = 2 * Math.PI / samplespercycle;
  for (var i = 0, a = 0; i < samples.length; i++, a += da) {
    samples[i] = Math.floor(Math.sin(a / 300000) * 32768);
  }
  return getSoundBuffer(new Buffer(Array.prototype.slice.call(samples, 0)));
}

app.use(express.static(__dirname + '/public'));
app.listen(3001);

return ;

var server = http.createServer();

//server.on('connection', function(c) {
   //console.log(' http connection %j');
   //c.on('end', function() {
       //console.log('server disconnected');
   //});
   //c.on('data', function(data) {
	//c.pipe(io.sockets.socket);
        //var d = data.toString();
  	//console.log(" http " + d);
        //if (d.indexOf("socket.io")!=-1){
		//console.log(" socket.io " + d);
	//}
  	//c.end();
   //});
//})

 
 

var samples = makeSamples(2000, 10);
server.listen(8181);

var wss = new WebSocketServer({server:server});

wss.on('connection', function(ws) {
  console.log('wss connection %j');
   ws.on('message', function(message) {
     console.log(" ws connection " + message);
   });
   ws.send(samples, {binary: true});
}); 
 

return;

var io = require('socket.io').listen(server);
server.listen(8181);
//io.set('transports', ['websocket']);
//io.disabled('destroy upgrade')
//io.settings['destroy upgrade'] = false;//true,

//io.ws.path = '/data';

//console.log(io);

io.sockets.on('connection', function (socket) {
     console.log(' socket.io connection  %j ');
     socket.on('message', function (message) {
    	console.log(' socket.io message' + message);
	socket.send(samples, {binary: true});
   });
   socket.on('messagevvvv', function (message) {
    	console.log(' socket.io messagevvvv' + message);
	socket.send("bbbbbbbbbbbbacjk");
   });
});


 
 

 
