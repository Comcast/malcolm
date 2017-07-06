
'use strict';

var _ = require('underscore-contrib');
var chai = require('chai');
var expect = chai.expect;
var sinonChai = require('sinon-chai');
var Req = require('./utils/request-helper');
var testPoints = require('./presets/test-points');
var utils = require('./utils/utils');

chai.use(sinonChai);

var baseDataSet = {
	TestParm0: 'bla',
	TestParm1: 'bla-bla',
	NotPresentInRaml: 'bla-bla-bla'
};
var baseExpectedResult = {
	TestParm0: 'bla',
	TestParm1: 'bla-bla'
};


describe('MALCOLM Filtering: handler should receive only those parameters, which are ' + 'described in raml file for the given HTTP method and URI.', function() {
	['Hapi', 'Express'].forEach(function(typeOfServer) {
		describe(typeOfServer + ' mode test suite', function() {
			var serverAndRouteHandler;

			before (function(done) {
				var config = {'raml': './test/raml/api-filtering.raml'};
				serverAndRouteHandler = utils.testSuiteInit(typeOfServer, config, testPoints, done);
			});

			afterEach(function() {
				serverAndRouteHandler.stubOfOriginalHandler.reset();
			});

			_.each(testPoints, function(test) {
				var url = test['url'];
				_.each(test['methods'], function(methodName) {
					it (
						'Check for ' + test['description'] + ' (HTTP method: ' + methodName.toUpperCase() + ')',
						function(done) {
							var nameOfCollection = test['requestCollection'][typeOfServer];
							var dataSet = utils.buildDataSet(baseDataSet, methodName);
							var expectedResult = utils.buildDataSet(baseExpectedResult, methodName);
							new Req()
								.url(url)
								.method(methodName)
								.setCollection( nameOfCollection, dataSet )
								.sendAndReceive(
									function(response) {
										var responseCode = response.responseCode;
										var resp = utils.cleanResponse(response.response);

										expect(serverAndRouteHandler.stubOfOriginalHandler).to.have.been.calledOnce;
										expect(responseCode).to.equal(utils.HANDLER_RETURNS_HTTP_CODE);
										expect(resp).to.deep.equal(expectedResult);
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





