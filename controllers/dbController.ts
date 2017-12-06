///<reference path="../typings/tsd.d.ts"/>
import {MongoService} from "../services/MongoService";
import {getLogger} from "log4js";
import {varInterfaces} from "../entity/varInterfaces";
import {Users, User, UserDocument} from "../entity/mongoModels/userModel";
import {AdvCampaign, AdvCampaigns, AdvCampaignIface, AdvDocument} from "../entity/mongoModels/advCampaigns";
import {AdvCache, AdvCaches, AdvCacheDocument} from "../entity/mongoModels/advCache";
import {Platform, Platforms, PlatformDocument} from "../entity/mongoModels/platforms";
import {Abuse, Abuses, AbuseDocument} from "../entity/mongoModels/abuse";
import {Payment, Payments, paymertIface, PaymentDocument} from "../entity/mongoModels/payments";
import {Sessioins, Session, SessionDocument} from "../entity/mongoModels/session";
import {Types} from "mongoose";
import Q = require('q');
let logger = getLogger('dbController');
var dbPlatform:MongoService<PlatformDocument> = new MongoService<PlatformDocument>(Platforms);
var dbUser:MongoService<UserDocument> = new MongoService<UserDocument>(Users);
var dbAdv:MongoService<AdvDocument> = new MongoService<AdvDocument>(AdvCampaigns);
var dbAdvCache:MongoService<AdvCacheDocument> = new MongoService<AdvCacheDocument>(AdvCaches);
var dbAbuse:MongoService<AbuseDocument> = new MongoService<AbuseDocument>(Abuses);
var dbPayment:MongoService<PaymentDocument> = new MongoService<PaymentDocument>(Payments);
var dbSessions:MongoService<SessionDocument> = new MongoService<SessionDocument>(Sessioins);

interface getStartedCampaignsCondInterface {
    status:string;
    _id?:any;
}

class DbController {
    constructor() {
    }

    /** ===========  User section ====================== */
    public getUserById(id:string) {
        return dbUser.findById(id);
    };

    public createNewUser(user:varInterfaces.User) {
        return dbUser.create(user);
    };

    public getUser(user:varInterfaces.User) {
        return dbUser.findOne(user);
    };

    public getAllUsers():Promise<User[]> {
        return dbUser.find({});
    }

    public getUserId(_id:string):Promise<string> {
        var deferred = Q.defer();
        logger.trace('_getUserId got ', _id);
        dbUser.findOne({_id: _id})
            .then(function (user) {
                if (user) {
                    deferred.resolve(user._id.toString());
                } else {
                    deferred.reject({error: 'no such user'});
                }
            })
            .catch(function (err) {
                logger.error(err);
                deferred.reject(err);
            });
        return deferred.promise;
    };

    public updateUserById(id:string, updateFields:Object):Promise<User> {
        return dbUser.findByIdAndUpdate(id, updateFields);
    }

    /** ========================= Abuse section ============================== */
    public setAbuse(userId:string, subject:string, message:string):Promise<Abuse> {
        return dbAbuse.create({userId: userId, subject: subject, message: message});
    }

    /** ========================= Adv section  =============================== */

    public addAdvCampaign(obj:AdvCampaign):Promise<AdvCampaignIface> {
        if (!obj.budget) obj.budget = 0;
        return dbAdv.create(obj);
    };

    public setFieldAdvCampaign(conditions:{owner?:string, _id:string}, updateField:any):Promise<AdvCampaignIface> {
        var deferred = Q.defer();
        dbAdv.findAndUpdate(conditions, {$set: updateField})
            .then(function (data) {
                if (!data) throw {error: 'there is no such campaign'};
                //     logger.info('answer of update campaign', data);
                deferred.resolve(data)
            })
            .catch(function (err) {
                logger.error(err);
                deferred.reject(err);
            });
        return deferred.promise;
    };

    public addMoneyToCampaign(conditions:{owner?:string, _id:string}, sum:number):Promise<AdvCampaignIface> {
        return dbAdv.findAndUpdate(conditions, {$inc: {budget: sum}});
    }

    // public removeAdvCampaign(owner:string, campaignId:string):Promise<AdvCampaign> {
    //     var deferred = Q.defer();
    //     dbAdv.findOne({_id: campaignId})
    //         .then(function (campaign) {
    //             logger.trace('campaign:', campaign);
    //             if (!campaign) throw {error: 'no campaign with such ID'};
    //             return dbUser.findByIdAndUpdate(owner, {$inc: {budget: campaign.budget}})
    //         })
    //         .then(function (trigger) {
    //             if (!trigger) throw {error: 'budget incrementation fail'};
    //             return dbAdv.remove({_id: campaignId});
    //         })
    //         .then(function (trigger) {
    //             if (!trigger) throw {error: 'deletion of campaign was unsuccessful', id: campaignId};
    //             deferred.resolve(true);
    //         })
    //         .catch(function (err) {
    //             logger.error(err);
    //             deferred.reject(err);
    //         });
    //     return deferred.promise;
    // };

    public getAdvCamapaignsByOwner(owner:string):Promise<AdvCampaignIface[]> {
        var conditions:Object;
        conditions = {owner: owner};
        return dbAdv.find(conditions);

    };

    public getWorkingCampaigns():Promise<AdvCampaign[]> {
        var conditions = {status: {$ne: 'finished'}};
        //if (haveAlready && haveAlready.length) conditions._id = {$nin: haveAlready};
        logger.info('conditions for getWorkingCampaigns:', conditions);
        return dbAdv.find(conditions, {statistic: 0, __v: 0});
    };
    
    //public getAllCampaigns
    public getFinishedCampaignsWithBudget():Promise<AdvCampaign[]> {
        var conditions = {status: 'finished', budget: {$ne: 0}};
        //if (haveAlready && haveAlready.length) conditions._id = {$nin: haveAlready};
        logger.info('conditions for getFinishedCampaignsWithBudget:', conditions);
        return dbAdv.find(conditions, {statistic: 0, __v: 0});
    };

    public addAdvCacheRecord(newRec:AdvCache):Promise<AdvCache> {
        try {
            delete newRec._id;
            newRec.cache = [];
        } catch (err) {
            logger.warn(err)
        }
        return dbAdvCache.create(newRec);

    }

    public getAdv(conditions:AdvCampaignIface):Promise<AdvCampaignIface> {
        return dbAdv.findOne(conditions);

    };

    public spendAdvCampaignMoney(id:string, budget:number):Promise<AdvCampaignIface> {
        return dbAdv.findByIdAndUpdate(id, {$inc: {budget: budget * -1}});
    };

    public addAdvStatistic(campaignId:string, statistic:{
        appType?:string
        platformName:string,
        age?:string,
        gender?:string,
        country?:string,
        banner:boolean ,
        vert_img:boolean,
        horz_img:boolean,
        action?:number}):Promise<boolean> {
        var deferred = Q.defer();
        dbAdv.findByIdAndUpdate(campaignId, {$push: {statistic: statistic}})
            .then(function (answer) {
                if (answer) {
                    //     logger.info('statistic added', answer);
                    deferred.resolve(true)
                } else deferred.reject({error: 'something goes wrong - statistic'})

            })
            .catch(function (err) {
                logger.error(err);
                deferred.reject(err);
            });
        return deferred.promise;
    };

    /** ================== advCache section ============================= */
    public geAdvCache():Promise<AdvCache[]> {
        return dbAdvCache.find({}, {__v: 0});
    };

    public getCacheByCampaignId(campaignId):Promise<AdvCache> {
        return dbAdvCache.findOne({campaignId: campaignId}, {__v: 0});
    }

    public setFieldAdvCache(campaignId:string, update:Object):Promise<AdvCache> {
        return dbAdvCache.findAndUpdate({campaignId: campaignId}, {$set: update});
    }

    public incFieldAdvCache(campaignId:string, update:Object):Promise<AdvCache> {
        logger.trace('incFieldAdvCache got:  campaignId:', campaignId, ' update:', update);
        return dbAdvCache.findAndUpdate({campaignId: campaignId}, {$inc: update});
    }

    public clearAdvCaheRecord(_id:string, uid:string):Promise<boolean> {
        var deferred = Q.defer();
        dbAdvCache.findAndUpdate({campaignId: _id}, {$pull: {cache: uid}})
            .then(function (answer) {
                if (answer) deferred.resolve(true);
                else deferred.reject({error: 'no such record'});
            })
            .catch(function (err) {
                logger.error(err);
                deferred.reject(err);
            });

        return deferred.promise;
    }

    public setAdvCacheRecord(campaignId:string, reservSum:number, uid:string):Promise<boolean> {
        var deferred = Q.defer();
        logger.trace(campaignId);
        dbAdvCache.findAndUpdate({campaignId: campaignId}, {$inc: {wallet: reservSum}, $push: {cache: uid}})   //, {upsert: true}
            .then(function (data) {
                logger.debug('setAdvCacheRecord answer:', data);
                if (data) deferred.resolve(true);
                else deferred.resolve(false);
            })
            .catch(function (err) {
                logger.error('setAdvCacheRecord ERROR: ', err);
                deferred.resolve(false);
            });
        return deferred.promise;
    };

    public returnChangeAdvCache(campaignId:string, change:number):Promise<boolean> {
        var deferred = Q.defer();
        dbAdvCache.findAndUpdate({campaignId: campaignId}, {$inc: {wallet: change}})   //, {upsert: true}
            .then(function (data) {
                logger.debug('returnChangeAdvCache answer:', data);
                if (data) deferred.resolve(true);
                else deferred.resolve(false);
            })
            .catch(function (err) {
                logger.error('setAdvCacheRecord ERROR: ', err);
                deferred.reject(err);
            });

        return deferred.promise;
    };

    public deleteAdvCache(campaignId:string):Promise<boolean> {
        var deferred = Q.defer();
        dbAdvCache.remove({campaignId: campaignId})
            .then(function (value) {
                deferred.resolve(true);
            })
            .catch(function (err) {
                logger.error('deleteAdvCache ERROR:', err);
                deferred.reject(false);
            });
        return deferred.promise;
    };

    /** ======================== Platform section ====================== */
    public getAllPlatforms():Promise<Platform[]> {
        return dbPlatform.find({});
    };

    public setPlatform(name:string, imgLink:string):void {
        dbPlatform.findAndUpdate({platformName: name}, {imgLink: imgLink}, {upsert: true})
            .catch(function (err) {
                logger.error(err);
            });
    };

    public getPlatformByName(name:string):Promise<Platform> {
        return dbPlatform.findOne({platformName: name})
    };

    public getAdvStatistic(campaignId:string):Promise<varInterfaces.advStatistic> {
        var deferred = Q.defer();
        var my = this;
        var agrObj = [{$match: {_id: new Types.ObjectId(campaignId)}}
            , {$project: {statistic: 1}}
            , {$unwind: {'path': '$statistic'}}
            , {
                $project: {
                    _id: 0,
                    banner: {$cond: ['$statistic.banner', 1, 0]},
                    vert_img: {$cond: ['$statistic.vert_img', 1, 0]},
                    horz_img: {$cond: ['$statistic.horz_img', 1, 0]},
                    action: {$cond: ['$statistic.action', 1, 0]},
                    platformName: '$statistic.platformName'
                }
            }
            , {
                $group: {
                    _id: '$platformName',
                    banner: {$sum: '$banner'},
                    vert_img: {$sum: '$vert_img'},
                    horz_img: {$sum: '$horz_img'},
                    action: {$sum: '$action'}
                },

            }
        ];
        dbAdv.aggregate(agrObj)
            .then(function (stat) {
                //   logger.info('stast', stat);
                my.getPlatforms()
                    .then(function (platforms) {
                        // logger.trace('platforms:', platforms);
                        var statAnswer = {
                            stages: function (statArr) {
                                var resultArr = [0, 0, 0, 0];
                                statArr.forEach(function (cell) {
                                    if (cell.banner) resultArr[0] += cell.banner;
                                    if (cell.vert_img) resultArr[1] += cell.vert_img;
                                    if (cell.horz_img) resultArr[2] += cell.horz_img;
                                    if (cell.action) resultArr[3] += cell.action;
                                });
                                return resultArr;
                            }(stat),
                            apps: function (statArr, platformsArr) {
                                var resultArr = [];
                                statArr.forEach(function (cell) {
                                    /** todo add limit of 5 platforms */
                                    for (var i = 0; i < platformsArr.length; i++) {
                                        if (cell._id == platformsArr[i].platformName) resultArr.push(platformsArr[i].imgLink);
                                    }
                                });
                                return resultArr;
                            }(stat, platforms),
                            appsTotal: stat.length
                        };
                        logger.debug('statistic for', campaignId, 'is:', statAnswer);
                        deferred.resolve(statAnswer);
                    })
                    .catch(function (err) {
                        logger.error('getAdvStatistic 2 ERROR', err);
                        deferred.reject({error: {code: 500, message: 'internal server error'}});
                    });
            })
            .catch(function (err) {
                logger.error('getAdvStatistic 1 ERROR', err);
                deferred.reject({error: {code: 500, message: 'internal server error'}});
            });
        return deferred.promise;
    }

    private getPlatforms():Promise<Platform[]> {
        return dbPlatform.find({});
    }

    /** ====================== Payment section ========================= */
    public addPayment(payment:paymertIface):Promise<Payment> {
        payment.payDate = new Date();
        return dbPayment.create(payment)
    }

    /** session section */
    public validateSession(ssId:string):Promise<Session> {
        return dbSessions.findOne({_id: ssId, expires: {$gte: new Date()}}, {_id:0, expire:0});
    }
}


export var dbController:DbController = new DbController();

