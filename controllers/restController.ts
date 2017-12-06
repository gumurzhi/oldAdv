import log4js = require('log4js');
let logger = log4js.getLogger('restController');
import Q = require('q');
import {dbController} from "./dbController";
import {amqpController} from "./amqpController";
import {AdvDocument, AdvCampaign, AdvCampaignIface} from "../entity/mongoModels/advCampaigns";
import {socketIoController} from "./socketIoController";
import {advController} from "./advController";
import {userController} from "./userController";
import {abuseController} from "./abuseController";
import {changeAdvNumbers} from '../tools/advMultiplier';
import mongoose = require("mongoose");
import get = Reflect.get;
amqpController.startRpcServerCampaignsList();
amqpController.startRpcServerAdvReservation();
amqpController.listenDebitExchange();
amqpController.listenSettedPlatform();
amqpController.resForActiveclientsCount();
interface Request extends Express.Request {
    sessionID?:string;
    body:any;
}
interface Response extends Express.Response {
    json:any;
}
interface changeAdvCampReqInterface extends Express.Request {
    body:{
        _id:string;
        update:AdvCampaignIface
    };
}
interface changeAdvCampStatusReqInterface extends Express.Request {
    body:{
        _id:string;
        status:string;
    };
}

interface removeCampaignReqInterface extends Express.Request {
    body:{
        _id:string;
    }
}

class MainController {
    constructor() {
    }

    // private getUserId(req:Request):Promise<string> {
    //     logger.trace('_getUserId called');
    //     var deferred = Q.defer();
    //     if (req.user && req.user.username) {
    //         logger.trace('try to get id of ', req.user.username);
    //         dbController.getUserId(req.user.username)
    //             .then(function (id) {
    //                 if (!id) {
    //                     deferred.reject({error: 'no such user'})
    //                 } else {
    //                     logger.trace('id is', id);
    //                     deferred.resolve(id);
    //                 }
    //             })
    //             .catch(function (err) {
    //                 logger.error(err);
    //                 deferred.reject(err);
    //             });
    //     } else {
    //         deferred.reject({error: 'there was no user in request'});
    //     }
    //     return deferred.promise;
    // };


    public addAdvCamp(req:Request, res:Response):void {
        logger.trace('try to add new advCampaign');
        if (req && req.body && req.user) {
            var newObj:AdvDocument = req.body;
            logger.trace('try to get ID for user', req.user.username);
            getUserId(req)
                .then(function (id) {
                    newObj.owner = id;
                    return advController.addCampaign(newObj);
                })
                .then(function (answer:AdvCampaign) {
                    logger.trace('campaign created');
                    res.json(answer);
                })
                .catch(function (err) {
                    logger.error(err);
                    sendError(err, res);
                });
        } else {
            res.json({error: {code: 406, message: 'something wrong with incoming data'}});
        }
    }

    public changeCampaignStatus(req:changeAdvCampStatusReqInterface, res:Response):void {
        logger.trace('method changeCampaignStatus called');
        if (req && req.body && req.body._id && req.body.status) {
            getUserId(req)
                .then(function (id) {
                    return advController.changeStatus({_id: req.body._id, owner: id}, req.body.status);
                })
                .then(function (changed) {
                    res.json(changed);
                })
                .catch(function (err) {
                    logger.error(err);
                    sendError(err, res);
                });
        } else {
            res.json({error: {code: 406, message: 'something wrong with incoming data'}});
        }
    }

    public changeAdvCamp(req:changeAdvCampReqInterface, res:Response):void {
        logger.trace('method changeAdvCamp called');
        if (req && req.body && req.body && req.body._id && req.user) {
            getUserId(req)
                .then(function (id) {
                    return advController.changeCampaign({owner: id, _id: req.body._id}, req.body);
                })
                .then(function (answer) {
                    logger.debug('changeAdvCamp returns:', answer);
                    res.json(answer);
                })
                .catch(function (err) {
                    logger.error(err);
                    sendError(err, res);
                });
        } else {
            logger.error('changeAdvCamp Error:', 'something wrong with incoming data');
            res.json({error: {code: 406, message: 'something wrong with incoming data'}});
        }
    }

    // public removeCampaign(req:removeCampaignReqInterface, res:Response):void {
    //     logger.trace('method changeAdvCamp called');
    //     if (req && req.body && req.body._id && req.user) {
    //         _getUserId(req)
    //             .then(function (id) {
    //                 return dbController.removeAdvCampaign(id, req.body._id);
    //             })
    //             .then(function (answer) {
    //                 res.json({status: 'success'});
    //             })
    //             .catch(function (err) {
    //                 logger.error(err);
    //                 res.json(err);
    //             });
    //     } else {
    //         res.json({error: 'something wrong with incoming data'});
    //     }
    // }

    public getMyCampaigns(req:Request, res:Response):void {
        //  var my = this;
        logger.trace('method getMyCampaigns called');
        if (req && req.user) {
            getUserId(req)
                .then(function (id) {
                    return advController.getMy(id);
                })
                .then(function (answerArr) {
                    logger.info('was found', answerArr.length, 'campaigns');
                    res.json(answerArr);
                })
                .catch(function (err) {
                    logger.error(err);
                    sendError(err, res);
                });
        } else {
            res.json({error: {code: 406, message: 'something wrong with incoming data'}});
        }
    }

    public getAdvCampaign(req:removeCampaignReqInterface, res:Response):void {
        logger.trace('method getAdvCampaign called');
        if (req && req.body && req.body._id) {
            getUserId(req)
                .then(function (id) {
                    return advController.getCampaign(id, req.body._id);
                })
                .then(function (campaign) {
                    if (campaign) {
                        res.json(campaign);
                    } else {
                        res.json({error: {code: 406, message: 'no such campaign'}});
                    }
                })
                .catch(function (err) {
                    logger.error(err);
                    sendError(err, res);
                });
        }
    }

    public getUserData(req:Request, res:Response):void {
        logger.trace('method getUserData called');
        if (req && req.user && req.user.username) {
            userController.getInfo(req.user.username)
                .then(function (user) {
                    if (user) res.json(changeAdvNumbers(user, false));
                    else res.json({error: 'no such user'});
                })
                .catch(function (err) {
                    logger.error('getUserData ERROR:', err);
                    sendError(err, res);
                });
        } else res.json({error: {code: 405, message: 'no user in request'}});
    }

    public createNewUser(req:Request, res:Response):void {
        userController.createNewUser(req.body)
            .then(function (answer) {
                if (answer) res.json(answer);
                else {
                    logger.error('something wrong on user creation');
                    res.json({error: {code: 500, message: 'internal server error'}});
                }
            })
            .catch(function (err) {
                logger.error(err);
                sendError(err, res);
            });
    };

    public logout(req:Request, res:Response):void {
        socketIoController.disconnectClient(req.sessionID);
        req.session.destroy(function (err) {
            if (err) logger.error('logout', err);
            res.json('ok');
        });
    }

    public getUserProfile(req:Request, res:Response):void {
        getUserId(req)
            .then(function (id) {
                return userController.getProfile(id);
            })
            .then(function (profile) {
                res.json(profile);
            })
            .catch(function (err) {
                logger.error('getUserProfile ERROR:', err);
                sendError(err, res);
            });
    };

    public setUserProfile(req:Request, res:Response):void {
        getUserId(req)
            .then(function (id) {
                return userController.setProfile(id, req.body);
            })
            .then(function (updatedProfile) {
                res.json(updatedProfile);
            })
            .catch(function (err) {
                logger.error('setUserProfile ERROR:', err);
                sendError(err, res);
            });
    };

    public changePassword(req:Request, res:Response):void {
        getUserId(req)
            .then(function (id) {
                return userController.changePassword(req.body, id);
            })
            .then(function (answer) {
                res.json(answer);
            })
            .catch(function (err) {
                logger.error('changePassword ERROR:', err);
                sendError(err, res);
            });
    }

    public setAbuse(req:Request, res:Response):void {
        if (req && req.body && req.body.subject && req.body.message) {
            getUserId(req)
                .then(function (id) {
                    logger.debug('try to save abuse:', req.body);
                    return abuseController.setAbuse(id, req.body);
                })
                .then(function (abuseMessage) {
                    logger.debug('abuse created:', abuseMessage);
                    res.json(abuseMessage);
                })
                .catch(function (err) {
                    logger.error(err);
                    sendError(err, res);
                });
        } else {
            res.json({error: {code: 400, message: 'no subject or message'}})
        }
    }

    public getAdvPrediction(req:Request, res:Response):void{
        advController.getPrediction(req.body, res)
    }
}
function getUserId(req:Request):Promise<string> {
    logger.trace('_getUserId called');
    var deferred = Q.defer();
    logger.warn('req,user',req.user);
    if (req.user && req.user.username) {
        logger.trace('try to get id of ', req.user.username);
        dbController.getUserId(req.user._id)
            .then(function (id) {
                if (!id) {
                    deferred.reject({error: 'no such user'})
                } else {
                    logger.trace('id is', id);
                    deferred.resolve(id);
                }
            })
            .catch(function (err) {
                logger.error(err);
                deferred.reject(err);
            });
    } else {
        deferred.reject({error: 'there was no user in request'});
    }
    return deferred.promise;
}

function sendError(err, res:Response):void {
    if (err.error && err.error.code) res.json(err);
    else res.json({error: {code: 500, message: 'internal server error'}});
}

export var restController = new MainController();