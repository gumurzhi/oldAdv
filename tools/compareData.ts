///<reference path="../typings/tsd.d.ts"/>
import {getLogger} from 'log4js';
var logger = getLogger('compareData');
import * as _ from 'underscore'


class CompareData {
    constructor() {
    }

    public compareObjects(etalon:any, checking:any):boolean {
        var my = this,
            answer = true;
        try {
            if (etalon instanceof Array) {
                if (checking instanceof Array) {
                    for (var i in checking) {
                        if (typeof etalon[0] == 'string') {
                            answer = my._checkType(etalon[0], checking[i]);
                            if (answer == false) {
                                return false;
                            }
                        } else {
                            //logger.info(etalon[0], checking[i]);
                            answer = my.compareObjects(etalon[0], checking[i]);
                            if (answer == false) {
                                return false;
                            }
                        }
                    }
                } else {
                    return false;
                }
            } else {
                var e = my._prepareEtalon(etalon),
                    c = my.clearEmpty(JSON.parse(JSON.stringify(checking)));
                logger.debug('checking:', c);
                logger.debug('etalon:', e);
                for (var k in c) {
                    logger.trace(k);
                    logger.trace(c[k], " : ", e[k]);
                    if (e[k] || e[k] == 'boolean' || c[k] == '') {
                        if (typeof  e[k] === 'object') {
                            answer = my.compareObjects(e[k], c[k]);
                            if (answer == false) {
                                return false;
                            }
                        } else {
                            answer = my._checkType(e[k], c[k]);
                            if (answer == false) {
                                return false;
                            }
                        }

                    } else {
                        //logger.warn('there are no such ', k, 'in checking object');
                        return false;
                    }
                }
            }
        } catch (err) {
            logger.error(err);
            return false;
        }
        return answer;
    }

    private _checkType(typeObj, data):boolean {
        logger.debug('_checkType', typeObj, ' : ', data);
        var answer = false;
        if (typeof  data === typeObj) {
            answer = true;
        } else if (typeObj == 'date' && (typeof data == 'string' || typeof data == 'number' )) {
            if (data instanceof Date) {
                answer = true;
            } else {
                try {
                    var d:any = new Date(data);
                    if (d != 'Invalid Date') {
                        answer = true;
                    }
                } catch (err) {
                    return false;
                }
            }
        } else {
            logger.warn('data:', data, 'is not', typeObj);
            return false;
        }
        return answer;
    }

    private _prepareEtalon(obj:any) {
        var my = this;
        logger.debug('incoming etalon:', obj);
        var answerObj = {};
        if (obj && obj.type && typeof  obj.type === 'function' || obj.type instanceof Array && typeof  obj.type[0] == 'function') {
            //logger.info(obj, obj.type);
            obj = obj.type;
            //logger.warn(obj);
            if (obj instanceof Array) {
                answerObj = [funcToString(obj)];
            } else {
                answerObj = funcToString(obj);
            }
        } else if (typeof  obj == 'string') {
            return obj
        } else if (obj instanceof Array) {
            answerObj = [];
            answerObj[0] = my._prepareEtalon(obj[0]);
        }
        for (var k in obj) {
            if (typeof  obj[k] === 'function') {
                answerObj[k] = funcToString(obj[k]);
            } else if (typeof  obj[k] === 'object') {
                answerObj[k] = this._prepareEtalon(obj[k]);
            }
        }
        //logger.debug('returning enalon:', answerObj);
        return answerObj;
        function funcToString(obj) {

            var toStr = obj.toString();
            toStr = toStr.slice(toStr.indexOf(' ') + 1, toStr.lastIndexOf('(')).toLocaleLowerCase();
            return toStr;
        }
    }

    public clearEmpty(obj) {

        for (var k in obj) {
            if (typeof obj[k] === 'object') {
                this.clearEmpty(obj[k]);
            } else if (obj[k] == '' || obj[k] == null) {
                delete obj[k];
            }
        }
        return obj;
    };
}

export var compareData = new CompareData();