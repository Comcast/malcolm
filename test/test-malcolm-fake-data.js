'use strict';

var _           = require('underscore-contrib');
var chai        = require('chai');
var Req         = require('./utils/request-helper');
var utils       = require('./utils/utils');
var malcolmFake	= require('../lib/malcolm-fake.js');

var expect = chai.expect;

var testPoints = {
	'getFakeDataTestModeOnKeyIsSet': {
		'description'            : 'should return fake data when fake mode is on and correct key is set',
		'url'                    : '/getFakeDataTestModeOnKeyIsSet',
		'requestCollection'      : {Hapi: 'query', Express: 'query'},
		'includeFakeDataSupport' : true,
		'methods'                : ['get'],
		'params'                 : {'_malcolmFake': 'test1'},
		'expectedResult'         : {
			'callOrigHandler' : false,
			'responseCode'    :	200,
			'response'        :	{'fakeData': true, 'testName': 'test1'}
		}
	},

	'postFakeDataTest': {
		'description'            : 'should return fake data when fake mode is on and correct key is set',
		'url'                    : '/postFakeDataTest',
		'requestCollection'      : {Hapi: 'payload', Express: 'body'},
		'includeFakeDataSupport' : true,
		'methods'                : ['post'],
		'params'                 : {'_malcolmFake': 'test4'},
		'expectedResult'         : {
			'callOrigHandler' : false,
			'responseCode'    : 200,
			'response'        : {'fakeData': true, 'testName': 'test4'}
		}
	},

	'getFakeDataTestModeOnKeyIsNotSet': {
		'description'            : 'should return original data when fake mode is on and key is not set',
		'url'                    : '/getFakeDataTestModeOnKeyIsNotSet',
		'requestCollection'      : {Hapi: 'query', Express: 'query'},
		'includeFakeDataSupport' : true,
		'methods'                : ['get'],
		'params'                 : {'someParam': 'some value'},
		'expectedResult'         : {
			'callOrigHandler' : true,
			'responseCode'    : utils.HANDLER_RETURNS_HTTP_CODE,
			'response'        : {'someParam': 'some value'}
		}
	},

	'getFakeDataTestModeOffKeyIsSet': {
		'description'            : 'should return original data when fake mode is off and key is set',
		'url'                    : '/getFakeDataTestModeOffKeyIsSet',
		'requestCollection'      : {Hapi: 'query', Express: 'query'},
		'includeFakeDataSupport' : false,
		'methods'                : ['get'],
		'params'                 : {'someParam': 'some value', '_malcolmFake': 'test3'},
		'expectedResult'         : {
			'callOrigHandler' : true,
			'responseCode'    : utils.HANDLER_RETURNS_HTTP_CODE,
			'response'        : {'someParam': 'some value'}
		}
	},

	'getFakeDataTestNoFile': {
		'description'            : 'should fail when there is no associated JSON for fake data',
		'url'                    : '/getFakeDataTestNoFile',
		'requestCollection'      : {Hapi: 'query', Express: 'query'},
		'includeFakeDataSupport' : true,
		'methods'                : ['get'],
		'params'                 : {'someParam': 'some value', '_malcolmFake': 'test1'},
		'expectedResult'         : {
			'callOrigHandler' : false,
			'responseCode'    : 500,
			'response'        : {
				'errorCode' : 'COULD-NOT-READ-MOCK-DATA-FILE',
				'message'   : 'Could not read mock data file test/raml/mocks/getFakeDataTestNoFile/get/test1.json.',
				'status'    : 'ERROR'
			}
		}
	},

	'getFakeDataTestIncorrectJson': {
		'description'            : 'should fail when there is incorrect JSON for fake data',
		'url'                    : '/getFakeDataTestIncorrectJson',
		'requestCollection'      : {Hapi: 'query', Express: 'query'},
		'includeFakeDataSupport' : true,
		'methods'                : ['get'],
		'params'                 : {'_malcolmFake': 'test'},
		'expectedResult'         : {
			'callOrigHandler' : false,
			'responseCode'    : 500,
			'response'        : {
				'errorCode' : 'COULD-NOT-PROCESS-MOCK-DATA-FILE',
				'message'   : 'Could not process mock data file test/raml/mocks/getFakeDataTestIncorrectJson/get/test.json.',
				'status'    : 'ERROR'
			}
		}
	},

	'addFakeDataResponse': {
		'description'            : 'should add/change fake data to already added route',
		'url'                    : '/addFakeDataResponseTest',
		'requestCollection'      : {Hapi: 'query', Express: 'query'},
		'includeFakeDataSupport' : true,
		'methods'                : ['get'],
		'params'                 : {'_malcolmFake': 'test2'},
		'expectedResult'         : {
			'callOrigHandler' : false,
			'responseCode'    : 200,
			'response'        : {'fakeData': true, 'testName': 'test2'}
		}
	},

	'clearFakeDataResponse': {
		'description'            : 'should remove fake data for specified route',
		'url'                    : '/clearFakeDataResponseTest',
		'requestCollection'      : {Hapi: 'query', Express: 'query'},
		'includeFakeDataSupport' : true,
		'methods'                : ['get'],
		'params'                 : {'_malcolmFake': 'test2'},
		'expectedResult'         : {
			'callOrigHandler' : false,
			'responseCode'    : 500,
			'response'        : {
				'errorCode' : 'COULD-NOT-READ-MOCK-DATA-FILE',
				'message'   : 'Could not read mock data file test/raml/mocks/clearFakeDataResponseTest/get/test2.json.',
				'status'    : 'ERROR'
			}
		}
	}

};


describe('Fake data tests for', function() {
	['Hapi', 'Express'].forEach(function(typeOfServer) {
		describe(typeOfServer + ' server', function() {
			var serverAndRouteHandler;

			before(function(done) {
				var config = {'raml': './test/raml/fake-data.raml'};
				serverAndRouteHandler = utils.testSuiteInit(typeOfServer, config, testPoints, done);
			});

			afterEach(function() {
				serverAndRouteHandler.stubOfOriginalHandler.reset();
			});


			_.each(testPoints, function(testPoint, testPointKey) {
				var methodName = testPoint['methods'][0];

				it(testPoint['description'] + ' (HTTP method: ' + methodName.toUpperCase() + ')',
					function(done) {
						var url              = testPoint['url'];
						var nameOfCollection = testPoint['requestCollection'][typeOfServer];
						var dataSet          = testPoint['params'];
						var expectedResult   = testPoint['expectedResult'];

						// specific tests
						switch (testPointKey) {
							case 'addFakeDataResponse':
								malcolmFake.addFakeDataResponse(url, methodName, 'test2', expectedResult.response);
								break;
							case 'clearFakeDataResponse':
								malcolmFake.addFakeDataResponse(url, methodName, 'test2', expectedResult.response);
								malcolmFake.clearFakeDataResponse(url, methodName, 'test2');
								break;
						}
						
						new Req()
							.url(url)
							.method(methodName)
							.setCollection( nameOfCollection, dataSet )
							.sendAndReceive(
								function(response) {
									var responseCode = response.responseCode;
									var resp = utils.cleanResponse(response.response);

									if (expectedResult.callOrigHandler) {
										expect(serverAndRouteHandler.stubOfOriginalHandler).to.have.been.calledOnce;
									} else {
										expect(serverAndRouteHandler.stubOfOriginalHandler).to.have.not.been.called;
									}

									expect(responseCode).to.equal(expectedResult.responseCode);
									expect(resp).to.deep.equal(expectedResult.response);
								},
								done
							);
					}
				);
			});
		});
	});
});
