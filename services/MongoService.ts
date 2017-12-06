///<reference path="../typings/tsd.d.ts"/>
import log4js = require('log4js');
let logger = log4js.getLogger('MongoService');
import Q = require('q');
import mongoose = require('mongoose');
import {config} from '../config/appConfig';


mongoose.connect(config.mongoose.uri, config.mongoose.options);
var db = mongoose.connection;
db.on('error', function (err:any) {
    logger.error("MongoDB connection error", err.message);
});

db.once('open', function callback() {
    logger.info("Connected to MongoDB!");
});

interface DbServiceIface {
    find(conditions:Object, fields?:Object):any;
    create(obj:Object):any;
    fullCycleSearch(conditions:Object, fields?:Object, sort?:Object, limit?:number, skip?:number):any;//Promise<mongoose.Document>;
    aggregate(aggregateObj:Object):any;
    remove(conditions:Object):any;
    findById(id:string):any;
    findByIdAndUpdate(id:string, newData:Object):any;
    findOne(conditions:Object, fields?:Object):any;
    findAndUpdate(conditions:Object, newData:Object, options?:Object):any;
    count(conditions:Object):any;
}


export class MongoService<T extends mongoose.Document> implements DbServiceIface {
    model:mongoose.Model<T>;

    public constructor(newModel:mongoose.Model<T>) {
        this.model = newModel;
    };
    
    public find(conditions:Object, fields?:Object):Promise<T[]> {
        var deferred = Q.defer();
        this.model.find(conditions, fields, function (err:mongoose.Error, arr:T[]) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(arr.map(function (cell) {
                    return JSON.parse(JSON.stringify(cell))
                }));
            }
        });
        return deferred.promise;
    };
    public create(obj:Object):Promise<T> {
        var deferred = Q.defer();
        this.model.create(obj, function (err:mongoose.Error, obj:T) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(JSON.parse(JSON.stringify(obj)));
            }
        });
        return deferred.promise;
    };

    public fullCycleSearch(conditions:Object, fields?:Object, sort?:Object, limit?:number, skip?:number):Promise<T> {
        var deferred = Q.defer();
        this.model.find(conditions, fields).sort(sort).skip(skip).limit(limit).exec(function (err:mongoose.Error, arr:T[]) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(arr);
            }
        });
        return deferred.promise;
    };

    public aggregate(aggregateObj:Object):Promise<T[]> {
        var deferred = Q.defer();
        this.model.aggregate(aggregateObj, function (err:mongoose.Error, arr:T[]) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(arr);
            }
        });
        return deferred.promise;
    };

    public remove(conditions:Object):Promise<string> {
        var deferred = Q.defer();
        this.model.remove(conditions, (err:mongoose.Error) => {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve('document deleted');
            }
        });
        return deferred.promise;
    };

    public findById(id:string):Promise<T> {
        var deferred = Q.defer();
        this.model.findById(id).exec(function (err:mongoose.Error, obj:T) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(JSON.parse(JSON.stringify(obj)));
            }
        });
        return deferred.promise;
    };

    findByIdAndUpdate(id:string, newData:Object):Promise<T> {
        var deferred = Q.defer();
        this.model.findOneAndUpdate({_id: id}, newData, {"new": true}, function (err:mongoose.Error, obj:T) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(JSON.parse(JSON.stringify(obj)));
            }
        });
        return deferred.promise;
    };

    findOne(conditions:Object, fields?:Object):Promise<T> {
        var deferred = Q.defer();
        this.model.findOne(conditions, fields).exec(function (err:mongoose.Error, obj:T) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(JSON.parse(JSON.stringify(obj)));
            }
        });
        return deferred.promise;
    };

    findAndUpdate(conditions:Object, newData:Object, options?:any):Promise<T> {
        var deferred = Q.defer();
        if(!options)  options = {"new": true};
        else options.new = true;
        options.versionKey= false;
        this.model.findOneAndUpdate(conditions, newData, options, function (err:mongoose.Error, obj:T) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(JSON.parse(JSON.stringify(obj)));
            }
        });
        return deferred.promise;
    };

    count(conditions:Object):Promise<number> {
        var deferred = Q.defer();

        this.model.count(conditions, (err:mongoose.Error, count:number)=> {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(count);
            }
        });
        return deferred.promise;
    };
}

