///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from "log4js";
let logger = getLogger('amqpController');
import * as Q from "q";
import * as amqp from "amqplib";
import {config} from "../config/appConfig";
import {AdvCampaignIface} from "../entity/mongoModels/advCampaigns";
import {AmqpService} from "../services/AmqpService";
import {dbController} from "./dbController";
import {varInterfaces} from "../entity/varInterfaces";
import {advController} from "./advController";

import mongoose = require("mongoose");
var amqpService = new AmqpService(config.amqp.uri || 'amqp://localhost');

class AmqpController {

    public constructor() {
    }

    /** RPC server to push campaigns to appinion servers. Ids in array will be ignored */
    public startRpcServerCampaignsList():void {
        var my = this;
        amqpService.startRpcServer(config.amqp.rpcCampaignListQ, handleData);
        function handleData(message?:{platformName:string, imgLink:string}):Promise<mongoose.Document[]> {
            logger.debug('rpcCampaignListQ got message:', message);
            var deferred = Q.defer();
            // if (message && message.imgLink && message.platformName) {
            //     logger.debug('updating ', message.platformName + '\'s image link to', message.imgLink);
            //     dbController.setPlatform(message.platformName, message.imgLink);
            // }
            var campaignsToPlatforms = advController.getWorkingCampaigns().map(function (cell) {
                return my._convertForPlatform(cell);
            });
            logger.trace('send to client:', campaignsToPlatforms);
            deferred.resolve(campaignsToPlatforms);
            return deferred.promise;
        }
    };

    private _convertForPlatform(campaign:AdvCampaignIface) {
        var adv:any = {
            originalId: campaign._id,
            title: campaign.title,
            description: campaign.description,
            status: campaign.status,
            price: campaign.price,
            targeting: campaign.targeting,
            startDate: campaign.startDate,
            endDate: campaign.endDate
        };
        if(campaign.logo) adv.logo = 'http://' + config.webAddress + ':' + config.port + campaign.logo;
        if(campaign.banner) adv.banner = 'http://' + config.webAddress + ':' + config.port + campaign.banner;
        if(campaign.vert_img) adv.vert_img = 'http://' + config.webAddress + ':' + config.port + campaign.vert_img;
        if(campaign.horz_img) adv.horz_img = 'http://' + config.webAddress + ':' + config.port + campaign.horz_img;
        if(campaign.btnTxt) adv.btnTxt = campaign.btnTxt;
        if(campaign.btnColor) adv.btnColor  = campaign.btnColor;
        if(campaign.action && (campaign.action.data || campaign.action.actionType)){
            adv.action = {};
            if(campaign.action.data) adv.action.data = campaign.action.data;
            if(campaign.action.actionType) adv.action.actionType = campaign.action.actionType;
        }
        return adv;
    }

    public listenSettedPlatform():void{
        amqpService.listenQueue(config.amqp.inWorkQ, handleData);
        function handleData(message: {_id:string, data:{platformName:string, imgLink:string}}):void{
            advController.setPlatformIdent(message._id, message.data);
        }
    }

    /** RPC server, that reserve money for adv show */
    public startRpcServerAdvReservation():void {
        amqpService.startRpcServer(config.amqp.rpcReservationQ, handleData);
        function handleData(message:varInterfaces.campaignReserv[]):Promise<mongoose.Document[]> {
            var deferred = Q.defer();
            var answer:{uid:string, status:boolean}[] = [];
            processReservation(0);
            function processReservation(num) {
                advController.reserveAdv(message[num]._id, message[num].uid)
                    .then(function (result) {
                        logger.info('', result);
                        answer.push(result);
                        if (answer.length == message.length) {
                            deferred.resolve(answer);
                        } else {
                            processReservation(num + 1);
                        }
                    })
                    .catch(function (err) {
                        logger.error(err);
                        answer.push({uid: message[num].uid, status: false});
                        if (answer.length == message.length) {
                            deferred.resolve(answer);
                        } else {
                            processReservation(num + 1);
                        }
                    });
            }

            return deferred.promise;
        }
    };

    /** exchange, that gets reports about adv shows */
    public listenDebitExchange():void {
        logger.info('listenDebitExchange started');

        amqpService.listenExchange(config.amqp.debitExchange, function (msg:any) {
            advController.debitCampaign(msg);
        });
    };

    /** sends messages to any RPC server */
    public sendRpcClientMsg(q:string, msg:any):Promise<amqp.Message> {
        return amqpService.sendMsgRpcClient(q, msg);
    };

    public sendAdvChanges(advCampaign:AdvCampaignIface):void {
        var my = this;
        amqpService.publishToExchange(config.amqp.advEventsEx, my._convertForPlatform(advCampaign));
    }

    // public listenTst():void {
    //     amqpService.listenExchange('test', handledata);
    //     function handledata(msg:any):void {
    //         logger.warn(msg);
    //     }
    // };
    public reqForActiveClientsCount(conditions?:varInterfaces.getClientsRequiestOptions):void{
        if(!conditions) conditions = {uid: 'default'};
        if(!conditions.uid) conditions.uid = 'default';
        amqpService.publishToExchange(config.amqp.clientReqExchange, conditions);
    };
    public resForActiveclientsCount():void{
        amqpService.listenExchange(config.amqp.clientResExchange, function (data: varInterfaces.clientCountResponse) {
            logger.debug('resForActiveclientsCount got:', data);
            advController.countActiveClients(data);
        })
    }
}

export var amqpController = new AmqpController();
