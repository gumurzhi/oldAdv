///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from "log4js";
import * as Q from "q";
import * as fs from "fs";
let logger = getLogger('fsController');

interface requestStorage {
    [index:string]: any[]
}

class FsController {
    rootDir:string = '';
    requestStorage:requestStorage = {};

    constructor() {
        this.rootDir = __dirname.replace('/controllers', '');
    }

    public getRootDir():string {
        return this.rootDir;
    }

    public checkFolder(path:string, createFlag:boolean):Promise<boolean> {
        var my = this;
        var deferred = Q.defer();
        if (!path) deferred.reject({error: {code: 400, message: 'no path was received'}});
        else {
            if (!my.requestStorage[path]) {
                my.requestStorage[path] = [];
                var folders = path.split('/');
                logger.trace('foldersArr:', folders);
                var count = 1;
                startCheck();
                function startCheck() {
                    var tempPath = '';
                    for (var i = 0; i < count; i++) {
                        tempPath += '/' + folders[i];
                    }
                    tempPath = my.getRootDir() + tempPath;
                    logger.trace('path:', tempPath);
                    my.existsCheck(tempPath)
                        .then(function (answer) {
                            if (!answer) {
                                if (createFlag) {
                                    try {
                                        fs.mkdirSync(tempPath);
                                    } catch (err) {
                                        logger.error('creating folder of path', tempPath, 'ERROR:', err);
                                        returnParallel(path, {error: {status: 500, message: 'can not create folder'}});
                                        deferred.reject({error: {status: 500, message: 'can not create folder'}});
                                        return deferred.promise;
                                    }
                                } else {
                                    returnParallel(path, {error: {status: 400, message: 'there is no such folder'}});
                                    deferred.reject({error: {status: 400, message: 'there is no such folder'}});
                                    return deferred.promise;
                                }
                            }
                            if (count >= folders.length) {
                               returnParallel(path, true);
                                deferred.resolve(true);
                            } else {
                                count++;
                                startCheck();
                            }
                        })
                        .catch(function (err) {
                            logger.error(err);
                        });
                }
            } else {
                my.requestStorage[path].push(deferred);
            }
        }
        function returnParallel(path, answer){
            if(my.requestStorage[path].length){
                my.requestStorage[path].forEach(function (cell) {
                    if(answer && answer.error) cell.reject(answer);
                    else cell.resolve(answer);
                })
            }
            delete my.requestStorage[path];
        }
        return deferred.promise;
    }

    private existsCheck(path:string):Promise<boolean> {
        var deferred = Q.defer();
        try {
            var stats = fs.lstatSync(path);
            if (stats.isDirectory()) {
                deferred.resolve(true);
            } else deferred.resolve(false);
        }
        catch (e) {
            deferred.resolve(false);
        }
        return deferred.promise;
    }

    public saveToPublic(path:string, filename:string, file:string):Promise<string> {
        var deferred = Q.defer();
        path = 'public/' + path;
        this.saveFile(path, filename, file)
            .then(function (saved) {
                if (saved) {
                    saved = saved.replace(/^\/public/, '');
                }
                deferred.resolve(saved);
            })
            .catch(function (err) {
                logger.error(err);
                deferred.resolve(false);
            });

        return deferred.promise;
    }

    public saveFile(path:string, filename:string, file:string):Promise<string> {
        var my = this;
        var deferred = Q.defer();
        this.checkFolder(path, true)
            .then(function () {
                var exp = '.' + file.replace(/^data:\w+\//, '').replace(/;base64,(.*)/g, '');
                file = file.replace(/^data:\w+\/\w+;base64,/, "");
                var fullPath = '/' + path + '/' + filename + exp;
                logger.trace('try to save: ', my.getRootDir() + fullPath);
                fs.writeFile(my.getRootDir() + fullPath, file, 'base64', function (err) {
                    if (err) {
                        logger.error('file can\'t be saved', err);
                        //  deferred.reject(true);
                        deferred.resolve(false);
                    } else {
                        logger.trace('file', path + filename + exp, 'saved');
                        deferred.resolve(fullPath);
                    }
                });
            })
            .catch(function (err) {
                logger.error(err);
                deferred.resolve(false);
            });

        return deferred.promise;
    }
}

export var fsController = new FsController();
fsController.checkFolder('public/images', true)
    .catch(function (err) {
        logger.error('public/images create failed:', err);
    });