(function() {
  var Protocol = window.Protocol;
  var EventEmitter = window.EventEmitter;

  var PKG_HANDSHAKE = 1;    // handshake package
  var PKG_HANDSHAKE_ACK = 2;    // handshake ack package
  var PKG_HEARTBEAT = 3;    // heartbeat package
  var PKG_DATA = 4;         // data package

  if (typeof Object.create !== 'function') {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  var root = window;
  var pomelo = Object.create(EventEmitter.prototype); // object extend from object
  root.pomelo = pomelo;
  var socket = null;
  var reqId = 0;
  var callbacks = {};

  var handshakeBuffer = {
    'sys':{
      'version':'1.1.1',
      'heartbeat':1
    },'user':{
    }
  }


  pomelo.init = function(params, cb){
    pomelo.params = params;
    params.debug = true;
    pomelo.cb = cb;
    var host = params.host;
    var port = params.port;

    var url = 'ws://' + host;
    if(port) {
      url +=  ':' + port;
    }
    console.log(url);
    if (!params.type) {
      handshakeBuffer.user = params.user;
      this.initWebSocket(url,cb);
    }
  };

  pomelo.initSocketIO = function(url,cb){

    socket = io.connect(url, {'force new connection': true, reconnect: false});
    socket.on('connect', function(){
      console.log('[pomeloclient.init] websocket connected!');
      if (!!cb) { cb(socket);}
    });

    socket.on('reconnect', function() {
      console.log('reconnect');
    });

    socket.on('message', function(data){
      if(typeof data === 'string') {
        data = JSON.parse(data);
      }
      if(data instanceof Array) {
        processMessageBatch(pomelo, data);
      } else {
        processMessage(pomelo, data);
      }
    });

    socket.on('error', function(err) {
      pomelo.emit('io-error', err);
      console.log(err);
    });

    socket.on('disconnect', function(reason) {
      pomelo.emit('disconnect', reason);
    });

  };


  pomelo.initWebSocket = function(url,cb){

    var onopen = function(event){
      console.log('[pomeloclient.init] websocket connected!');
      var obj = Protocol.encode(PKG_HANDSHAKE,Protocol.strencode(JSON.stringify(handshakeBuffer)));
      send(obj);
    };
    var onmessage = function(event){
      var msg = Protocol.decode(event.data);
      processMsg(msg,cb);
    };
    var onerror = function(event) {
      pomelo.emit('io-error', event);
      console.log('socket error %j ',event);
    };
    var onclose = function(event){
      pomelo.emit('close',event);
      console.log('socket close %j ',event);
    }
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    socket.onopen = onopen;
    socket.onmessage = onmessage;
    socket.onerror = onerror;
    socket.onclose = onclose;
  }

  pomelo.disconnect = function() {
    if(socket) {
      !!socket.disconnect && socket.disconnect();
      !!socket.close && socket.close();
      console.log('disconnect');
      socket = null;
    }
  };

  pomelo.request = function(route, msg, cb) {
    route = route || msg.route;
    if(!route) {
      console.log('fail to send request without route.');
      return;
    }
    msg = filter(msg);
    reqId++;
    callbacks[reqId] = cb;
    sendMessage(reqId, route, msg);
  };

  pomelo.notify = function(route, msg) {
    sendMessage(0, route, msg);
  };

  var sendMessage = function(reqId, route, msg) {
    var flag = 0;
    if(!!pomelo.dict && !!pomelo.dict[route]){
      route = pomelo.dict[route];
      flag = flag|0x01;
    }
    var packet = Protocol.encode(PKG_DATA,Protocol.body.encode(reqId, flag, route, Protocol.strencode(JSON.stringify(msg))));
    send(packet);
  };

  var send = function(packet){
    socket.send(packet.buffer);
  };


  var handler = {};

  var heartbeat = function(data){
    var obj = Protocol.encode(PKG_HEARTBEAT,Protocol.strencode(''));
    setTimeout(function(){
      send(obj);
    },pomelo.heartbeat);
  };

  var handshake = function(data){
    var obj = Protocol.encode(PKG_HANDSHAKE_ACK,Protocol.strencode(''));
    data = JSON.parse(Protocol.strdecode(data));

    handshakeInit(data);

    send(obj);
    if (!!pomelo.cb) {
      pomelo.cb(socket);
    }
  };

  var ondata = function(data){
    //probuff decode
    //var msg = Protocol.strdecode(data);
    var msg = Protocol.body.decode(data);

    msg.body = deCompose(msg);

    if(!msg){
      console.error('error');
    }
    processMessage(pomelo, msg);
  };

  handler[PKG_HANDSHAKE] = handshake;
  handler[PKG_HEARTBEAT] = heartbeat;
  handler[PKG_DATA] = ondata;

  var processMsg = function(msg){
    handler[msg.flag].apply(null,[msg.buffer]);
  };

  var processMessage = function(pomelo, msg) {
    if(!msg){
      console.error('error');
    }
    if(!msg.id) {
      // server push message
      if(!msg.route){
        console.log('route : %j', msg);
      }
      pomelo.emit(msg.route, msg.body);
    }

    //if have a id then find the callback function with the request
    var cb = callbacks[msg.id];

    delete callbacks[msg.id];
    if(typeof cb !== 'function') {
      return;
    }

    cb(msg.body);
    return;
  };

  var processMessageBatch = function(pomelo, msgs) {
    for(var i=0, l=msgs.length; i<l; i++) {
      processMessage(pomelo, msgs[i]);
    }
  };

  var filter = function(msg) {
    msg.timestamp = Date.now();
    return msg;
  };

  var deCompose = function(msg){
    var protos = !!pomelo.protos?pomelo.protos.server:{};
    var abbrs = pomelo.abbrs;
    var route = msg.route;

    //Decompose route from dict
    if((msg.flag&0x01)===1){
      if(!abbrs[route]){
        console.error('illigle msg!');
        return {};
      }

      route = msg.route = abbrs[route];
    }
    if(!!protos[route]){
      return protobuf.decode(route, msg.buffer);
    }else{
      return JSON.parse(Protocol.strdecode(msg.buffer));
    }

    return msg;
  };

  var setDict = function(dict) {
    if(!dict){
      return;
    }

    pomelo.dict = dict;
    pomelo.abbrs = {};

    for(var route in dict){
      pomelo.abbrs[dict[route]] = route;
    }
  };

  var initProtos = function(protos){
    if(!protos){return;}

    pomelo.protos = {
      server : protos.server || {},
      client : protos.client || {}
    },

    protobuf.init({encoderProtos: protos.client, decoderProtos: protos.server});
  };

  var handshakeInit = function(data){
    pomelo.heartbeat = data.sys.heartbeat-1000 || 5000;

    setDict(data.sys.dict);

    initProtos(data.sys.protos);
  };

  module.exports = pomelo;
})();
