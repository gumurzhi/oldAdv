var Q = require('q');
var expect = require('chai').expect;
var sinon = require('sinon');
require('sinon-as-promised')(Q);
var log4js = require('log4js');
var logger = log4js.getLogger('mainControllerTest');
var _ = require('underscore');
var dbController = require('../controllers/dbController').dbController;
var advController = require('../controllers/advController').advController;

describe('tests for mainController', function () {
    var restController;
    beforeEach(function () {
        restController = require('../controllers/restController').restController;

    });
    afterEach(function () {
        sinon.restore(dbController.getUserId);
        sinon.restore(dbController.addAdvCampaign);
        sinon.restore(advController.addCampaign)

    });
    it('test for _getUserId method - success', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        var req = {
            user: {
                username: 'testUser'
            }
        };
        restController._getUserId(req)
            .then(function (id) {
                logger.info('answer is', id);
                expect(id).to.equal('123');
                done();
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
    it('test for _getUserId method - got err', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.reject({error: 'some error'}));
        var req = {user: {username: 'vasya'}};
        restController._getUserId(req)
            .then(function (id) {
                logger.info('answer is', id);

            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equal('some error');
                done();
            });
    });

    it('test for _getUserId method - no user in request', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.reject({error: 'some error'}));
        var req = {user: {}};
        restController._getUserId(req)
            .then(function (id) {
                logger.info('answer is', id);

            })
            .catch(function (err) {
                logger.error(err);
                expect(err.error).to.equal('there was no user in request');
                done();
            });
    });
    it('test for addAdvCamp - success', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        sinon.stub(advController, 'addCampaign').returns(Q.resolve('456'));
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data).to.equal('456');
                logger.info(dbController.addAdvCampaign.args);
                done();
            }
        };
        var req = {user: {username: 'testUsr'}, body: {btnTxt: '1212', someImg: 'img'}};
        restController.addAdvCamp(req, res);
    });
    it('test for addAdvCamp -  check outgoing data', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        dbController.addAdvCampaign = function (data) {
            var deferred = Q.defer();
            deferred.resolve(data);
            return deferred.promise;
        };
        var expectedAnswer = {btnTxt: '1212', someImg: 'img', owner: '123', status: 'paused'};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(_.isEqual(data, expectedAnswer)).to.equal(true);
                done();
            }
        };
        var req = {user: {username: 'testUsr'}, body: {btnTxt: '1212', someImg: 'img'}};
        restController.addAdvCamp(req, res);
    });
    it('test for addAdvCamp - no user in request', function (done) {
        var req = {user: {}, body: {btnTxt: '1212', someImg: 'img'}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data.error).to.equal('there was no user in request');
                done();
            }
        };
        restController.addAdvCamp(req, res);
    });
    it('test for addAdvCamp - no user in database', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve(null));
        var req = {user: {username: 'bzz'}, body: {btnTxt: '1212', someImg: 'img'}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data.error).to.equal('no such user');
                done();
            }
        };
        restController.addAdvCamp(req, res);
    });
    it('test for addAdvCamp - got error from dbController', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        sinon.stub(advController, 'addCampaign').returns(Q.reject({error: 'someError'}));
        var req = {user: {username: 'bzz'}, body: {btnTxt: '1212', someImg: 'img'}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data.error).to.equal('someError');
                done();
            }
        };
        restController.addAdvCamp(req, res);
    });
    it('test for changeAdvCamp method - success', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        sinon.stub(dbController, 'setFieldAdvCampaign').returns(Q.resolve('456'));
        var req = {user: {username: 'someUser'}, body: {_id: 'myId', update: {upd1: '1', upd2: '2'}}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data).to.equal('456');
                done();
            }
        };
        restController.changeAdvCamp(req, res);
    });
    it('test for changeAdvCamp method - check sending data', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        dbController.setFieldAdvCampaign = function (conditions, updated) {
            var deferred = Q.defer();
            deferred.resolve({a: conditions, b: updated});
            return deferred.promise;
        };
        var expectedAnswer = {a: {owner: '123', _id: 'campaignId'}, b: {upd1: '1', upd2: '2'}};
        var req = {user: {username: 'someUser'}, body: {_id: 'campaignId', update: {upd1: '1', upd2: '2'}}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(_.isEqual(data, expectedAnswer)).to.equal(true);
                done();
            }
        };
        restController.changeAdvCamp(req, res);
    });
    it('test for changeAdvCamp method - wrong incoming data structure', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        var req = {user: {username: 'someUser'}, body: {update: {upd1: '1', upd2: '2'}}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data.error).to.equal('something wrong with incoming data');
                done();
            }
        };
        restController.changeAdvCamp(req, res)
    });
    // it('test for removeAdvCampaign - success', function (done) {
    //     sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
    //     sinon.stub(dbController, 'removeAdvCampaign').returns(Q.resolve(true));
    //     var req = {user: {username: 'someUser'}, body: {_id: '111'}};
    //     var res = {
    //         json: function (data) {
    //             logger.info('answer:', data);
    //             expect(data.status).to.equal('success');
    //             done();
    //         }
    //     };
    //     restController.removeAdvCampaign(req, res);
    // });
    // it('test for removeAdvCampaign - fail wrong incoming data', function (done) {
    //     sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
    //     var req = {user: {username: 'someUser'}, body: {id: '1'}};
    //     var res = {
    //         json: function (data) {
    //             logger.info('answer:', data);
    //             expect(data.error).to.equal('something wrong with incoming data');
    //             dbController.removeAdvCampaign.restore();
    //             done();
    //         }
    //     };
    //     restController.removeAdvCampaign(req, res);
    // });
    // it('test for removeAdvCampaign - fail dbConroller\'s error', function (done) {
    //     sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
    //     sinon.stub(dbController, 'removeAdvCampaign').returns(Q.reject({error: 'some error'}));
    //     var req = {user: {username: 'someUser'}, body: {_id: '1'}};
    //     var res = {
    //         json: function (data) {
    //             logger.info('answer:', data);
    //             expect(data.error).to.equal('some error');
    //             done();
    //         }
    //     };
    //     restController.removeAdvCampaign(req, res);
    // });
    it('test for getMyCampaigns  -  success', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        sinon.stub(dbController, 'getAdvCamapaignsByOwner').returns(Q.resolve([1, 2, 2, 3]));
        var req = {user: {username: 'someUser'}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(_.isEqual(data, [1, 2, 2, 3])).to.equal(true);
                done();
            }
        };
        restController.getMyCampaigns(req, res);
    });
    it('test for getMyCampaigns  -  success check outgoing data, not admin', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        dbController.getAdvCamapaignsByOwner = function (cond) {
            var deferred = Q.defer();
            deferred.resolve(cond);
            return deferred.promise;
        };
        var req = {user: {username: 'someUser'}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data).to.equal('123');
                done();
            }
        };
        restController.getMyCampaigns(req, res);
    });
    it('test for getMyCampaigns  -  success check outgoing data,  admin', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        dbController.getAdvCamapaignsByOwner = function (cond) {
            var deferred = Q.defer();
            deferred.resolve(cond);
            return deferred.promise;
        };
        var req = {user: {username: 'admin'}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data).to.equal('admin');
                done();
            }
        };
        restController.getMyCampaigns(req, res);
    });
    it('test for getMyCampaigns  -  got error from dbController', function (done) {
        sinon.stub(dbController, '_getUserId').returns(Q.resolve('123'));
        sinon.stub(dbController, 'getAdvCamapaignsByOwner').returns(Q.reject({error: 'some error'}));
        var req = {user: {username: 'someUser'}};
        var res = {
            json: function (data) {
                logger.info('answer:', data);
                expect(data.error).to.equal('some error');
                done();
            }
        };
        restController.getMyCampaigns(req, res);
    });
});