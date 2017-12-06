///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from "log4js";
import * as Q from "q";
import {AdvCampaign, AdvCampaignIface} from "../entity/mongoModels/advCampaigns";
import {dbController} from "./dbController";
import {AdvCache} from "../entity/mongoModels/advCache";
import {config} from "../config/appConfig";
import {v4} from "uuid";
import {varInterfaces} from "../entity/varInterfaces";
import {EventEmitter} from "events";
import {changeAdvNumbers} from "../tools/advMultiplier";
import {amqpController} from "./amqpController";
import {socketIoController} from "./socketIoController";
import {cronController} from "./cronController";
import * as _ from "underscore";
import {fsController} from "./fsController";
import {isNull} from "util";
let logger = getLogger('advController');

import mongoose = require("mongoose");
import amqp = config.amqp;
import myAdvCampaigns = varInterfaces.myAdvCampaigns;
import get = Reflect.get;

let defaultStatisticElement = {
    stages: [0, 0, 0, 0],
    apps: [],
    appsTotal: 0
};

interface cacheIface {
    [index:string]:AdvCache;
}
interface workingCampaignsIface {
    [index:string]:workingCampaignElementIface
}

interface workingCampaignElementIface {
    owner:string;
    budget:number;
    dayBudget:number;
    reserveSum:number;
}

interface platformClientCount {[index:string]:number
}

interface campaignReservationAnswer {
    uid:string;
    status:boolean;
}
class AdvController extends EventEmitter {
    public cache:cacheIface = {};
    public workingCampaignsStatistic:varInterfaces.advStatisticObj = {};
    private workingCampaigns:workingCampaignsIface;
    private workingCampaignsArr:AdvCampaignIface[] = [];
    private platformClientsTotalCount:{[index:string]:number} = {};
    private pctcStorage:{[index:string]:{platforms?:platformClientCount, res:any, timeout?:any}} = {};


    constructor() {
        super();
        this.workingCampaigns = {};
        this.cache = {};
        //  this.init()
    }

    public init():void {
        var my = this;
        my._setLocalWorkingCampaigns()
            .then(function () {
                logger.info('_setLocalWorkingCampaigns done');
                return my._setLocalCampaignStatistic();
            })
            .then(function () {
                logger.info('_setLocalCampaignStatistic done');
                return my._setLocalAdvCache();
            })
            .then(function () {
                logger.info('_setLocalAdvCache done');
                return my._setCronJobs(my.workingCampaignsArr);
            })
            .catch(function (err) {
                logger.error('INIT ERROR:', err);
            });
    }

    private _setLocalWorkingCampaigns():Promise<boolean> {
        var my = this;
        var deferred = Q.defer();
        dbController.getWorkingCampaigns()
            .then(function (campaigns:AdvCampaign[]) {
                if (campaigns && campaigns.length) {
                    /** todo add statistic */
                    my.workingCampaignsArr = campaigns;
                    campaigns.forEach(function (cell) {
                        my.workingCampaigns[cell._id] = my.getWorkingCampaignElement(cell);
                    })
                } else {
                    my.workingCampaignsArr = [];
                }
                deferred.resolve(true);
            })
            .catch(function (err) {
                logger.error('_setLocalWorkingCampaigns ERROR:', err);
                deferred.reject(false);
            });
        return deferred.promise;
    }

    private _setLocalCampaignStatistic():Promise<boolean> {
        logger.trace('_setLocalCampaignStatistic started');
        var deferred = Q.defer();
        var my = this;
        var count = 0;
        //  dbController.getAdvCamapaignsByOwner()
        if (my.workingCampaignsArr.length) {
            my.workingCampaignsArr.forEach(function (cell) {
                my.workingCampaignsStatistic[cell._id] = defaultStatisticElement;
            });
            startAction(my.workingCampaignsArr[count]._id);
        } else deferred.resolve('true');

        function startAction(campaignId:string) {
            dbController.getAdvStatistic(campaignId)
                .then(function (stat) {
                    if (stat) my.workingCampaignsStatistic[campaignId] = stat;
                    else my.workingCampaignsStatistic[campaignId] = defaultStatisticElement;
                    if (count < my.workingCampaignsArr.length - 1) {
                        count++;
                        startAction(my.workingCampaignsArr[count]._id);
                    } else {
                        deferred.resolve(true);
                    }
                })
                .catch(function (err) {
                    logger.error('_setLocalCampaignStatistic ERROR: ', err);
                    if (count < my.workingCampaignsArr.length - 1) {
                        count++;
                        startAction(my.workingCampaignsArr[count]._id);
                    } else {
                        deferred.resolve(true);
                    }
                });
        }

        return deferred.promise;
    }

    private getWorkingCampaignElement(campaign:AdvCampaignIface):workingCampaignElementIface {
        var dayBudget:number = campaign.dayBudget ? campaign.dayBudget : campaign.budget;
        return {
            owner: campaign.owner,
            budget: campaign.budget,
            dayBudget: dayBudget,
            reserveSum: this._getAdvSum(campaign)
        };
    }

    private _setLocalAdvCache():Promise<boolean> {
        var my = this;
        var deferred = Q.defer();
        dbController.geAdvCache()
            .then(function (cache:AdvCache[]) {
                if (cache && cache.length) {
                    cache.forEach(function (cell) {
                        /** todo grep and calculate budget; if there is dayBudget, calculate it for new day; */
                        my.cache[cell.campaignId] = cell;
                    })

                }
                my.workingCampaignsArr.forEach(function (cell) {
                    if (!my.cache[cell._id]) {
                        var dayBudget:number;
                        if (!cell.dayBudget) dayBudget = cell.budget;
                        else dayBudget = cell.dayBudget;
                        my.cache[cell._id] = {
                            _id: '',
                            cache: [],
                            wallet: dayBudget,
                            campaignId: cell._id,
                            reserveSum: my._getAdvSum(cell)
                        };
                        dbController.addAdvCacheRecord(my.cache[cell._id])
                            .catch(function (err) {
                                logger.error(err);
                            })
                    }
                });
                logger.trace('initialisation complete');
                logger.debug('workingCampaigns:', my.workingCampaigns);
                logger.debug('workingCampaignsArr:', my.workingCampaignsArr);
                logger.debug('cache:', my.cache);
                deferred.resolve(true);
            })
            .catch(function (err) {
                logger.error(err);
            });
        return deferred.promise;
    }

    public recountDayBudget():void {
        var my = this;
        if (!my.cache || !my.workingCampaignsArr || !my.workingCampaignsArr.length || !my.workingCampaigns) {
            logger.warn('there are no working campaigns, nothing to recount');
            return;
        }
        for (var id in my.cache) {
            logger.debug('workingCampaigns:', my.workingCampaigns);
            logger.debug('workingCampaignsArr:', my.workingCampaignsArr);
            logger.debug('cache:', my.cache);
            if (my.workingCampaigns[id]) {
                if (my.cache[id].wallet < my.workingCampaigns[id].dayBudget) {
                    logger.trace('some money was spend on', id);
                    var dif = my.workingCampaigns[id].dayBudget - my.cache[id].wallet;
                    logger.trace('difference :', dif);
                    var diffCheck = my.workingCampaigns[id].budget - dif;
                    if (diffCheck > 0) {
                        my.cache[id].wallet = my.workingCampaigns[id].dayBudget - my.cache[id].cache.length * my.workingCampaigns[id].reserveSum;
                    } else {
                        my.cache[id].wallet = my.workingCampaigns[id].budget - my.cache[id].cache.length * my.workingCampaigns[id].reserveSum;
                    }
                    var wallet = my.cache[id].wallet;
                    dbController.setFieldAdvCache(my.cache[id].campaignId, {wallet: wallet})
                        .catch(function (err) {
                            logger.error('dbController.setFieldAdvCache ERROR:', err);
                        });
                }
            } else {
                dbController.deleteAdvCache(my.cache[id].campaignId)
                    .then(function () {
                        delete my.cache[id];
                    })
                    .catch(function (err) {
                        logger.error(err);
                    });
            }
        }
    }

    private _setCronJobs(workingCampaignsArr:AdvCampaignIface[]):void {
        /** todo change finishing campaign */
        logger.trace('_setCronJobs started');
        workingCampaignsArr.forEach(function (cell) {
            var now = new Date().getTime();
            if (cell.status && cell.startDate && cell.status == 'pending' && Date.parse(cell.startDate) >= now) {
                logger.trace('try to add cron job to start campaign');
                cronController.changeAdvCampaignStatus({_id: cell._id, owner: cell.owner}, 'started', cell.startDate);
            }
            if (cell.status && cell.endDate && Date.parse(cell.endDate) >= now) {
                logger.trace('try to add cron job to start campaign');
                cronController.changeAdvCampaignStatus({_id: cell._id, owner: cell.owner}, 'finished', cell.endDate);
            }
        });
        cronController.advCacheRecount(this, this.recountDayBudget);
        cronController.calculateFinished(this, this.returnBalance)
    }

    private _getAdvSum(campaign:AdvCampaignIface):number {
        var sum:number = 0;
        for (var key in campaign.price) {
            sum += campaign.price[key] * 1000;
        }
        return sum / 1000;
    }

    public getWorkingCampaigns():AdvCampaignIface[] {
        logger.trace('workingCampaignsArr:', this.workingCampaignsArr);
        return this.workingCampaignsArr;//.map(function (cell) {
        // return changeAdvNumbers(cell, false);
        // });

    }

    private _setLocalStatisticVar(statElem:varInterfaces.debit):void {
        logger.info('_setLocalStatisticVar got', statElem);
        if (statElem.statistic.banner) this.workingCampaignsStatistic[statElem.campaignId].stages[0] += 1;
        if (statElem.statistic.vert_img) this.workingCampaignsStatistic[statElem.campaignId].stages[1] += 1;
        if (statElem.statistic.horz_img) this.workingCampaignsStatistic[statElem.campaignId].stages[2] += 1;
        if (statElem.statistic.action) this.workingCampaignsStatistic[statElem.campaignId].stages[3] += 1;
        logger.trace('workingCampaignsStatistic :', this.workingCampaignsStatistic);
    }

    public debitCampaign(debitElem:varInterfaces.debit):void {
        var my = this;
        logger.trace('debitCampaign got:', debitElem);
        var indexOfCacheElement:number;
        try {
            indexOfCacheElement = my.cache[debitElem.campaignId].cache.indexOf(debitElem.uid);
            my._setLocalStatisticVar(debitElem);
            //  debitElem = changeAdvNumbers(debitElem, true);
            logger.trace('debit elem after saving numbers:', debitElem);
        } catch (err) {
            logger.error('ERROR on first stage of debiting', err);
        }
        if (debitElem && debitElem.campaignId && my.cache[debitElem.campaignId] && indexOfCacheElement >= 0) {
            dbController.spendAdvCampaignMoney(debitElem.campaignId, debitElem.debit)
                .then(function (updatedCampaign) {
                    //     logger.fatal('now budget campaign:', updatedCampaign.budget);
                    my.workingCampaigns[updatedCampaign._id].budget = updatedCampaign.budget;

                    var tCamp = _.where(my.workingCampaignsArr, {_id: updatedCampaign._id});
                    if (tCamp.length) tCamp[0].budget = updatedCampaign.budget;
                })
                .catch(function (err) {
                    logger.error(err);
                });
            var funcArr = [dbController.clearAdvCaheRecord(debitElem.campaignId, debitElem.uid),
                dbController.returnChangeAdvCache(debitElem.campaignId, my.cache[debitElem.campaignId].reserveSum - debitElem.debit)];
            if (debitElem.statistic && (debitElem.statistic.banner || debitElem.statistic.vert_img || debitElem.statistic.horz_img)) {
                if (!debitElem.statistic.cDate) debitElem.statistic.cDate = new Date();
                funcArr.push(dbController.addAdvStatistic(debitElem.campaignId, debitElem.statistic));
            }

            Q.all(funcArr)
                .then(function () {
                    try {
                        logger.trace('index of debited element is:', my.cache[debitElem.campaignId].cache.indexOf(debitElem.uid));
                        my.cache[debitElem.campaignId].cache.splice(my.cache[debitElem.campaignId].cache.indexOf(debitElem.uid), 1);
                        logger.trace('cache:', my.cache[debitElem.campaignId].cache);
                        logger.debug('debit:', debitElem.debit);
                        /** todo pause campaign if not enough money */
                        my.cache[debitElem.campaignId].wallet += my.cache[debitElem.campaignId].reserveSum - debitElem.debit;
                        logger.trace('budget:', my.cache[debitElem.campaignId].wallet);
                        if (my.cache[debitElem.campaignId].wallet < my.cache[debitElem.campaignId].reserveSum) {
                            my.changeStatus({
                                _id: debitElem.campaignId,
                                owner: my.workingCampaigns[debitElem.campaignId].owner
                            }, 'paused');
                        }
                        socketIoController.sendToCustomer('statUpdate', my.workingCampaigns[debitElem.campaignId].owner,
                            changeAdvNumbers({
                                _id: debitElem.campaignId,
                                budget: my.workingCampaigns[debitElem.campaignId].budget,
                                statistic: my.workingCampaignsStatistic[debitElem.campaignId]
                            }, false));
                    } catch (err) {
                        logger.error(err);
                    }

                })
                .catch(function (err) {
                    logger.error(err);
                });

        } else {
            logger.error('there is no such cache record with uid', debitElem.uid);
        }
    }

    public reserveAdv(_id:string, uid:string):Promise<campaignReservationAnswer> {
        var deferred = Q.defer();
        var my = this;
        if (this.workingCampaigns[_id]) {
            logger.info('cache wallet :', my.cache[_id].wallet, 'reservation summ:', my.cache[_id].reserveSum);
            if (my.cache[_id].wallet >= my.cache[_id].reserveSum) {
                logger.trace('have money for reserve');
                /** todo check availability of adv */
                dbController.setAdvCacheRecord(_id, my.cache[_id].reserveSum * -1, uid)
                    .then(function (data:boolean) {
                        logger.trace('answer of setAdvCacheRecord:', data);
                        //if (data) my.cache[_id].wallet = (my.cache[_id].wallet * 100 - my.workingCampaigns[_id].reserveSum * 100) / 100;
                        if (data) my.cache[_id].wallet -= my.cache[_id].reserveSum;
                        logger.debug('on campaign', _id, 'left ', my.cache[_id].wallet, 'for today');
                        //my.cache[_id].reserveSum = my.workingCampaigns[_id].reserveSum;
                        my.cache[_id].cache.push(uid);
                        deferred.resolve({uid: uid, status: data})
                    })
                    .catch(function (err) {
                        logger.error(err);
                        deferred.reject(err);
                    });

            } else {
                deferred.resolve({uid: uid, status: false});
            }
        } else {
            logger.debug('have no campaign with such id:', _id);
            deferred.resolve({uid: uid, status: false});
        }
        return deferred.promise;
    }

    public addCampaign(campaign:AdvCampaignIface):Promise<AdvCampaign> {
        var deferred = Q.defer();
        var my = this;
        logger.trace('incoming data for campaign:', campaign.price);
        // if debugMode ==  true  no checks will proceed
        if (!config.debugMode) {
            var check = my._checkCampaigmMetadata(campaign);
            if (check && check.error) {
                deferred.reject(check);
                return deferred.promise;
            }
        }
        my._spendMoneyForNewCompany(campaign.owner, campaign.budget)
            .then(function (budget) {
                if (budget) return my._prepareNewCampaign(campaign);
                else {
                    logger.error('debit budget was unsuccessful');
                    deferred.reject({error: {code: 500, message: 'debit budget was unsuccessful'}});
                    return deferred.promise;
                }
            })
            .then(dbController.addAdvCampaign)
            .then(function (createdCampaign:AdvCampaignIface) {
                //createdCampaign = JSON.parse(JSON.stringify(createdCampaign));
                logger.trace('campaign saved:', createdCampaign);
                my._setCronJobs([createdCampaign]);
                my.workingCampaignsStatistic[createdCampaign._id] = {
                    stages: [0, 0, 0, 0],
                    apps: [],
                    appsTotal: 0
                };
                if (!my._checkTragetingExist(createdCampaign)) createdCampaign.targeting = false;
                createdCampaign.statistic = my.workingCampaignsStatistic[createdCampaign._id];
                my.workingCampaigns[createdCampaign._id] = my.getWorkingCampaignElement(createdCampaign);
                my.workingCampaignsArr.push(createdCampaign);
                /** todo may be change this string to real adding cache element */
                my._setLocalAdvCache();
                amqpController.sendAdvChanges(createdCampaign);
                var createdCampaignToFront = changeAdvNumbers(createdCampaign, false);
                //logger.debug('c:', createdCampaignToFront);
                socketIoController.sendToCustomer('campaignNew', createdCampaign.owner, createdCampaignToFront);
                deferred.resolve(createdCampaign);
            })
            .catch(function (err) {
                logger.error('addCampaign ERROR:', err);
                if (err && err.error && err.error.code) deferred.resolve(err);
                else deferred.resolve({error: {code: 500, message: 'Campaign save failed'}})
            });
        return deferred.promise;
    }

    private _checkTragetingExist(campaign:AdvCampaignIface):boolean {
        if (campaign.targeting) {
            return !(!campaign.targeting.gender && (!campaign.targeting.age || !campaign.targeting.age.length) && (!campaign.targeting.country || !campaign.targeting.country.length))
        } else {
            return false;
        }
    }

    private _spendMoneyForNewCompany(userId:string, budget:number):Promise<boolean> {
        var deferred = Q.defer();
        logger.trace('_spendMoneyForNewCompany started, budget:', budget);
        // if debugMode enabled money will not bee spend from users's  wallet
        if (config.debugMode) {
            logger.info('debug mode is enabled, no money will spend');
            deferred.resolve(true);
        } else {
            dbController.getUserById(userId)
                .then(function (user) {
                    logger.trace('user', user.username, 'have', user.wallet / 1000, 'bax');
                    if (user && user.wallet >= budget * 1000) {
                        logger.trace('user have enough money for this');
                        return dbController.updateUserById(userId, {$set: {wallet: user.wallet - budget * 1000}})
                    } else {
                        deferred.reject({error: {code: 411, message: 'you have not enough money for such budget'}});
                    }
                })
                .then(function (updatedUser) {
                    if (updatedUser) deferred.resolve(true);
                    else deferred.resolve(false);
                })
                .catch(function (err) {
                    logger.error(err);
                });
        }
        return deferred.promise;
    }

    private _prepareNewCampaign(newCampaign:AdvCampaignIface):Promise<AdvCampaignIface> {
        //  logger.trace('_prepareNewCampaign incoming:', newCampaign);
        var deferred = Q.defer();
        var imgArr = [];
        newCampaign = changeAdvNumbers(newCampaign, true);
        if (!newCampaign.startDate || (new Date().getTime() > new Date(newCampaign.startDate).getTime())) newCampaign.status = 'started';
        else newCampaign.status = 'pending';
        for (var key in newCampaign) {
            if (typeof newCampaign[key] == 'string' && newCampaign[key].search(/data:image\/\w+;base64/) >= 0) imgArr.push(this._saveImages(newCampaign[key], key, newCampaign.owner));
        }
        if (imgArr.length) {
            Q.all(imgArr)
                .then(function (imgArr:{path:string, key:string}[]) {
                    logger.info('imgNames', imgArr);
                    imgArr.map(function (cell) {
                        newCampaign[cell.key] = cell.path;
                    });
                    logger.trace('prepared campaign :', newCampaign);
                    deferred.resolve(newCampaign);
                })
                .catch(function (err) {
                    logger.error('save images ERROR:', err);
                    deferred.resolve(newCampaign);
                })
        } else {
            deferred.resolve(newCampaign);
        }
        return deferred.promise;
    }

    private _checkCampaigmMetadata(checingCampaign:AdvCampaignIface) {
        var answer:any = true;
        var errors = [];
        try {
            if (!checingCampaign.banner || !checingCampaign.price.banner) errors.push('banner data problem');
            if (!checingCampaign.vert_img || !checingCampaign.price.vert_img) errors.push('vert_img data problem');
            if ((checingCampaign.horz_img && !checingCampaign.price.horz_img) || (!checingCampaign.horz_img && checingCampaign.price.horz_img)) errors.push('horz_img data problem');

            if (checingCampaign.btnColor && checingCampaign.btnColor == '05C3F9' &&
                checingCampaign.btnTxt && checingCampaign.btnTxt == 'GO' && !checingCampaign.price.action) {
                delete checingCampaign.btnColor;
                delete checingCampaign.btnTxt;
            }
            if (checingCampaign.btnColor
                || checingCampaign.btnTxt
                || checingCampaign.action.actionType
                || checingCampaign.action.data
                || checingCampaign.price.action) {
                if (!checingCampaign.btnColor
                    || !checingCampaign.btnTxt
                    || !checingCampaign.action.actionType
                    || !checingCampaign.action.data
                    || !checingCampaign.price.action) {
                    errors.push('action data problems');
                }
            } else if ((checingCampaign.btnColor && checingCampaign.btnColor == '05C3F9')
                && (checingCampaign.btnTxt && checingCampaign.btnColor == 'GO')
                && !checingCampaign.action.actionType) {
                logger.trace('got only default data in action block');
                delete checingCampaign.btnColor;
                delete checingCampaign.btnTxt;
            }
            if (!checingCampaign.budget) errors.push('no budget in campaign');
            var now = new Date().getTime();
            if (!checingCampaign.endDate) errors.push('no endDate present');
            else {
                var end = new Date(checingCampaign.endDate).getTime();
                if (now >= end) errors.push('endData less then now');
                if (checingCampaign.startDate) {
                    var start = new Date(checingCampaign.startDate).getTime();
                    if (start > end) errors.push('frontEnd don\'t check errors at all');
                } else {
                    checingCampaign.startDate = new Date().toISOString();
                }
            }
            if (checingCampaign.action && checingCampaign.action.actionType == 'youtube') {
                checingCampaign.action.data = youtube_parser(checingCampaign.action.data);//checingCampaign.action.data.replace(/^https:\/\/www\.youtube\.com\/watch\?v=/, '');
                if (!checingCampaign.action.data || checingCampaign.action.data.length != 11) errors.push('check your youtube link');
                logger.trace('youtube link:', checingCampaign.action.data);
            }
            if (checingCampaign.btnColor) {
                var color = checingCampaign.btnColor.match(/[\da-fA-F]{6}/);
                if (color) {
                    checingCampaign.btnColor = '#' + color[0];
                } else errors.push('check button color');
            }

        } catch (err) {
            logger.error('_checkCampaigmMetadata ERROR:', err);
            errors.push('internal server error');
        }
        // logger.debug('checked adv:', checingCampaign);
        if (errors.length) answer = {error: {code: 306, message: errors.toString()}};
        return answer;

        function youtube_parser(url) {
            var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
            var match = url.match(regExp);
            console.log(match);
            return (match && match[7].length == 11) ? match[7] : false;
        }
    }

    private _saveImages(obj:string, keyName:string, owner:string):Promise<string> {
        var deferred = Q.defer();
        var month = new Date().getMonth() + 1;
        fsController.saveToPublic('images/' + owner + '/' + month, Math.random().toString(36).substring(7), obj)
            .then(function (fullPath) {
                if (fullPath) deferred.resolve({path: fullPath, key: keyName});
                else  deferred.resolve(obj);
            })
            .catch(function (err) {
                logger.error(err);
                deferred.resolve(obj);
            });
        return deferred.promise;
    }

    public changeCampaign(conditions:{owner?:string, _id:string}, updateField:AdvCampaignIface):Promise<AdvCampaignIface> {
        var deferred = Q.defer();
        var my = this;
        var campaignCheck:string = '';
        logger.debug('fields for update:', updateField);
        dbController.getAdv(conditions)
            .then(function (campaign) {
                if (!campaign) {
                    logger.warn('there is no campaign with such conditions:', conditions);
                    throw {error: {code: 408, message: 'no such campaign'}};
                }
                campaignCheck = campaign.status;
                if (updateField.owner) delete updateField.owner;
                if (campaign.status == 'pending') {
                    return my._changePendingCampaign(conditions, updateField);
                } else if (campaign.status != 'finished') {
                    return my._changeStartedCampaig(conditions, updateField);
                } else throw {error: {code: 300, message: 'campaign finished and can\'t be changed'}};
                //    return dbController.setFieldAdvCampaign(conditions, changeAdvNumbers(updateField, true));
            })
            .then(function (updatedCampaign) {
                var advToCustomer = changeAdvNumbers(updatedCampaign, false);
                amqpController.sendAdvChanges(updatedCampaign);
                advToCustomer.statistic = my.workingCampaignsStatistic[advToCustomer._id];
                if (campaignCheck === 'pending') {
                    amqpController.sendAdvChanges(advToCustomer);
                    cronController.changeAdvCampaignStatus({
                        _id: updatedCampaign._id,
                        owner: updatedCampaign.owner
                    }, 'finished', updatedCampaign.endDate);
                    cronController.changeAdvCampaignStatus({
                        _id: updatedCampaign._id,
                        owner: updatedCampaign.owner
                    }, 'started', updatedCampaign.startDate);
                }
                logger.debug('send updated campaign to client:', advToCustomer);
                socketIoController.sendToCustomer('campaignChange', advToCustomer.owner, advToCustomer);
                deferred.resolve(advToCustomer);
            })
            .catch(function (err) {
                logger.error(err);
                if (err && err.error && err.error.status) deferred.resolve(err);
                else deferred.reject({error: {code: 500, message: 'campaign update failed'}});
            });

        return deferred.promise;
    }

    private _changePendingCampaign(conditions:{owner?:string, _id:string}, updateField:AdvCampaignIface):Promise<AdvCampaignIface> {
        logger.trace('_changePendingCampaign started and got:', updateField);
        var deferred = Q.defer();
        var my = this;
        var check = this._checkCampaigmMetadata(updateField);
        if (check && check.error) {
            deferred.reject(check);
            return deferred.promise;
        }
        dbController.getAdv(conditions)
            .then(function (oldCampaign) {
                if (updateField.budget && updateField.budget != oldCampaign.budget) {
                    return my._spendMoneyForNewCompany(conditions.owner, (updateField.budget * 1000 - oldCampaign.budget) / 1000);
                } else return true;
            })
            .then(function (checkBudget) {
                if (checkBudget) {
                    if (updateField._id) delete updateField._id;
                    if (updateField.owner) delete updateField.owner;
                    return my._prepareNewCampaign(updateField);
                } else throw {error: {code: 500, message: 'something goes wrong on changing budget'}};
            })
            .then(function (checkedAdv) {
                return dbController.setFieldAdvCampaign(conditions, checkedAdv);
            })
            .then(function (updatedCampaign) {
                if (updatedCampaign) {
                    deferred.resolve(updatedCampaign);
                } else throw {error: {code: 500, message: 'something goes wrong on updating campaign'}}
            })
            .catch(function (err) {
                logger.error(err);
            });
        return deferred.promise;
    }

    private _changeStartedCampaig(conditions:{owner?:string, _id:string}, updateField:AdvCampaignIface):Promise<AdvCampaignIface> {
        logger.trace('_changeStartedCampaig started');
        var deferred = Q.defer();
        var my = this;
        var qArr = [];
        // var upd:any = {};
        if (updateField.endDate) {
            //upd.endDate = updateField.endDate;
        }
        if (updateField.dayBudget && my.workingCampaigns[conditions._id].dayBudget && my.workingCampaigns[conditions._id].dayBudget != updateField.dayBudget * 1000) {
            logger.trace('change of day budget');
            qArr.push(changeDayBudget(conditions, updateField.dayBudget * 1000));
        }
        if (updateField.chargeBudget) {
            logger.trace('charge dayBudget');
            qArr.push(chargeBudget(conditions.owner, updateField.chargeBudget))
        }
        if (qArr.length) {
            Q.all(qArr)
                .then(function () {
                    for (var j = 0; j < my.workingCampaignsArr.length; j++) {
                        if (my.workingCampaignsArr[j]._id == conditions._id) {
                            my.workingCampaignsArr[j].statistic = my.workingCampaignsStatistic[conditions._id];
                            deferred.resolve(my.workingCampaignsArr[j]);
                        }
                    }
                })
                .catch(function (err) {
                    logger.error('Q.all ERROR:', err);
                    deferred.reject({error: {code: 500, message: 'something goes wrong on updating'}});
                });
        }


        function changeDayBudget(conditions:{owner?:string, _id:string}, dayBudget:number) {
            var deferred = Q.defer();
            logger.debug('changeDayBudget started, new dayBudget is:', dayBudget);
            if (typeof dayBudget != 'number') throw 'wrong metadata';
            dbController.setFieldAdvCampaign(conditions, {dayBudget: dayBudget})
                .then(function (adv) {
                    if (adv) {
                        for (var i = 0; i < my.workingCampaignsArr.length; i++) {
                            if (my.workingCampaignsArr[i]._id == adv._id) {
                                my.workingCampaignsArr[i].dayBudget = dayBudget;
                                logger.debug('my.workingCampaignsArr[i] found:', my.workingCampaignsArr[i]);
                                break;
                            }
                        }
                        if (my.cache[adv._id]) {
                            logger.info('conditions:', conditions);
                            return dbController.incFieldAdvCache(conditions._id, {wallet: dayBudget - my.workingCampaigns[adv._id].dayBudget})
                        }
                    } else throw 'no such campaign found';
                })
                .then(function (cache) {
                    if (cache) {
                        my.cache[cache.campaignId].wallet += dayBudget - my.workingCampaigns[cache.campaignId].dayBudget;
                        if (my.workingCampaigns[cache.campaignId]) my.workingCampaigns[cache.campaignId].dayBudget = dayBudget;
                        logger.info('my.cache', my.cache);
                        logger.info('my.workingCampaign', my.workingCampaigns);
                        logger.info('my.workingCampaignsArr', my.workingCampaignsArr);
                        deferred.resolve(true);
                    } else throw 'no chache in DB';
                })
                .catch(function (err) {
                    logger.error('changeDayBudget ERROR', err);
                    deferred.reject(err);
                });


            //sd;sldks;dlk

            logger.debug('my.cache:', my.cache);
            return deferred.promise;
        }

        function chargeBudget(owner:string, sum:number) {
            var deferred = Q.defer();
            if (typeof sum != 'number') throw 'wrong metadata';
            my._spendMoneyForNewCompany(owner, sum)
                .then(function (b) {
                    logger.trace('_spendMoneyForNewCompany answer:', b);
                    if (b) {
                        return dbController.addMoneyToCampaign(conditions, updateField.chargeBudget * 1000);
                    } else {
                        throw {error: {code: 500, message: 'error on debiting money'}};
                    }
                })
                .then(function (cWithUpdatedBudget) {
                    logger.trace('budgetUpdated:', cWithUpdatedBudget.budget);
                    if (my.workingCampaigns[cWithUpdatedBudget._id]) my.workingCampaigns[cWithUpdatedBudget._id].budget = cWithUpdatedBudget.budget;
                    for (var i = 0; i < my.workingCampaignsArr.length; i++) {
                        if (my.workingCampaignsArr[i]._id == cWithUpdatedBudget._id) {
                            my.workingCampaignsArr[i].budget = cWithUpdatedBudget.budget;
                            logger.debug('my.workingCampaignsArr[i] found:', my.workingCampaignsArr[i]);
                            break;
                        }
                    }
                    deferred.resolve(cWithUpdatedBudget);
                })
                .catch(function (err) {
                    logger.error('chargeBudget ERROR:', err);
                    deferred.reject({error: {code: 500, message: 'internal server error'}});
                });
            return deferred.promise;
        }

        return deferred.promise;
    }

    public changeStatus(conditions:{_id:string, owner?:string}, status:string):Promise<AdvCampaign> {
        var my = this;
        var deferred = Q.defer();
        if (!status || config.campaignStatusArr.indexOf(status) < 0) {
            deferred.resolve({error: 'wrong incoming data'});
            return deferred.promise
        }
        dbController.getAdv(conditions)
            .then(function (campaign) {
                if (!campaign) {
                    logger.error('there is no campaign with such conditions:', conditions);
                    throw {error: 'no such campaign'};
                }
                if (campaign.status == 'finished') {
                    logger.warn('attempt to change finished campaign');
                    throw {error: 'campaign is finished'};
                }
                return dbController.setFieldAdvCampaign(conditions, {status: status})
            })
            .then(function (updatedCampaign) {
                if ((!updatedCampaign.targeting.age || !updatedCampaign.targeting.age.length)
                    && !updatedCampaign.targeting.gender
                    && (!updatedCampaign.targeting.country || !updatedCampaign.targeting.country.length)
                    && (!updatedCampaign.targeting.appType || !updatedCampaign.targeting.appType.length)
                ) updatedCampaign .targeting = false;
                
                if (updatedCampaign.statistic) delete updatedCampaign.statistic;
                if (status == 'finished') {
                    delete  my.workingCampaigns[updatedCampaign._id];
                    for (var i = 0; i < my.workingCampaignsArr.length; i++) {
                        if (updatedCampaign._id == my.workingCampaignsArr[i]._id) {
                            my.workingCampaignsArr.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    //  my.workingCampaigns[updatedCampaign._id] = updatedCampaign;
                    for (var i = 0; i < my.workingCampaignsArr.length; i++) {
                        logger.debug('my.workingCampaignsArr[i]._id:', my.workingCampaignsArr[i]._id, '   updatedCampaign._id', updatedCampaign._id);
                        if (my.workingCampaignsArr[i]._id == updatedCampaign._id) {
                            logger.trace('updated', my.workingCampaignsArr[i]._id, 'status:', my.workingCampaignsArr[i].status);
                            my.workingCampaignsArr[i] = updatedCampaign;
                            break;
                        }
                    }
                }
                //my.init();
                logger.info('my.workingCampaignsArr:', my.workingCampaignsArr);
                //  my.emit('changeStatus', updatedCampaign);
                updatedCampaign.statistic = my.workingCampaignsStatistic[updatedCampaign._id];
                socketIoController.sendToCustomer('campaignChange', updatedCampaign.owner, changeAdvNumbers(updatedCampaign, false));
                amqpController.sendAdvChanges(updatedCampaign);
                deferred.resolve(updatedCampaign);
            })
            .catch(function (err) {
                logger.error(err);
                deferred.reject(err);
            });
        return deferred.promise;
    }

    public getCampaign(owner:string, _id:string):Promise<AdvCampaign> {
        var deferred = Q.defer();
        dbController.getAdv({_id: _id, owner: owner})
            .then(function (campaign) {
                if (campaign) campaign = changeAdvNumbers(campaign, false);
                else deferred.resolve({error: 'no such campaign'});
                deferred.resolve(campaign);
            })
            .catch(function (err) {
                logger.error(err);
                deferred.reject({error: 'internal server error'});
            });
        return deferred.promise;
    }

    public getMy(owner:string):Promise<varInterfaces.myAdvCampaigns[]> {
        var deferred = Q.defer();
        var my = this;
        dbController.getAdvCamapaignsByOwner(owner)
            .then(function (campaigns) {
                if (campaigns && campaigns.length) {
                    var col = 0;
                    logger.trace('workingCampaignsStatistic', my.workingCampaignsStatistic);
                    campaigns.forEach(function (cell) {
                        dbController.getAdvStatistic(cell._id)
                            .then(function (stat) {
                                cell.statistic = stat;
                                if ((!cell.targeting.age || !cell.targeting.age.length)
                                    && !cell.targeting.gender
                                    && (!cell.targeting.country || !cell.targeting.country.length)
                                    && (!cell.targeting.appType || !cell.targeting.appType.length)
                                ) cell.targeting = false;
                                col++;
                                if (col == campaigns.length) {
                                    logger.debug('owner:', owner, '\nmyCampaigns:', campaigns);
                                    deferred.resolve(campaigns.map(function (camCell) {
                                        return changeAdvNumbers(camCell, false);
                                    }));
                                }
                            })
                            .catch(function (err) {
                                logger.error(err);
                            });


                    });
                } else deferred.resolve([])
            })
            .catch(function (err) {
                logger.error(err);
            });
        return deferred.promise;
    }

    public setPlatformIdent(campaignId:string, ident:{platformName:string, imgLink:string}):void {
        logger.info('id:', campaignId);
        logger.info('ident:', ident);
        dbController.setPlatform(ident.platformName, ident.imgLink);
        if (this.workingCampaignsStatistic[campaignId]) {
            logger.trace('have such working campaign statistics:', this.workingCampaignsStatistic[campaignId]);
            for (var i = 0; i < this.workingCampaignsStatistic[campaignId].apps.length; i++) {
                if (this.workingCampaignsStatistic[campaignId].apps[i] == ident.imgLink) break;
                else if (i == this.workingCampaignsStatistic[campaignId].apps.length - 1) {
                    this.workingCampaignsStatistic[campaignId].apps.push(ident.imgLink);
                    this.workingCampaignsStatistic[campaignId].appsTotal++;
                }
            }
            if (this.workingCampaignsStatistic[campaignId].apps.length == 0) {
                this.workingCampaignsStatistic[campaignId].apps.push(ident.imgLink);
                this.workingCampaignsStatistic[campaignId].appsTotal++;
            }
            for (var j = 0; j < this.workingCampaignsArr.length; j++) {
                if (this.workingCampaignsArr[j]._id == campaignId) {
                    var toCustomer = changeAdvNumbers(this.workingCampaignsArr[j], false);
                    if (!this._checkTragetingExist(toCustomer)) toCustomer.targeting = false;
                    toCustomer.statistic = this.workingCampaignsStatistic[campaignId];
                    socketIoController.sendToCustomer('campaignChange', toCustomer.owner, toCustomer);
                }
            }
        }
    }

    public returnBalance():void {
        logger.trace('returnBalance started');
        dbController.getFinishedCampaignsWithBudget()
            .then(function (fCampaigns) {
                logger.trace('got', fCampaigns.length, 'campaigns with some money');
                fCampaigns.forEach(function (cell) {
                    actionForOneCampaign(cell);
                })
            })
            .catch(function (err) {
                logger.error(err);
            });
        function actionForOneCampaign(adv:AdvCampaign) {
            logger.trace('try to get cache for:', adv._id, 'campaign');
            dbController.getCacheByCampaignId(adv._id)
                .then(function (cacheRecord) {
                    if (!isNull(cacheRecord) && cacheRecord && !cacheRecord.cache || !cacheRecord.cache.length) {
                        logger.trace('have total finished campaign:', adv.title);
                        dbController.updateUserById(adv.owner, {$inc: {wallet: adv.budget}})
                            .then(function (owner) {
                                if (owner) {
                                    return dbController.setFieldAdvCampaign({_id: adv._id}, {budget: 0});
                                } else throw 'no such user!!! ' + adv.owner;
                            })
                            .then(function (updAdv) {
                                if (updAdv) {
                                    socketIoController.sendToCustomer('campaignChange', updAdv.owner, changeAdvNumbers(updAdv, false));
                                    return dbController.deleteAdvCache(adv._id);
                                } else {
                                    logger.error('something goes on campaign update');
                                }
                            })
                            .then(function (over) {
                                if (!over) throw 'cache record was not deleted';
                                else logger.info('cache record was deleted')
                            })
                            .catch(function (err) {
                                logger.error(err);
                            });
                    }
                })
                .catch(function (err) {
                    logger.error(err);
                });
            //     return deferred.promise;
        }
    }

    public getPrediction(data:varInterfaces.reqBodygetClientsRequiestOptions, res:any):void {
        var uid = v4();
        this.pctcStorage[uid] = {platforms: {}, res: res};
        for (var key in data) {
            if (isNull(data[key]) || !data[key] || data[key] == '') delete data[key];
        }
        amqpController.reqForActiveClientsCount({uid: uid, data: data});
        var my = this;
        this.pctcStorage[uid].timeout = setTimeout(function () {
            my._responsePrediction(uid, true);
        }, 800)
    }

    private _responsePrediction(uid:string, byTimeout:boolean):void {
        logger.trace('_responsePrediction started, UID is', uid);
        var my = this;
        if (!uid || !this.pctcStorage[uid]) {
            logger.error('have no uid or no such element in storage, UID:', uid);
            return;
        }
        logger.warn('my.pctcStorage[uid]', my.pctcStorage[uid].platforms);
        if (byTimeout) {
            logger.trace('close by timeout');
            my.pctcStorage[uid].res.json(getSum(uid));
            delete my.pctcStorage[uid];
        } else {
            logger.trace('has wited for all known workers');
            if (Object.keys(my.pctcStorage[uid].platforms).length == Object.keys(my.platformClientsTotalCount).length) {
                my.pctcStorage[uid].res.json(getSum(uid));
                clearTimeout(this.pctcStorage[uid].timeout);
                delete my.pctcStorage[uid];
            }
        }
        function getSum(uid):any {
            try {
                var store = my.pctcStorage[uid].platforms;
                var sum = 0;
                for (var key in store) {
                    sum += store[key];
                }
                logger.debug('sum of UID:', uid, 'is', sum);
                return sum;
            } catch (err) {
                logger.error('getSum ERROR:', err);
                return {error: 'internal server error!'};
            }
        }
    }

    public countActiveClients(data:varInterfaces.clientCountResponse):void {
        if (!data) {
            logger.error('got empty data field');
            return;
        }
        if (data.uid == 'default') {
            this.platformClientsTotalCount[data.platform] = data.num;
        } else {
            if (this.pctcStorage[data.uid]) {
                this.pctcStorage[data.uid].platforms[data.platform] = data.num;
                this._responsePrediction(data.uid, false);
            }
        }

    }

    public _getTotalClientCount():void {
        amqpController.reqForActiveClientsCount();
    }
}

export var advController = new AdvController();
advController.init();
setTimeout(function () {
    advController._getTotalClientCount();
    setInterval(function () {
        advController._getTotalClientCount();
    }, 60000)
}, 1000);

