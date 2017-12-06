///<reference path="../typings/tsd.d.ts"/>
import * as amqp from "amqplib";
import {getLogger} from "log4js";
import * as Q from "q";
import {EventEmitter} from "events";
import {v4} from "uuid";
let logger = getLogger('AmqpService');


export class AmqpService extends EventEmitter {
    msgStore:Object;
    uri:string;
    connFlag:boolean;
    chFlag:boolean;
    chArr:any;
    connArr:any;
    connection:amqp.Connection;
    channel:amqp.Channel;


    public constructor(uri:string) {
        super();
        this.connFlag = false;
        this.connArr = [];
        this.chFlag = false;
        this.chArr = [];
        this.uri = uri;
        this.msgStore = {};
    }


    private getConnect():Promise<amqp.Connection> {
        logger.trace('getConnect started');
        var deferred = Q.defer();
        var my = this;
        if (!this.connection) {
            logger.trace('no connection!');
            if (!my.connFlag) {
                my.connFlag = true;
                amqp.connect(this.uri)
                    .then(function (conn) {
                        my.connection = conn;
                        for (var i = 0; i < my.connArr.length; i++) {
                            my.connArr[i].resolve(conn);
                        }
                        deferred.resolve(conn);
                    })
                    .catch(function (err) {
                        logger.error(err);
                        deferred.reject(err);
                    });
            } else {
                my.connArr.push(deferred);
            }
        } else {
            deferred.resolve(my.connection);
        }
        return deferred.promise;
    }

    private getChannel():Promise<amqp.Channel> {
        logger.trace('getChannel started');
        var deferred = Q.defer();
        var my = this;
        if (!my.channel) {
            if (!my.chFlag) {
                my.chFlag = true;
                logger.trace('no channel? :', my.channel);
                my.getConnect()
                    .then(function (conn) {
                        return conn.createChannel();
                    })
                    .then(function (ch) {
                        my.channel = ch;
                        for (var i = 0; i < my.chArr.length; i++) {
                            my.chArr[i].resolve(ch);
                        }
                        deferred.resolve(ch);
                    })
                    .catch(function (err) {
                        logger.error(err);
                        deferred.reject(err);
                    });
            } else {
                my.chArr.push(deferred);
            }
        } else {
            deferred.resolve(my.channel);
        }
        return deferred.promise;
    }

    public startRpcServer(qName:string, handleData:(message:any)=> any):void {
        var my = this;
        my.getChannel()
            .then(function (ch) {
                ch.assertQueue(qName); //, {durable: false});
                ch.prefetch(1);
                logger.debug('start listening q', qName);
                ch.consume(qName, function reply(msg:amqp.Message) {
                    generateAnswer(msg, handleData);
                })
            })
            .catch(function (err) {
                logger.error(err);
            });


        function generateAnswer(msg:amqp.Message, handleData:(message:any)=> any):void {
            //  logger.trace('rpcServer started');
            var toClient:any;
            logger.trace('got message:', msg.content.toString());
            try {
                toClient = JSON.parse(msg.content.toString());
            } catch (err) {
                logger.error('something wrong with incoming data:', err);
                toClient = {error: 'something wrong with incoming data, try to do JSON.stringify'};
                my.sendRpcServerAnswer(toClient, msg);
            }
            if (!toClient.error) {
                handleData(toClient)
                    .then(function (answer) {
                        logger.trace('data handled, answer is:', answer);
                        my.sendRpcServerAnswer(answer, msg);
                    })
                    .catch(function (err) {
                        logger.error(err);
                        toClient = {error: 'something wrong on handle data'};
                        my.sendRpcServerAnswer(toClient, msg);
                    });
            }
        }
    }

    private sendRpcServerAnswer(answer:any, msg:amqp.Message):void {
        var my = this;
        my.getChannel()
            .then(function (ch) {
                ch.sendToQueue(msg.properties.replyTo,
                    new Buffer(JSON.stringify(answer)),
                    {correlationId: msg.properties.correlationId});
                ch.ack(msg);
            })
            .catch(function (err) {
                logger.error(err);
            });
    }

    public sendMsgRpcClient(qName:string, msg:any):Promise<amqp.Message> {
        var deferred = Q.defer();
        try {
            msg = JSON.stringify(msg);
            logger.debug('try to send msg:', msg, 'to Q:', qName);
        } catch (err) {
            logger.error(err);
            deferred.reject({error: err, msg: 'something wrong with incoming message'});
            return deferred.promise;
        }
        var my = this;
        my.getChannel()
            .then(function (ch) {
                ch.assertQueue('', {exclusive: true})
                    .then(function (q) {
                        var corr:string = v4();
                        ch.consume(q.queue, function (msg) {
                            logger.trace('got message from ', q.queue);
                            if (my.msgStore[msg.properties.correlationId]) {
                                var amqpAnswer:string = JSON.parse(msg.content.toString());
                                logger.trace(' [.] Got: %s', amqpAnswer);
                                var tmpDefer = my.msgStore[msg.properties.correlationId];
                                tmpDefer.resolve(amqpAnswer);
                                delete my.msgStore[msg.properties.correlationId];
                                return deferred.promise;
                            }
                        }, {noAck: true});
                        my.msgStore[corr] = deferred;
                        ch.sendToQueue(qName, new Buffer(msg), {correlationId: corr, replyTo: q.queue});
                    })
                    .catch(function (err) {
                        logger.error(err);
                    })
            })

            .catch(function (err) {
                logger.error(err);
            });
        return deferred.promise;
    }

    public publishToExchange(exName:string, msg:any):void {
        var my = this;
        my.getChannel()
            .then(function (ch) {
                ch.assertExchange(exName, 'fanout');
                msg = JSON.stringify(msg);
                ch.publish(exName, '', new Buffer(msg));
                logger.info(" [x] Sent %s", msg);
            })
            .catch(function (err) {
                logger.error(err);
            });
    };

    public listenExchange(ex:string, handleData:(msg:any)=> void):void {
        var my = this;
        my.getChannel()
            .then(function (ch) {
                ch.assertExchange(ex, 'fanout');
                ch.assertQueue('', {exclusive: true})
                    .then(function (q) {
                        logger.info('listening queue:', q.queue);
                        ch.bindQueue(q.queue, ex, '');
                        ch.consume(q.queue, function (msg) {
                            try {
                                var incMessage = JSON.parse(msg.content.toString());
                                logger.debug('got message:', incMessage);
                                handleData(incMessage);
                            } catch (err) {
                                logger.error(err);
                            }
                        }, {noAck: true});
                    })
                    .catch(function (err) {
                        logger.error(err);
                    });

            })
            .catch(function (err) {
                logger.error(err);
            });
    };

    public sendToQueue(queue:string, msg:any):void {
        var my = this;
        my.getChannel()
            .then(function (ch) {
                ch.assertQueue(queue);
                msg = JSON.stringify(msg);
                ch.sendToQueue(queue, new Buffer(msg), {persistent: true});
            })
            .catch(function (err) {
                logger.error('sendToQueue ERROR:', err);
            });
    };

    public listenQueue(queue:string, handleData:(msg:any)=>void):void {
        var my = this;
        my.getChannel()
            .then(function (ch) {
                ch.assertQueue(queue);
                ch.prefetch(1);
                ch.consume(queue, function (msg) {
                    try {
                        var incMessage = JSON.parse(msg.content.toString());
                        logger.debug('listenQueue got message:', incMessage);
                        handleData(incMessage);
                    } catch (err) {
                        logger.error(err);
                    }
                }, {noAck: true});
            })
            .catch(function (err) {
                logger.error(err);
            });
    }

}