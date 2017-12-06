///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from 'log4js';
let logger = getLogger('cronController');
import {scheduleJob, Job} from 'node-schedule';
//import {dbController} from './dbController';
//import {changeAdvNumbers} from '../tools/advMultiplier';
//import {socketIoController} from './socketIoController';
import {advController} from './advController';
//import {amqpController} from './amqpController';
import apply = Reflect.apply;
class CronController {
  private  cronStartStorage:{[index:string]:Job} = {};
    private cronFinishStorage:{[index:string]:Job} = {};

    constructor() {
//   started | paused | finished | pending
    }
//first recount budget, then finish campaign
    public changeAdvCampaignStatus(conditions:{_id:string, owner:string}, status:string, date:string):void {
        logger.debug('campaign', conditions._id, 'will be', status, 'at', date);
        if (status == 'finished' || status == 'started') {
            var startDate = new Date(date);
            var shedule:Job = scheduleJob(startDate, function () {
                advController.changeStatus(conditions, status);
            });
            if(this.cronFinishStorage[conditions._id]) delete this.cronFinishStorage[conditions._id];
            if (status == 'finished') this.cronFinishStorage[conditions._id] = shedule;
            if (status == 'started') this.cronStartStorage[conditions._id] = shedule;
        }
    }
    public advCacheRecount(scope, recountFunc):void{
        logger.debug('advCacheRecount started');
        scheduleJob('0 50 23 * * *', function () {
            logger.warn('=================');
            recountFunc.call(scope);
        })
    }
    
    public calculateFinished(scope, func):void{
        scheduleJob('0 0 * * * *', function () {
           // logger.warn('=================');
            func.call(scope);
        })
    }
}

export var cronController = new CronController();