var Q = require('q');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var log4js = require('log4js');
var logger = log4js.getLogger('AmqpServiceTest');
var AmqpService = require('../services/AmqpService.js').AmqpService;

describe('tests for AmqpService - startRpcServerCampaignsList', function () {
    var testData = 0;
    var ch = function () {

        this.prefetch = function () {
        };
        this.consume = function (q, callback) {
            logger.trace('here is an consume');
            var timeout = 0;
            var msg = {
                fields: {
                    consumerTag: 'amq.ctag-4av2vQgplbY0Y3zubpsdcg',
                    deliveryTag: 3,
                    redelivered: false,
                    exchange: '',
                    routingKey: 'testRpcQ'
                },
                properties: {
                    headers: {},
                    correlationId: 'cf9b1cd6-63b9-4f5d-ba7e-39173254e9cc',
                    replyTo: 'amq.gen-N_3Afxw9xjiqC2bIeAYgpA'
                },
                content: testData
            };
            if(q == 'newMsg') timeout = 100;
            setTimeout(function () {
                callback(msg);
            }, timeout);
        };
        this.sendToQueue = function (q, message, correlationId) {
            logger.info('sendToQueue message:', message);
            logger.debug(correlationId);
            testData = message;
        };
        this.ack = function () {
        };
    };
    ch.prototype.assertQueue = function () {
        var deferred = Q.defer();
        deferred.resolve({queue: 'newMsg'});
        return deferred.promise;
    };
    var amqpService = new AmqpService('mysticServer');
    amqpService.lookForConnectionAndChannel = function () {
    };
    amqpService.getConnect = function () {
    };
    amqpService.getChannel = function () {
        var deferred = Q.defer();
        var s = new ch();
        deferred.resolve(s);
        return deferred.promise;
    };
    it('should test startRpcServerCampaignsList and getting a new message', function (done) {
        var c = 0;
        var a = [];
        testData = new Buffer(JSON.stringify(1));

        function handleData(msg) {
            var deferred = Q.defer();
            testData++;
            if (c == 0) {
                c++;
                setTimeout(function () {
                    deferred.resolve(parseInt(msg) + 1)
                }, 1000)
            } else {
                logger.info('must return 333');
                deferred.resolve('333');
            }
            return deferred.promise;
        }

        amqpService.sendRpcServerAnswer = function (answer, msg) {
            a.push(answer.toString());
            if (a.length == 2) {
                logger.info(a);
                expect(a[0]).to.equal('333');
                expect(a[1]).to.equal('2');
                done();
            }
        };
        amqpService.startRpcServer('qTest', handleData);
        amqpService.startRpcServer('qTest', handleData);
    });
    it('should test startRpcServerCampaignsList got error on generateData', function (done) {
        testData = new Buffer(1);
        amqpService.sendRpcServerAnswer = function (answer, msg) {
            logger.info(answer);
            expect(answer.error).to.equal('something wrong with incoming data, try to do JSON.stringify');
            done();
        };
        function handleData(msg) {
            var deferred = Q.defer();
            deferred.resolve('333');
            return deferred.promise;
        }

        amqpService.startRpcServer('qTest', handleData);
    });
    it('should test startRpcServerCampaignsList got error on handleData function', function (done) {
        testData = new Buffer(JSON.stringify(1));
        amqpService.sendRpcServerAnswer = function (answer, msg) {
            logger.info(answer);
            expect(answer.error).to.equal('something wrong on handle data');
            done();
        };
        function handleData(msg) {
            var deferred = Q.defer();
            deferred.reject({error: '333'});
            return deferred.promise;
        }

        amqpService.startRpcServer('newMsg', handleData);
    });

});

describe('tests for AmqpService - sendMsgRpcClient', function () {
    var testData = 0;
    var msg = {
        fields: {
            consumerTag: 'amq.ctag-4av2vQgplbY0Y3zubpsdcg',
            deliveryTag: 3,
            redelivered: false,
            exchange: '',
            routingKey: 'testRpcQ'
        },
        properties: {
            headers: {},
            correlationId: 'cf9b1cd6-63b9-4f5d-ba7e-39173254e9cc',
            replyTo: 'amq.gen-N_3Afxw9xjiqC2bIeAYgpA'
        },
        content: testData
    };
    var ch = function () {

        this.prefetch = function () {
        };
        this.consume = function (q, callback) {
            logger.trace('here is an consume');
            var timeout = 0;

            if(q == 'newMsg') timeout = 100;
            setTimeout(function () {
                callback(msg);
            }, timeout);
        };
        this.sendToQueue = function (q, message, correlationId) {
            logger.info('sendToQueue message:', message);
            logger.debug(correlationId);
            msg.properties.correlationId = correlationId.correlationId;
            msg.content = message;
            logger.info(msg);
        };
        this.ack = function () {
        };
    };
    ch.prototype.assertQueue = function () {
        var deferred = Q.defer();
        deferred.resolve({queue: 'newMsg'});
        return deferred.promise;
    };
    var amqpService = new AmqpService('mysticServer');
    amqpService.lookForConnectionAndChannel = function () {
    };
    amqpService.getConnect = function () {
    };
    amqpService.getChannel = function () {
        var deferred = Q.defer();
        var s = new ch();
        deferred.resolve(s);
        return deferred.promise;
    };
    it('should test sendMsgRpcClient - success', function (done) {
        testData = new Buffer(JSON.stringify(1));
        ch.sendToQueue = function (q, message, correlationId) {
            logger.info('sending to queue:', message);
        };
        amqpService.sendMsgRpcClient('qName', 'hello')
            .then(function (answer) {
                logger.info('answer - ',answer);
                expect(answer).to.equal('hello');
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    })
});