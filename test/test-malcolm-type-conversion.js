
'use strict';

var _ = require('underscore-contrib');
var chai = require('chai');
var expect = chai.expect;
var sinonChai = require('sinon-chai');
var Req = require('./utils/request-helper');
var testPoints = require('./presets/test-points');
var utils = require('./utils/utils');
var moment = require('moment');

chai.use(sinonChai);

var testDateString = '2014-02-08 15:36';

var	baseDataSet = {
	TestParm1: 'bla',
	TestParm2: '42 - answer to life, the universe, and everything',
	TestParm3: '27.6',
	TestParm4: 'Y',
	TestParm5: testDateString
};
var baseExpectedResult= {
	TestParm1: 'bla',
	TestParm2: 42,
	TestParm3: 27.6,
	TestParm4: true,
	TestParm5: moment(testDateString).toDate()
};


describe('MALCOLM Type convertion: input parameters must be converted to the types ' + 'described in raml file', function() {
	['Hapi', 'Express'].forEach(function(typeOfServer) {
		describe(typeOfServer + ' mode test suite', function() {
			var serverAndRouteHandler;
			var config = {'raml': './test/raml/api-type-conversion.raml'};

			before (function(done) {
				serverAndRouteHandler = utils.testSuiteInit(typeOfServer, config, testPoints, done);
			});

			afterEach(function() {
				serverAndRouteHandler.stubOfOriginalHandler.reset();
			});

			_.each(testPoints, function(test) {
				var url = test['url'];
				_.each(test['methods'], function(methodName) {
					_.each(baseDataSet, function(baseParmValue, baseParmName) {
						it (
							'Check for ' + test['description'] + ' (' + baseParmName + ', HTTP method: ' + methodName.toUpperCase() + ')',
							function(done) {
								var nameOfCollection = test['requestCollection'][typeOfServer];
								var nameOfParameter = methodName.toLowerCase() + baseParmName;
								var expectedResult = baseExpectedResult[baseParmName];

								new Req()
									.url(url)
									.method(methodName)
									.setCollectionKey( nameOfCollection, nameOfParameter, baseParmValue )
									.sendAndReceive(
										function(response) {
											var responseCode = response.responseCode;
											var resp = utils.cleanResponse(response.response);
											var result = resp[nameOfParameter];
											expect(serverAndRouteHandler.stubOfOriginalHandler).to.have.been.calledOnce;
											expect(responseCode).to.equal(utils.HANDLER_RETURNS_HTTP_CODE);
											if (moment.isMoment(result)) {
												expect(moment(testDateString).isSame(result)).to.be.true;
											} else {
												expect(result).to.deep.equal(expectedResult);
											}
										},
										done
									);
							}
						);

					});

				});
			});

		});
	});
});




