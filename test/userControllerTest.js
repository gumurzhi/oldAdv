var Q = require('q');
var expect = require('chai').expect;
var sinon = require('sinon');
require('sinon-as-promised')(Q);
var log4js = require('log4js');
var logger = log4js.getLogger('userControllerTest');
var _ = require('underscore');
var userController = require('../controllers/userController').userController;
var dbController = require('../controllers/dbController').dbController;

var dbAnswer = {};

describe('tests for advController', function () {
    var soIoController;
    beforeEach(function () {
        soIoController = require('../controllers/socketIoController').socketIoController;

    });
    afterEach(function () {
        sinon.restore(dbController.getAdv);
        // sinon.restore(MongoService.prototype.findAndUpdate);
    });

    it('changePassword test ', function () {
        //logger.info(fsController.getRootDir())
        // userController.changePassword({old: 'admin', 'new': '321'}, '57efb11c4bec6b39157f2d1c')
        // .then(function(answer){
        //    logger.warn(answer);
        // })
        // .catch(function(err){
        //     logger.error(err);
        // });
    });
    it('getProfile test', function () {
        userController.getProfile('57efb11c4bec6b39157f2d1c')
            .then(function (profile) {
                logger.info(profile);
            })
            .catch(function (err) {
                logger.error(err);
            });
    });

    it.only('setProfile test', function (done) {
        // var profile = {
        //     logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQEAAACgCAYAAAAM29kCAAAgAElEQVR4",
        //     name: 'admin2',
        //     url: 'google.com',
        //     email: 'admin@admin.com',
        //     company: 'my com',
        //     location: 'here',
        //     disable_notifications: true
        // };
        // userController.setProfile('57efb11c4bec6b39157f2d1c', profile)
        //     .then(function (newProfile) {
        //         logger.info(newProfile);
        //         done();
        //     })
        //     .catch(function (err) {
        //         logger.error(err);
        //     });
    })

});
