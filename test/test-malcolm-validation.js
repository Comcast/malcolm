
'use strict';

var _ = require('underscore-contrib');
var chai = require('chai');
var expect = chai.expect;
var sinonChai = require('sinon-chai');
var Req = require('./utils/request-helper');
var testPoints = require('./presets/test-points');
var utils = require('./utils/utils');

chai.use(sinonChai);

describe('MALCOLM Validation: If any parameter or header has some limitations (minLength, maxlength, ' +
					'minimum, maximum, pattern, enum) malcolm must check them.', function() {
	['Hapi', 'Express'].forEach(function(typeOfServer) {
		describe(typeOfServer + ' mode test suite', function() {
			var serverAndRouteHandler, baseDataSet;

			before(function(done) {
				var pConfig = { raml: './test/raml/api-validation.raml' };
				serverAndRouteHandler = utils.testSuiteInit(typeOfServer, pConfig, testPoints, done);
			});

			afterEach(function() {
				serverAndRouteHandler.stubOfOriginalHandler.reset();
			});

			baseDataSet = [
				{
					'name': 'TestParm0',
					'validValues': ['ab', '123', '~!@#'],
					'invalidValues': ['1', 'q'],
					'description': 'min length'
				},
				{
					'name': 'TestParm1',
					'validValues': ['1', '->', '///', '"'],
					'invalidValues': ['too long', '1234'],
					'description': 'max length'
				},
				{
					'name': 'TestParm2',
					'validValues': ['5', '20', '777'],
					'invalidValues': ['-18', '0', '4'],
					'description': 'minimum'
				},
				{
					'name': 'TestParm3',
					'validValues': ['-100', '0', '6'],
					'invalidValues': ['7', '12345'],
					'description': 'maximum'
				},
				{
					'name': 'TestParm4',
					'validValues': ['+100', '+1999'],
					'invalidValues': ['1000', '+10', '+12345'],
					'description': 'pattern'
				},
				{
					'name': 'TestParm5',
					'validValues': ['a', 'b'],
					'invalidValues': ['c', 'ab', 'aa'],
					'description': 'enum'
				}
			];

			_.each(testPoints, function(testPoint) {
				var nameOfCollection = testPoint['requestCollection'][typeOfServer];

				_.each(testPoint['methods'], function(methodName) {

					describe (
						'Check for ' + testPoint['description'] + ' (HTTP method: ' + methodName.toUpperCase()+ ')',
						function() {
							_.each(baseDataSet, function(baseTestParameter) {
								var limitation = baseTestParameter['description'];
								var nameOfParameter = methodName.toLowerCase() + baseTestParameter['name'];

								baseTestParameter.validValues.forEach(function(testValue) {
									it('Validation of ' + limitation + ' for "' + testValue + '" should pass', function(done) {
										new Req()
											.url(testPoint['url'])
											.method(methodName)
											.setCollectionKey(nameOfCollection, nameOfParameter, testValue)
											.sendAndReceive(
												function(response) {
													var responseCode = response.responseCode;
													expect(serverAndRouteHandler.stubOfOriginalHandler).to.have.been.calledOnce;
													expect(responseCode).to.equal(utils.HANDLER_RETURNS_HTTP_CODE);
												},
												done
											);
									});
								});

								baseTestParameter.invalidValues.forEach(function(testValue) {
									it('Validation of ' + limitation + ' for "' + testValue + '" should fail', function(done) {
										new Req()
											.url(testPoint['url'])
											.method(methodName)
											.setCollectionKey(nameOfCollection, nameOfParameter, testValue)
											.sendAndReceive(
												function(response) {
													var responseCode = response.responseCode;
													expect(serverAndRouteHandler.stubOfOriginalHandler).to.have.not.been.called;
													expect(responseCode).to.equal(400);
												},
												done
											);
									});
								});

							});

						}
					);
				});
			});

		});
	});
});

