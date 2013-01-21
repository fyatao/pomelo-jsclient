(function() {
	var isArray = Array.isArray;

	var root = this;

	function EventEmitter() {
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports.EventEmitter = EventEmitter;
	} else {
		root = window;
		root.EventEmitter = EventEmitter;
	}

	// By default EventEmitters will print a warning if more than
	// 10 listeners are added to it. This is a useful default which
	// helps finding memory leaks.
	//
	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	var defaultMaxListeners = 10;
	EventEmitter.prototype.setMaxListeners = function(n) {
		if (!this._events) this._events = {};
		this._maxListeners = n;
	};

	EventEmitter.prototype.emit = function() {
		var type = arguments[0];
		// If there is no 'error' event listener then throw.
		if (type === 'error') {
			if (!this._events || !this._events.error ||
					(isArray(this._events.error) && !this._events.error.length))
				{
					if (this.domain) {
						var er = arguments[1];
						er.domain_emitter = this;
						er.domain = this.domain;
						er.domain_thrown = false;
						this.domain.emit('error', er);
						return false;
					}

					if (arguments[1] instanceof Error) {
						throw arguments[1]; // Unhandled 'error' event
					} else {
						throw new Error("Uncaught, unspecified 'error' event.");
					}
					return false;
				}
		}

		if (!this._events) return false;
		var handler = this._events[type];
		if (!handler) return false;

		if (typeof handler == 'function') {
			if (this.domain) {
				this.domain.enter();
			}
			switch (arguments.length) {
				// fast cases
				case 1:
					handler.call(this);
				break;
				case 2:
					handler.call(this, arguments[1]);
				break;
				case 3:
					handler.call(this, arguments[1], arguments[2]);
				break;
				// slower
				default:
					var l = arguments.length;
				var args = new Array(l - 1);
				for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
				handler.apply(this, args);
			}
			if (this.domain) {
				this.domain.exit();
			}
			return true;
		} else if (isArray(handler)) {
			if (this.domain) {
				this.domain.enter();
			}
			var l = arguments.length;
			var args = new Array(l - 1);
			for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

			var listeners = handler.slice();
			for (var i = 0, l = listeners.length; i < l; i++) {
				listeners[i].apply(this, args);
			}
			if (this.domain) {
				this.domain.exit();
			}
			return true;

		} else {
			return false;
		}
	};

	EventEmitter.prototype.addListener = function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('addListener only takes instances of Function');
		}

		if (!this._events) this._events = {};

		// To avoid recursion in the case that type == "newListeners"! Before
		// adding it to the listeners, first emit "newListeners".
		this.emit('newListener', type, typeof listener.listener === 'function' ?
							listener.listener : listener);

		if (!this._events[type]) {
			// Optimize the case of one listener. Don't need the extra array object.
			this._events[type] = listener;
		} else if (isArray(this._events[type])) {

			// If we've already got an array, just append.
			this._events[type].push(listener);

		} else {
			// Adding the second element, need to change to array.
			this._events[type] = [this._events[type], listener];
		}

		// Check for listener leak
		if (isArray(this._events[type]) && !this._events[type].warned) {
			var m;
			if (this._maxListeners !== undefined) {
				m = this._maxListeners;
			} else {
				m = defaultMaxListeners;
			}

			if (m && m > 0 && this._events[type].length > m) {
				this._events[type].warned = true;
				console.error('(node) warning: possible EventEmitter memory ' +
											'leak detected. %d listeners added. ' +
											'Use emitter.setMaxListeners() to increase limit.',
				this._events[type].length);
				console.trace();
			}
		}

		return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('.once only takes instances of Function');
		}

		var self = this;
		function g() {
			self.removeListener(type, g);
			listener.apply(this, arguments);
		}

		g.listener = listener;
		self.on(type, g);

		return this;
	};

	EventEmitter.prototype.removeListener = function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('removeListener only takes instances of Function');
		}

		// does not use listeners(), so no side effect of creating _events[type]
		if (!this._events || !this._events[type]) return this;

		var list = this._events[type];

		if (isArray(list)) {
			var position = -1;
			for (var i = 0, length = list.length; i < length; i++) {
				if (list[i] === listener ||
						(list[i].listener && list[i].listener === listener))
					{
						position = i;
						break;
					}
			}

			if (position < 0) return this;
			list.splice(position, 1);
		} else if (list === listener ||
							 (list.listener && list.listener === listener))
			{
				delete this._events[type];
			}

			return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
		if (arguments.length === 0) {
			this._events = {};
			return this;
		}

		var events = this._events && this._events[type];
		if (!events) return this;

		if (isArray(events)) {
			events.splice(0);
		} else {
			this._events[type] = null;
		}

		return this;
	};

	EventEmitter.prototype.listeners = function(type) {
		if (!this._events) this._events = {};
		if (!this._events[type]) this._events[type] = [];
		if (!isArray(this._events[type])) {
			this._events[type] = [this._events[type]];
		}
		return this._events[type];
	};
})();

(function (exports, global) {


 var Protocol = exports;
 
	var WS_PROTOCOL = 0X80;

	var HEADER = 3;

	var Message = function(id,route,body){
	    this.type = id;
	    this.flag = route;
	    this.buffer = body;
	};

/**
 *
 * pomele client message encode
 *
 * @param int flag message type
 * @param arraybuffer buffer proto message body
 *
 * return Uint8Array 
 *
 */
Protocol.encode = function(flag,buffer){
		var length = buffer.length;
    var byteArray = new Uint8Array(HEADER+length);
		var mask = WS_PROTOCOL | flag;
    var index = 0;
		byteArray[index++] = mask & 0xFF;
    byteArray[index++] = length>>16 & 0xFF;
    byteArray[index++] = length>>8 & 0xFF;
    byteArray[index++] = length & 0xFF;
    for(;index<HEADER+length;){
			byteArray[index] = buffer[index-HEADER];
			index++;
		}
		return byteArray.buffer;
};


Protocol.decode = function(buffer){
    var bytes = new Uint8Array(buffer);
	  var type = (bytes[0] & WS_PROTOCOL);
    var flag = bytes[0] & 0X7F;
		var length = bytes.byteLength;
    var byteArray = new Uint8Array(length-HEADER);
		var index = 0 ;
		for(;index<length;){
			byteArray[index] = bytes[index+HEADER];
			index++;
		}
    return new Message(type,flag,byteArray);
};

		/**
	 * pomele client encode
	 * id message id;
	 * route message route
	 * msg message body
	 * socketio current support string
	 */
	Protocol.strencode = function(msg){
		var msgStr = JSON.stringify(msg);
		var byteArray = new Uint8Array(msgStr.length);
		var index = 0;
		for (var i = 0; i < msgStr.length; i++) {
			byteArray[index++] = msgStr.charCodeAt(i);
		}
		return byteArray;
	};

	/**
	 * client decode
	 * msg String data
	 * return Message Object
	 */
	Protocol.strdecode = function(buffer){
    var bytes = new Uint8Array(buffer);
		var body = bt2Str(bytes,0,bytes.length);  
		return JSON.parse(body);
	};

	var bt2Str = function(byteArray,start,end) {
		var result = "";
		for(var i = start; i < byteArray.length && i<end; i++) {
			result = result + String.fromCharCode(byteArray[i]);
		}
		return result;
	};

})('object' === typeof module ? module.exports : (this.Protocol = {}), this);

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

		var onopen = function(cb){
		  console.log('[pomeloclient.init] websocket connected!');
			var obj = Protocol.encode(PKG_HANDSHAKE,Protocol.strencode(handshakeBuffer));
			socket.send(obj);
		};
		var onmessage = function(e){
			var msg = Protocol.decode(e.data);
			processMsg(msg);
		};
		var onerror = function(err) {
			pomelo.emit('io-error', err);
			console.log('socket error %j ',err);
		};
		var onclose = function(err){
			pomelo.emit('close',err);
			console.log('socket close %j ',err);
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
		socket.send(Protocol.encode(reqId, route, msg));
	};


	var handler = {};

	var heartbeat = function(data){
		var obj = Protocol.encode(PKG_HEARTBEAT,Protocol.strencode({}));
		setTimeout(function(){
			socket.send(obj);
		},pomelo.heartbeat);
	}
	var handshake = function(data){
		  var obj = Protocol.encode(PKG_HANDSHAKE_ACK,Protocol.strencode(''));
			var data = Protocol.strdecode(data);
			console.log('vvvvvvvv%j',data)
			pomelo.heartbeat = data.sys.heartbeat-1000 || 5000;
			socket.send(obj);
	}
	var ondata = function(data){
		//probuff decode
	  console.log(' wsssss receive data');	
	}

  handler[PKG_HANDSHAKE] = handshake; 
  handler[PKG_HEARTBEAT] = heartbeat;
	handler[PKG_DATA] = ondata;

	var processMsg = function(msg){
		handler[msg.flag].apply(null,[msg.buffer]);
	}

	var processMessage = function(pomelo, msg) {
		if(!msg.id) {
			// server push message
			pomelo.emit(msg.route, msg);
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
})();
