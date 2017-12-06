import {dbController} from "./dbController";
import {getLogger} from "log4js";
import * as Q from "q";
import {User, userIface, userProfileIface} from "../entity/mongoModels/userModel";
import {fsController} from "./fsController";
import {socketIoController} from "./socketIoController";
//import {advController} from "./advController";
let logger = getLogger('userController');

class UserController {
    constructor() {

    }

    public checkAdminExist():void {
        dbController.getAllUsers()
            .then(function (users) {
                if (!users || users.length == 0) {
                    var admin = new User({
                        username: 'admin', password: 'admin', wallet: 0, profile: {
                            logo: '',
                            name: 'admin',
                            phone: '',
                            url: '',
                            email: '',
                            company: '',
                            location: '',
                            disable_notifications: true
                        }
                    });
                    admin.password = admin.generateHash(admin.password);
                    return dbController.createNewUser(admin);
                }
            })
            .then(function (data) {
                if (data) logger.info('admin successfully created');
            })
            .catch(function (err) {
                logger.error(err);
            });
    }

    public getInfo(username:string):Promise<User> {
        return dbController.getUser({username: username});
    }

    public createNewUser(user:userIface):Promise<User> {
        var deferred = Q.defer();
        if (user && user.username && user.password) {
            dbController.getUser({username: user.username})
                .then(function (userExist) {
                    if (userExist) {
                        deferred.resolve({error: 'user with such username already exist'});
                    } else {
                        user.wallet = 0;
                        var newUser:User = new User(user);
                        newUser.password = newUser.generateHash(newUser.password);
                        return dbController.createNewUser(newUser);
                    }
                })
                .then(function (created) {
                    if (created) deferred.resolve(created);
                })
                .catch(function (err) {
                    logger.error(err);
                    deferred.resolve({error: 'internal server error'});
                });
        }
        return deferred.promise;
    };

    public getProfile(userId:string):Promise<userProfileIface> {
        var deferred = Q.defer();
        dbController.getUserById(userId)
            .then(function (user) {
                if (user) deferred.resolve(user.profile);
                else deferred.reject({error: {code: 404, message: 'no such user'}});
            })
            .catch(function (err) {
                logger.error('getProfile Error', err);
                deferred.reject({error: {code: 500, message: 'internal server error'}});
            });
        return deferred.promise;
    }

    public setProfile(userId:string, profileObj:userProfileIface):Promise<userProfileIface> {
        var deferred = Q.defer();
        this.perpareProfile(profileObj)
            .then(function (preparedProfile) {
                logger.trace('prepared profile:', preparedProfile);
                return dbController.updateUserById(userId, {$set: {profile: preparedProfile}})
            })
            .then(function (updatedUser) {
                logger.trace('updated User is:', updatedUser);
                if (updatedUser) {
                    socketIoController.sendUserInfo(updatedUser);
                    deferred.resolve(updatedUser.profile);
                } else {
                    deferred.reject({error: {code: 404, message: 'no such user'}});
                }
            })
            .catch(function (err) {
                logger.error('setProfile ERROR:', err);
                deferred.reject({error: {code: 500, message: 'internal server error'}});
            });
        return deferred.promise;
    }

    private perpareProfile(profileObj:userProfileIface):Promise<userProfileIface> {
        var deferred = Q.defer();
        logger.trace('start to prepare profile');
        if (profileObj.logo && typeof profileObj.logo == 'string' && profileObj.logo.search(/data:image\/\w+;base64/) >= 0) {
            fsController.saveToPublic('images', Math.random().toString(36).substring(7), profileObj.logo)
                .then(function (fullPath) {
                    logger.debug('logo saved', fullPath);
                    if (fullPath) profileObj.logo = fullPath;
                    deferred.resolve(profileObj);
                })
                .catch(function (err) {
                    logger.error('perpareProfile ERROR:', err);
                    deferred.resolve(profileObj);
                });
        } else {
            deferred.resolve(profileObj);
        }
        return deferred.promise;
    }

    public changePassword(passwords:{old:string, 'new':string}, userId:string):Promise<{success:boolean}> {
        var deferred = Q.defer();
        logger.trace('will try to change password');
        dbController.getUserById(userId)
            .then(function (user) {
                if (user) {
                    logger.trace('user found');
                    var vUser = new User(user);
                    if (vUser.validPassword(passwords.old)) {
                        logger.trace('got valid password');
                        var newPassword = vUser.generateHash(passwords.new);
                        return dbController.updateUserById(userId, {$set: {password: newPassword}});
                    } else {
                        logger.warn('got not valid password');
                        deferred.reject({error: {code: 200, message: 'password is not valid'}});
                        return deferred.promise;
                    }

                } else {
                    logger.warn('user with id', userId, 'was not found');
                    deferred.reject({error: {code: 404, message: 'no such user'}});
                    return deferred.promise;
                }
            })
            .then(function (updatedUser) {
                logger.debug('password was updated:', updatedUser);
                deferred.resolve({success: true});
            })
            .catch(function (err) {
                logger.error('dbController.getUserById got ERROR:', err);
                deferred.reject({error: {code: 500, message: 'internal server error'}});
            });
        return deferred.promise;
    }
}

export var userController = new UserController();
