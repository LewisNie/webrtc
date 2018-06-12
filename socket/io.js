module.exports = function (io) {
    io.on('connection', function (socket) {
        console.log('a user connected');
        function log() {
            var array = ['message from server:'];
            array.push.apply(array, arguments);
            socket.emit('log', array);
        }

        socket.on('message', function (message) {
            log('Client said:', message);
            socket.broadcast.emit('message', message);
        });

        socket.on('create or join', function (room) {
            var clients = io.sockets.adapter.rooms[room];
            var numClients = (clients == undefined)?0:clients.length;
            console.log(numClients);
            log('Received request to create or join room '+ room);
            log('Room '+ room + 'now has '+ numClients + ' client(s)');
            if (numClients === 0){
                socket.join(room);
                log('Client ID '+ socket.id + ' created room '+ room);
                socket.emit('created', room, socket.id);
            } else if(numClients === 1){
                log('Client ID '+ socket.id + ' created.room ' + room);
                io.to(room).emit('join', room);
                socket.join(room);
                socket.emit('joined', room, socket.id);
                io.to(room).emit('ready');
            } else {
                console.log("emit full signal");
                socket.emit('full', room);
            }
        });
        socket.on('ipaddr', function () {
           var ifaces = os.networkInterfaces();
           for(var dev in ifaces){
               ifaces[dev].forEach(function (details) {
                   if(details.family === 'IPv4' && details.address !== '127.0.0.1'){
                       socket.emit('ipaddr', details.address);
                   }
               });
           }
        });
        socket.on('disconnect', function () {
            console.log('user disconnected');
        });
    });
}
