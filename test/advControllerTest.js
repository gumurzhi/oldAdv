var Q = require('q');
var expect = require('chai').expect;
var sinon = require('sinon');
require('sinon-as-promised')(Q);
var log4js = require('log4js');
var logger = log4js.getLogger('advControllerTest');
var multiply = require('../tools/advMultiplier');
var _ = require('underscore');
var entities = require('./souce/advEntities');
var dbController = require('../controllers/dbController').dbController;

var dbAnswer = {};


//logger.warn(__dirname)
var expectedAnswer = {
    _id: '57cdc1f45451e272545863ca',
    owner: '57cd5afbb117cbfd7427d1af',
    btnTxt: 'btnText',
    horz_img: 'http://localhost:8080/public/images/4yaz1714i.png',
    vert_img: 'http://localhost:8080/public/images/yqlg14i.png',
    banner: 'http://localhost:8080/public/images/va2mt9sh5mi.png',
    startDate: '2016-09-04T12:02:30.826Z',
    endDate: '2017-09-04T12:02:30.826Z',
    budget: 10000,
    btnColor: 'aaaaaa',
    logo: 'logoUrl',
    status: 'paused',
    dayBudget: 10000,
    statistic: {stages: [], apps: [], appsTotal: 0},
    action: {actionType: 'youtube', data: 'https://www.youtube.com/watch?v=7Myx2btDUAM'},
    targeting: {
        gender: 'male',
        country: ['Ukraine', 'Poland'],
        age: ['25_34', '35_44']
    },
    price: {banner: 1, vert_img: 2, horz_img: 3, action: 4},
    __v: 0
};
describe('tests for advController', function () {
    var advController;
    beforeEach(function () {
        advController = require('../controllers/advController').advController;
    //     dbAnswer = entities.workingCampaignsArr[0];
        //     "price": {"banner": 2, "vert_img": 3, "horz_img": 4, "action": 5},
        //     "targeting": {"gender": "male", "country": ["Ukraine", "Poland"], "age": ["25_34", "35_44"]},
        //     "action": {"actionType": "youtube", "data": "http://someLink"},
        //     "statistic": {"stages": [], "apps": [], "appsTotal": 0},
        //     "dayBudget": 10,
        //     "status": "paused",
        //     "logo": "logoUrl",
        //     "btnColor": "ABCDEF",
        //     "budget": 45,
        //     "endDate": "2017-09-04T12:02:30.826Z",
        //     "startDate": "2016-09-04T12:02:30.826Z",
        //     "banner": "http://localhost:8080/public/images/va2mt9sh5mi.png",
        //     "vert_img": "http://localhost:8080/public/images/yqlg14i.png",
        //     "horz_img": "http://localhost:8080/public/images/4yaz1714i.png",
        //     "btnTxt": "btnText",
        //     "owner": "57cd5afbb117cbfd7427d1af",
        //     "_id": "57cdc1f45451e272545863ca"
        // };
    });
    afterEach(function () {
        sinon.restore(dbController.getAdv);
        // sinon.restore(MongoService.prototype.findAndUpdate);
    });
    it('test for getCampaign method', function (done) {

        sinon.stub(dbController, 'getAdv').returns(Q.resolve(dbAnswer));
        advController.getCampaign()
            .then(function (answer) {
                logger.info(answer);
                return advController.getCampaign();
            })
            .then(function (answer2) {
                logger.info(answer2);
                expect(answer2.budget).to.equal(0.45);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test of multiply ', function () {
        expect(_.isEqual(multiply.changeAdvNumbers(dbAnswer), expectedAnswer)).to.equal(true);
        //logger.info(multiply.changeAdvNumbers(dbAnswer, true))
    });
    it('test for getWorkingCampaigns method', function (done) {
        advController.workingCampaignsArr = [dbAnswer];
        var x = advController.getWorkingCampaigns();
        logger.info(x);
        expect(_.isEqual(x[0], expectedAnswer)).to.equal(true);
        done();
    });
    // it.only('test of addCampaign method', function (done) {
    //     delete dbAnswer._id;
    //         advController.addCampaign(dbAnswer)
    //             .then(function (answer) {
    //                 logger.info(answer);
    //                 done();
    //             })
    //             .catch(function (err) {
    //                 logger.error(err);
    //             });
    // })
    it('test of recountDayBudget method', function () {
        advController.workingCampaigns = { '57d857df79544df0360953fd':
        { owner: '57cd5afbb117cbfd7427d1af',
            budget: 10000,
            dayBudget: 1000,
            reserveSum: 100 } };

        advController.workingCampaignsArr =  [ { _id: '57d857df79544df0360953fd',
            budget: 10000,
            dayBudget: 1000,
            startDate: '2016-09-12T21:00:00.000Z',
            endDate: '2016-09-13T21:00:00.000Z',
            title: 'one',
            logo: 'http://localhost:8080/images/p682iyalfhz0syycik9.png',
            banner: 'http://localhost:8080/images/gk52d31fvzfuzrfqolxr.png',
            vert_img: 'http://localhost:8080/images/pc5twgkzb7btuuhj8aor.png',
            horz_img: 'http://localhost:8080/images/ceqyv2eizbe47dnobhuxr.png',
            btnTxt: 'btn',
            owner: '57cd5afbb117cbfd7427d1af',
            status: 'started',
            targeting: { country: [], age: [] },
        price: { banner: 100, vert_img: 200, horz_img: 300, action: 400 },
        __v: 0 } ];


        advController.cache ={ '57d857df79544df0360953fd':
        { _id: '57d857e76579de7737535c3b',
            wallet: 500,
            campaignId: '57d857df79544df0360953fd',
            reserveSum: 1000,
            cache: [],
            __v: 0 } };

        var stub = sinon.stub;
        stub(dbController, 'setFieldAdvCache').returns(Q.resolve(true));
        advController.recountDayBudget();
        expect(advController.cache['57d857df79544df0360953fd'].wallet).to.equal(1000);
        advController.cache['57d857df79544df0360953fd'].wallet= 200;
        advController.workingCampaigns['57d857df79544df0360953fd'].budget = 300;
        advController.recountDayBudget();
        logger.trace(advController.cache);
        expect(advController.cache['57d857df79544df0360953fd'].wallet).to.equal(300);
        advController.cache['57d857df79544df0360953fd'].cache = ['a', 'b'];
        advController.recountDayBudget();
        logger.trace(advController.cache);
        expect(advController.cache['57d857df79544df0360953fd'].wallet).to.equal(100);
    });
    it('returnBalance test',function (done) {
        var z = advController._checkCampaigmMetadata(expectedAnswer);
        logger.warn(z);
    });
    it.only('test for returnBalance method', function (done) {
        advController.returnBalance();
        setTimeout(function () {
            done();
        }, 200);
    })
});
