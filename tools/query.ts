///<reference path="../typings/tsd.d.ts"/>
import * as amqp from 'amqplib';
import {getLogger} from 'log4js';
let logger = getLogger('AmqpTest');
import * as Q from 'q';
import {EventEmitter} from 'events';
import {v4} from 'uuid';
import {AmqpService} from '../services/AmqpService';
import {amqpController} from '../controllers/amqpController';
import {config} from '../config/appConfig';
var amqpService = new AmqpService(config.amqp.uri || 'amqp://localhost');


// setTimeout(function () {
//     amqpController.sendRpcClientMsg(config.amqp.rpcCampaignListQ, ['57aa42274252691e2be8475d'])
//     .then(function (answer) {
//         logger.info('it\'s an answer', answer);
//     })
//     .catch(function (err) {
//         logger.error(err);
//     });
// }, 1000);

 var z = [];
 // for(var i = 0; i< 40; i++){
//     z[i] = {_id: 'ssdsdsd', uid: '824'+i}
// }
 z.push({_id: '57b829f1c2d3a09f19eea3e3', uid: '1'});
 z.push({_id: '57b829f1c2d3a09f19eea3e3', uid: '2'});


 logger.trace('',new Date());
 amqpController.sendRpcClientMsg(config.amqp.rpcReservationQ, z)
 .then(function (data) {
        logger.trace('',new Date());
        logger.info('fucking answer:', data)
    })
 .catch(function (err) {
        logger.error(err);
    });


var x = {
    uid: '12345',
    campaignId: "57aa42274252691e2be8475d",
    debit: 0.6,
    statistic: {
        platform: 'android',
        age: "25_34",
        gender: "male",
        country: "Beautiful country",
        banner: true,
        vert_img: true,
        horz_img: true,
        action: false,  //number of milliseconds
    }
};

//amqpService.publishToExchange(config.amqp.debitExchange, [x]);
