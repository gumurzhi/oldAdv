var Q = require('q');
var expect = require('chai').expect;
var sinon = require('sinon');
require('sinon-as-promised')(Q);
var log4js = require('log4js');
var logger = log4js.getLogger('dbControllerTest');
var _ = require('underscore');
var DbService = require('../services/MongoService').MongoService;


describe('tests for dbController', function () {
    var dbController;
    beforeEach(function () {
        dbController = require('../controllers/dbController').dbController;
    });
    afterEach(function () {
        sinon.restore(DbService.prototype.findOne);
        sinon.restore(DbService.prototype.findAndUpdate);
        sinon.restore(DbService.prototype.findByIdAndUpdate);
    });
    it('test for _getUserId - success', function (done) {
        sinon.stub(DbService.prototype, 'findOne').returns(Q.resolve({_id: '121212'}));
        dbController._getUserId('someUser')
            .then(function (data) {
                logger.info('answer:', data);
                expect(data).to.equals('121212');

                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for _getUserId - null', function (done) {
        sinon.stub(DbService.prototype, 'findOne').returns(Q.resolve(null));
        dbController._getUserId('someUser')
            .then(function (data) {
                logger.info('answer:', data);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equals('no such user');
                done();
            });
    });
    it('test for _getUserId - got error from dbService', function (done) {
        sinon.stub(DbService.prototype, 'findOne').returns(Q.reject({error: 'some error'}));
        dbController._getUserId('someUser')
            .then(function (data) {
                logger.info('answer:', data);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equals('some error');
                done();
            });
    });
    it('test of addAdvCampaign method', function (done) {
        DbService.prototype.create = function (inc) {
            var deferred = Q.defer();
            deferred.resolve(inc);
            return deferred.promise;
        };
        var expectedAnswer = {a: '1111', wallet: 0};
        dbController.addAdvCampaign({a: '1111'})
            .then(function (data) {
                logger.info('answer:', data);
                expect(_.isEqual(data, expectedAnswer)).to.equal(true);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test of setFieldAdvCampaign - success', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve({a: '1'}));
        dbController.changeAdvCampaign({}, {})
            .then(function (data) {
                logger.info(data);
                expect(data.a).to.equal('1');
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test of setFieldAdvCampaign - returns null', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve(null));
        dbController.changeAdvCampaign({}, {})
            .then(function (data) {
                logger.info(data);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equal('there is no such campaign');
                done();
            });
    });
    it('test of setFieldAdvCampaign - error from dbService', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.reject({error: 'some error'}));
        dbController.changeAdvCampaign({}, {})
            .then(function (data) {
                logger.info(data);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equal('some error');
                done();
            });
    });
    it('test for getWorkingCampaigns - success', function (done) {
        var spy = sinon.spy(DbService.prototype, 'find');
        dbController.getWorkingCampaigns()
            .then(function () {
                logger.info(spy.args[0]);
                expect(spy.args[0][0].status).to.equal('started');
                expect(spy.args[0][1].statistic).to.equal(0);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for addAdvCacheRecord - success', function (done) {
        var spy = sinon.spy(DbService.prototype, 'create');
        dbController.addAdvCacheRecord({_id: 'ewewwewew'})
            .then(function () {
                logger.info(spy.args[0]);
                expect(spy.args[0].length).to.equal(1);
                expect(spy.args[0][0].cache.length).to.equal(0);
                done();

            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for clearAdvCaheRecord - success', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve({answer: '123'}));
        dbController.clearAdvCaheRecord('123', '123')
            .then(function (data) {
                logger.info(data);
                expect(data).to.equal(true);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for clearAdvCaheRecord - no such record', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve(null));
        dbController.clearAdvCaheRecord('123', '123')
            .then(function (data) {
                logger.info(data);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equal('no such record');
                done();
            });
    });
    it('test for clearAdvCaheRecord - dbError', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.reject(true));
        dbController.clearAdvCaheRecord('123', '123')
            .then(function (data) {
                logger.info(data);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err).to.equal(true);
                done();
            });
    });
    it('test for setAdvCacheRecord - check incoming data', function (done) {
        var spy = sinon.spy(DbService.prototype, 'findAndUpdate');
        dbController.setAdvCacheRecord('123', 33, 'zz')
            .then(function () {
                logger.info(spy.args[0]);
                expect(spy.args[0][0].campaignId).to.equal('123');
                expect(spy.args[0][1].$inc.wallet).to.equal(33);
                expect(spy.args[0][1].$push.cache).to.equal('zz');
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for setAdvCacheRecord - success', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve({answer: 'qq'}));
        dbController.setAdvCacheRecord('123', 33, 'zz')
            .then(function (answer) {
                logger.info(answer);
                expect(true).to.equal(answer);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for setAdvCacheRecord - no record in db', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve(null));
        dbController.setAdvCacheRecord('123', 33, 'zz')
            .then(function (answer) {
                logger.info(answer);
                expect(answer).to.equal(false);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for setAdvCacheRecord - db Error', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.reject('sdd'));
        dbController.setAdvCacheRecord('123', 33, 'zz')
            .then(function (answer) {
                logger.info(answer);
                expect(answer).to.equal(false);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for getAdv - success', function (done) {
        var testData = {
            wallet: 100,
            dayBudget: 200,
            price: {banner: 300, vert_img: 400, horz_img: 500, action: 600}
        };
        var expectedAnswer = {
            wallet: 1,
            dayBudget: 2,
            price: {banner: 3, vert_img: 4, horz_img: 5, action: 6}
        };
        sinon.stub(DbService.prototype, 'findOne').returns(Q.resolve(testData));
        dbController.getAdv({})
            .then(function (answer) {
                logger.info(answer);
                expect(_.isEqual(answer, expectedAnswer)).to.equal(true);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for getAdv - no record in db', function (done) {
        sinon.stub(DbService.prototype, 'findOne').returns(Q.resolve(null));
        dbController.getAdv({})
            .then(function (answer) {
                logger.info(answer);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equal('no such record');
                done();
            });
    });
    it('test for getAdv - db error', function (done) {
        sinon.stub(DbService.prototype, 'findOne').returns(Q.reject('error'));
        dbController.getAdv({})
            .then(function (answer) {
                logger.info(answer);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err).to.equal('error');
                done();
            });
    });
    it('test for returnChangeAdvCache - test incoming data', function (done) {
        var spy = sinon.spy(DbService.prototype, 'findAndUpdate');
        dbController.returnChangeAdvCache('123', 10)
            .then(function (answer) {
                logger.info(spy.args[0]);
                expect(spy.args[0][0].campaignId).to.equal('123');
                expect(spy.args[0][1].$inc.wallet).to.equal(10);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });

    it('test for returnChangeAdvCache - success', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve('aa'));
        dbController.returnChangeAdvCache('123', 10)
            .then(function (answer) {
                logger.info(answer);
                expect(answer).to.equal(true);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for returnChangeAdvCache - no record in db', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.resolve(null));
        dbController.returnChangeAdvCache('123', 10)
            .then(function (answer) {
                logger.info(answer);
                expect(answer).to.equal(false);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for returnChangeAdvCache - db error', function (done) {
        sinon.stub(DbService.prototype, 'findAndUpdate').returns(Q.reject('error'));
        dbController.returnChangeAdvCache('123', 10)
            .then(function (answer) {
                logger.info(answer);

            })
            .catch(function (err) {
                logger.error(err);
                expect(err).to.equal('error');
                done();
            });
    });
    it('test for addAdvStatistic - check incoming data', function (done) {
        var spy = sinon.spy(DbService.prototype, 'findByIdAndUpdate');
        dbController.addAdvStatistic('57b829f1c2d3a09f19eea3e3', 'test')
            .then(function () {
                logger.info(spy.args[0]);
                expect(spy.args[0][0]).to.equal('57b829f1c2d3a09f19eea3e3');
                expect(spy.args[0][1].$push.statistic).to.equal('test');
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for addAdvStatistic - success', function (done) {
        sinon.stub(DbService.prototype, 'findByIdAndUpdate').returns(Q.resolve('a'));
        dbController.addAdvStatistic('57b829f1c2d3a09f19eea3e3', 'test')
            .then(function (answer) {
                logger.info(answer);
                expect(answer).to.equal(true);
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for addAdvStatistic - no record in db', function (done) {
        sinon.stub(DbService.prototype, 'findByIdAndUpdate').returns(Q.resolve(null));
        dbController.addAdvStatistic('57b829f1c2d3a09f19eea3e3', 'test')
            .then(function (answer) {
                logger.info(answer);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equal('something goes wrong - statistic');
                done();
            });
    });
    it('test for addAdvStatistic - db error', function (done) {
        sinon.stub(DbService.prototype, 'findByIdAndUpdate').returns(Q.reject('err'));
        dbController.addAdvStatistic('57b829f1c2d3a09f19eea3e3', 'test')
            .then(function (answer) {
                logger.info(answer);
            })
            .catch(function (err) {
                logger.error(err);
                expect(err).to.equal('err');
                done();
            });
    });
    it.only('', function () {
        dbController.getAdvStatistic('57d9a5a37be6dc0a66de67d2')
        
    })

});