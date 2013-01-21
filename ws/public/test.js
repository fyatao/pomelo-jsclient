 
     var socket = io.connect('http://192.168.144.244:8181/');
 
     socket.on('message', function (data) {
        alert('ss');
    	console.log(typeof data);
     });

      socket.on('connect', function () {
        console.log('connect');
        socket.send('    data  ');
      });
 
      socket.on('error', function (e) {
         console.log(' error ' + e);
      });

     setInterval(function(){
                 var buf = new ArrayBuffer(32);
		 socket.emit(buf);
					},10000)
