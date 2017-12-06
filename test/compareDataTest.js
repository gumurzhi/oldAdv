var Q = require('q');
var expect = require('chai').expect;
var log4js = require('log4js');
var logger = log4js.getLogger('advControllerTest');
var compareData = require('../tools/compareData').compareData;
var varIfaces = require('../entity/varInterfaces').varInterfaces;
var _ = require('underscore');

var adv = {
    "__v": 0,
    "status": "paused",
    "owner": "57cd5afbb117cbfd7427d1af",
    "btnTxt": "btnText",
    "horz_img": "http://localhost:8080/public/images/4yaz1714i.png",
    "vert_img": "http://localhost:8080/public/images/yqlg14i.png",
    "banner": "http://localhost:8080/public/images/va2mt9sh5mi.png",
    "startDate": "2016-09-04T12:02:30.826Z",
    "endDate": "2017-09-04T12:02:30.826Z",
    "description": "SomeDescription",
    "budget": 1000000,
    "btnColor": "ABCDEF",
    "logo": "logoUrl",
    "dayBudget": 1000,
    "title": "advTitle",
    "_id": "57cdc6fe5f9307315b4496d8",
    // "action": {
    //     "actionType": "youtube",
    //     "data": "http://someLink"
    // },
    "targeting": {
        gender: "male",
        "country": [
            "Ukraine",
            "Poland"
        ],
        "age": [
            "25_34",
            "35_44"
        ]
    },
    "price": {
        "banner": 20,
        "vert_img": 10,
        "horz_img": 30,
        "action": 100
    }
};

describe('tests for advController', function () {
    it('test of multiply ', function () {
            logger.info(compareData.compareObjects(varIfaces.testAdvTyped, adv))

    });

});
