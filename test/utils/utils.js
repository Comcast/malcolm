'use strict';

var _            = require('underscore-contrib');
var sinon        = require('sinon');
var Req          = require('./request-helper');
var FakeServer   = require('./fake-hapi-and-express-server');
var RouteBuilder = require('./route-builder');
var malcolm      = require('../../index.js');

var HANDLER_RETURNS_HTTP_CODE = 777;

// Remove "_request" object from the response
var cleanResponse = function(response) {
	var result = {};
	for (var propName in response) {
		if (response.hasOwnProperty(propName) && propName.charAt(0) != '_') {
			result[propName] = response [propName];
		}
	}
	return result;
};

/**
 *
 * @param typeOfServer (mandatory)
 * @param pConfig (mandatory)
 * @param testPoints (mandatory)
 * @param done (mandatory)
 * @returns {{stubOfOriginalHandler: *, server: FakeServer}}
 */
var testSuiteInit = function(typeOfServer, pConfig, testPoints, done ) {

	var stubOfOriginalHandler = sinon.spy(function(params, callback) {
		callback(null, {
			responseCode: module.exports.HANDLER_RETURNS_HTTP_CODE,
			response: params
		});
	});

	var fakeServer = new FakeServer(typeOfServer, RouteBuilder);
	malcolm.init(
		pConfig,
		function(err) {
			if (err) {
				console.log(err);
				done(err);
				return;
			}

			RouteBuilder.prototype.setServerVersion(typeOfServer);
			RouteBuilder.prototype.setMalcolmVersion(malcolm);

			try {
				_.each(testPoints, function(test) {
					var url = test['url'];
					test['methods'].forEach( function(testMethod) {
						var method = testMethod.toUpperCase();
						var includeFakeDataSupport = !!test['includeFakeDataSupport'];

						if (typeOfServer.toLowerCase() === 'hapi') {
							malcolm.addHapiRoute(fakeServer, url, method, stubOfOriginalHandler, null, includeFakeDataSupport);
						} else {
							malcolm.addExpressRoute(fakeServer, url, method, stubOfOriginalHandler, includeFakeDataSupport);
						}
					});
				});
			} catch (e) {
				done(e);
				return;
			}
			done();
			return;
		}
	);

	Req.prototype.setApp(fakeServer);

	return {
		stubOfOriginalHandler : stubOfOriginalHandler,
		server                : fakeServer
	};
};

var buildDataSet = function(baseDataSet, method) {
	var resultDataSet = {};
	for (var baseParamName in baseDataSet) {
		resultDataSet[ method.toLowerCase() + baseParamName ] = baseDataSet[ baseParamName ];
	}
	return resultDataSet;
};

module.exports = {
	HANDLER_RETURNS_HTTP_CODE : HANDLER_RETURNS_HTTP_CODE,
	cleanResponse             : cleanResponse,
	testSuiteInit             : testSuiteInit,
	buildDataSet              : buildDataSet
};
