"use strict";
var appConfig_1 = require('../config/appConfig');
var app_1 = require('../app');
var io = require('socket.io');
var http_1 = require('http');
var socketIoController_1 = require('../controllers/socketIoController');
var userController_1 = require('../controllers/userController');
userController_1.userController.checkAdminExist();
var port = appConfig_1.config.port;
app_1.app.set('port', port);
var server = http_1.createServer(app_1.app);
socketIoController_1.socketIoController.start(io.listen(server));
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}
/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}
