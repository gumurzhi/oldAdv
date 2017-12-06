///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from 'log4js';
import {dbController} from './dbController';
import {changeAdvNumbers} from '../tools/advMultiplier';
import {userIface} from '../entity/mongoModels/userModel';
import * as cookie from 'cookie';
let logger = getLogger('socketIoController');
import Socket = SocketIO.Socket;
import Server = SocketIO.Server;

interface socketStore extends Socket {
    userId?:string;
}

class SocketIoController {
    private wsClients:{[index:string]:socketStore} = {};

    constructor() {
    }

    public start(io:Server):void {
        var my = this;
        io.set('authorization', function (data, accept) {
            if (data.headers.cookie) {
                data.cookie = cookie.parse(data.headers.cookie);
                data.sessionID = data.cookie['express.sid'];
                var sid = my._getCookie(data.headers.cookie);
                //var changedCookie:string = data.cookie['connect.sid'].replace(/s:(.*?)/, '').replace(/\..*/, '');
                logger.trace('SID:', sid);
                

                dbController.validateSession(sid)
                .then(function(sessionRec){
                   if(sessionRec && sessionRec.session){
                       logger.debug('session record:', sessionRec);
                       data.session = JSON.parse(sessionRec.session);
                       accept(null, true);       
                   } else {
                       logger.error('original cookie:', data.cookie['connect.sid'], 'cookie:', sid);
                       accept('Error', false);
                   }
                })
                .catch(function(err){
                    logger.error('dbController.validateSession ERROR:',err);
                    accept('Error', false);
                });
            } else {
                return accept('No cookie transmitted.', false);
            }
        });

        io.on("connection", function (socket:Socket) {
            if (socket && socket.handshake && socket.handshake.headers && socket.handshake.headers.cookie) {
                var cookie = my._getCookie(socket.handshake.headers.cookie);
                my.wsClients[cookie] = socket;
                var userId = my._getUserId(socket);
                my.wsClients[cookie].userId = userId;
                logger.trace("User ID:", userId, 'connected');
              //  logger.trace('cookie:', cookie);
            }
            socket.on('error', function (err) {
                logger.error('socket.on(error', err);
            });

            socket.on('disconnect', function () {
                if (socket && socket.handshake && socket.handshake.headers && socket.handshake.headers.cookie) {
                    var cookie = my._getCookie(socket.handshake.headers.cookie);
                    my._deleteFromWsClient(cookie);
                    logger.info('disconnected', cookie);
                }
            })
        });
        io.on('error', function (err) {
            logger.error('io.on(error', err);
        })


    }

    public disconnectClient(sessionId:string):void {
        try {
            this.wsClients[sessionId].disconnect();
            delete this.wsClients[sessionId];
        } catch (err) {
            logger.error('disconnectClient ERROR', err);
        }
    }

    private _deleteFromWsClient(id:string):void {
        try {
            delete this.wsClients[id];
        } catch (err) {
            logger.error('_deleteFromWsClient ERROR:', err);
        }
    }

    private _getCookie(crypCookie:string):string {
        var co;
        try {
            co = cookie.parse(crypCookie);
            //logger.trace('original cookie:', co);
            co = co['connect.sid'].replace(/s:(.*?)/, '').replace(/\..*/, '');
            //logger.trace('changed cookie:', co);
            return co;
        } catch (err) {
            logger.error('_getCookie ERROR', err);
            return '';
        }
    }

    private _getUserId(socket:Socket):string {
        var userId:string;
        try {
            userId = socket.request.session.passport.user;
        } catch (err) {
            logger.warn('_getUserId', err);
            userId = '';
        }
        return userId;
    }
    public sendUserInfo(user: userIface):void{
        if(user.password) delete user.password;
        this.sendToCustomer('userUpdates', user._id, changeAdvNumbers(user, false));
    }

    public sendToCustomer (eventName: string, owner: string, data:any):void{
        var my = this;
        logger.trace('Send to frontEnd',eventName, ':', owner, ".....", data);
        if(owner){
            for(var key in my.wsClients){
                logger.trace('wsClient:', key);
                //logger.warn('owner ', my.wsClients[key].userId, owner);
                if(my.wsClients[key].userId == owner){
                    logger.trace('emitting', eventName,  'send:', data);
                    my.wsClients[key].emit(eventName, JSON.stringify(data));
                }
            }
        }
    }


}

export var socketIoController = new SocketIoController();
