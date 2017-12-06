var Q = require('q');
var expect = require('chai').expect;
var sinon = require('sinon');
require('sinon-as-promised')(Q);
var log4js = require('log4js');
var logger = log4js.getLogger('advControllerTest');
var multiply = require('../tools/advMultiplier');
var _ = require('underscore');
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

    it('test of multiply ', function () {
        var a = 's:PYcPqWN4WaZMJ6AeJEaMaf2EW91Prd6H.zvhILkUT2iWhw7NbcYXCiesPSTIvkXSxDz5hc+a7f5s';
      //  soIoController.
    });

});
