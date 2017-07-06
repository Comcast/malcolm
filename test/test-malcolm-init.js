/**
 * Tests for malcolm initialization (malcolm.init and nested methods)
 */

'use strict';

var malcolm = require('../index.js');
var chai = require('chai');
var expect = chai.expect;
var sinonChai = require('sinon-chai');
var utils = require('./utils/utils');
var _ = require('underscore-contrib');

chai.use(sinonChai);

describe ('Test Malcolm Initialization', function() {
	describe('Failed initialisation', function() {

		var testCases = {
			'Config object must be provided.': null,
			'Raml file must be provided (pConfigObj must contains key "raml" with non-empty value)': {
				jx: './test/jx/init-valid.jx'
			},
			'Raml file must be provided: (Raml file must exist)': {
				raml: './test/raml/missing-file',
				jx: './test/jx/init-valid.jx'
			},
			'Raml file must contains valid data': {
				raml: './test/raml/init-invalid.raml',
				jx: './test/jx/init-valid.jx'
			},
			'If pConfigObj.jx is set, corresponding json file must exist': {
				raml: './test/raml/init-valid.raml',
				jx: './test/jx/init-missing-file.jx'
			},
			'If Json file is present, it must contains valid data': {
				raml: './test/raml/init-valid.raml',
				jx: './test/jx/init-invalid.jx'
			}
		};

		for (var caseName in testCases) {
			(function(caseName, config) {

				it(caseName, function(done) {
					malcolm.init (config, function(error) {

						expect(error).to.be.an('object');
						done();
					});
				});

			})(caseName, testCases[caseName]);
		}

	});


	describe('Successful initialization', function() {
		describe('Base IRI building', function() {
			['Hapi', 'Express'].forEach(function(typeOfServer) {
				describe(typeOfServer + ' mode test suite', function() {
					var serverAndRouteHandler, baseUri, tailOfUri, ramlUri,
						overridedVersion, ramlVersion, ramlFile, inputRoutes;

					before(function() {
						ramlFile = './test/raml/init-valid.raml';
						baseUri = 'base/uri';
						tailOfUri = '/tailOfUri';
						ramlUri = 'raml.base.uri/';
						overridedVersion = 'v25';
						ramlVersion = 'v1';
						inputRoutes = [ {
							'url': tailOfUri,
							'methods': [ 'get' ]
						} ];

					});

					afterEach(function() {
						serverAndRouteHandler.stubOfOriginalHandler.reset();
						serverAndRouteHandler.server.resetRoutes();
					});

					it ('pConfigObj.baseUri overrides baseUri in RAML file if given', function(done) {
						var config = {
							'raml': ramlFile,
							'baseUri': baseUri
						};
						var expectedUri = baseUri + tailOfUri;

						serverAndRouteHandler = utils.testSuiteInit(typeOfServer, config, inputRoutes, function(err) {
							if (err) {
								done(err);
							} else {
								var resultRoutes = serverAndRouteHandler.server.getRoutes();

								expect( _.has(resultRoutes, expectedUri) ).to.be.true;
								done();
							}
						});
					});

					it ('pConfigObj.apiVersion overrides {version} in RAML file if given', function(done) {
						var config = {
							'raml': ramlFile,
							'apiVersion': overridedVersion
						};
						var expectedUri = ramlUri + overridedVersion + tailOfUri;

						serverAndRouteHandler = utils.testSuiteInit(typeOfServer, config, inputRoutes, function(err) {
							if (err) {
								done(err);
							} else {
								var resultRoutes = serverAndRouteHandler.server.getRoutes();

								expect( _.has(resultRoutes, expectedUri) ).to.be.true;
								done();
							}
						});
					});


					it ('Json file should be parsed if given', function(done) {
						var config = {
							'raml': ramlFile,
							'jx': './test/jx/init-valid.jx'
						};
						var expectedUri = ramlUri + ramlVersion + tailOfUri;

						serverAndRouteHandler = utils.testSuiteInit(typeOfServer, config, inputRoutes, function(err) {
							if (err) {
								done(err);
							} else {
								var resultRoutes = serverAndRouteHandler.server.getRoutes();

								expect( _.has(resultRoutes, expectedUri) ).to.be.true;
								done();
							}
						});
					});


				});

			});

		});
	});

});


