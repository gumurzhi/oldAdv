///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from 'log4js';
let logger = getLogger('abuseController');
import {Abuse} from '../entity/mongoModels/abuse';
import {dbController} from './dbController';
import {socketIoController} from './socketIoController';
import apply = Reflect.apply;

class AbuseController{
    constructor(){
        
    }
    public setAbuse(userId:string, abuseObj:{message:string, subject:string}):Promise<Abuse>{
        return dbController.setAbuse(userId, abuseObj.subject, abuseObj.message);
    }
}

export var abuseController = new AbuseController();