var Q = require('q');
var expect = require('chai').expect;
var sinon = require('sinon');
require('sinon-as-promised')(Q);
var log4js = require('log4js');
var logger = log4js.getLogger('fsControllerTest');
var _ = require('underscore');
var fsController = require('../controllers/fsController').fsController;
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

    it('getRootDir test ', function () {
        logger.info(fsController.getRootDir())
    });
    it('test of checkFolder', function () {
        // fsController.checkFolder('temp/123', true)
        // .then(function(answer){
        //    logger.info(answer);
        // })
        // .catch(function(err){
        //     logger.error(err);
        // });
    });
    it('test for saving file', function (done) {
        // var a = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQEAAACgCAYAAAAM29kCAAAgAElEQVR4";
        // fsController.saveToPublic('temp/13', 'vasya', a)
        // .then(function(data){
        //    logger.info(data);
        // })
        // .catch(function(err){
        //     logger.error(err);
        // });
    })

});
