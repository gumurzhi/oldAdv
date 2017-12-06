///<reference path="../typings/tsd.d.ts"/>
//import {_extend} from 'util';
import {getLogger} from 'log4js';
let logger = getLogger('advMultiplier');
export function changeAdvNumbers(obj:any, multiply:boolean) {
    logger.trace('changeAdvNumbers was called');
    if(!obj) {
        logger.error('changeAdvNumbers got no data to change');
        return false;
    }
    try {
        var obj = JSON.parse(JSON.stringify(obj));//_extend({}, incObj);
        var up:number;
        up = multiply? 3 : -3;
        if(obj.wallet) obj.wallet *= Math.pow(10, up); 
        if (obj.budget) obj.budget *= Math.pow(10, up);
        if (obj.dayBudget) obj.dayBudget *= Math.pow(10, up);
        if (obj.price) {
            if (obj.price.action) obj.price.action *= Math.pow(10, up);
            if (obj.price.banner) obj.price.banner *= Math.pow(10, up);
            if (obj.price.vert_img) obj.price.vert_img *= Math.pow(10, up);
            if (obj.price.horz_img) obj.price.horz_img *= Math.pow(10, up);
        }
        if (obj.debit) obj.debit *= Math.pow(10, up);
        return obj;
    } catch (err) {
        logger.error(err);
        return false
    }
}