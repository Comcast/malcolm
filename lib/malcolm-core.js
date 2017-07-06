// Core Functions

'use strict';

var	_	           = require('underscore-contrib'),
	fs	           = require('fs'),
	path           = require('path'),
	url	           = require('url'),
	util           = require('./util.js'),
	malcolmUtil    = require('./malcolm-util.js'),
	malcolmExpress = require('./malcolm-express.js'),
	malcolmHapi    = require('./malcolm-hapi.js'),
	malcolmRaml    = require('./malcolm-raml.js'),
	malcolmDoc     = require('./malcolm-doc.js'),
	malcolmFake    = require('./malcolm-fake.js');

var loopByOwnProperties = util.loopByOwnProperties;
var log                 = malcolmUtil.log;
var getTypedValue       = malcolmUtil.getTypedValue;
var getHttpResponse     = malcolmUtil.getHttpResponse;

var	  defaultConfigObj
	, configObj               // Will hold config obj sent to init() overlayed on default config obj
	, oJx                     // Will hold extended metadata from the JSON optional file
	, oMeta                   // { '/resource[/subresource]': { 'get': {info}, 'post': {info} }, ...}
	, baseUri;                // Fully "baked" URI (with {version} suitably replaced or even overriden by client)

defaultConfigObj = {
	logging: {
		logFunction : console.log,
		logThis     : console
	},
	fakeDataKey : '_malcolmFake'
};



// @TODO: Remove
var getJx = function() {
	return oJx;
};
// @TODO: Remove
var getMeta = function() {
	return oMeta;
};



// Given relativeUri and method, return [ oResource, oMethod ]
// where oResource is a reference to the resource object within oMeta
// and oMethod is a reference to the method object within oResource within oMeta
var find = function(relativeUri, method) {
	var oResource, oMethod;

	oResource = null;
	oMethod	 = null;

	if ( oMeta.hasOwnProperty(relativeUri) ) {
		oResource = oMeta[relativeUri];
		if ( oResource.hasOwnProperty(method.toLowerCase()) ) {
			oMethod = oResource[method.toLowerCase()];
		}
	}
	return [ oResource, oMethod ];
};



// Given a reference to a resource object within oMeta and a reference to a
// method within that resource object within oMeta, return either null if
// there are no missing mandatory parameters or headers within the request
// object or an array of error strings indicating missing mandatory parameters
// and/or headers.
// Done separately from enforceValidationChecks so that default values
// applied via fillParamObject don't interfere.
var enforceMandatoryChecks = function(req, oResource, oMethod) {
	var errors, missing, queryParameters, headers;

	errors = [];

	queryParameters = oMethod.queryParameters;
	if ( queryParameters ) {
		queryParameters.forEach ( function(queryParameter) {
			if ( queryParameter.required ) {
				missing = true;
				['params', 'query', 'body', 'payload'].forEach (function(source) {
					if (req[source] && req[source][queryParameter.name]) {
						missing = false;
					}
				});

				if (missing) {
					errors.push('Mandatory query parameter "' + queryParameter.name + '" must be provided.');
				}
			}
		});
	}

	headers = oMethod.headers;
	if ( headers ) {
		headers.forEach ( function(header) {
			if ( header.required ) {
				if ( !req.headers[header.originalName] ) {
					errors.push('Mandatory header "' + header.name + '" must be provided.');
				}
			}
		});
	}

	if ( errors.length === 0 ) { return null; }
	return errors;
};



// Given a reference to a resource object within oMeta and a reference to a
// method within that resource object within oMeta, return either null if
// there are no parameter or header validation issues for any parameters or
// headers, or an array of error strings indicating parameter and/or
// header validation issues.
var enforceValidationChecks = function(params, oResource, oMethod) {
	var errors, sources, sourceName, sourceDescription, nameOfParameter, receivedValue, ramlRulesCollection, ramlRules;

	errors = [];
	sources = {
		'uriParameters'   : 'URI parameter',
		'queryParameters' : 'Query parameter',
		'headers'         : 'Header'
	};

	for (nameOfParameter in params) {
		for (sourceName in sources) {

			ramlRulesCollection = oMethod[sourceName];
			ramlRules = ramlRulesCollection ?
				_.findWhere(ramlRulesCollection, {'name': nameOfParameter})
				: false;
			if (ramlRules) {
				receivedValue = params[nameOfParameter];
				sourceDescription = sources[sourceName];

				if (ramlRules.minLength) {
					if (receivedValue.length < ramlRules.minLength) {
						errors.push(sourceDescription + ' "' + nameOfParameter + '" must be at least ' + ramlRules.minLength + ' characters long.');
					}
				}
				if (ramlRules.maxLength) {
					if (receivedValue.length > ramlRules.maxLength) {
						errors.push(sourceDescription + ' "' + nameOfParameter + '" must be no more than ' + ramlRules.maxLength + ' characters long.');
					}
				}
				if (ramlRules.minimum) {
					// @TODO: Deal with datatypes. String compare here the way things are! Yuck.
					if (receivedValue < ramlRules.minimum) {
						errors.push(sourceDescription + ' "' + nameOfParameter + '" must be greater than or equal to ' + ramlRules.minimum + '.');
					}
				}
				if (ramlRules.maximum) {
					// @TODO: Deal with datatypes. String compare here the way things are! Yuck.
					if (receivedValue > ramlRules.maximum) {
						errors.push(sourceDescription + ' "' + nameOfParameter + '" must be less than or equal to ' + ramlRules.maximum + '.');
					}
				}
				if (ramlRules.pattern) {
					var regex = new RegExp(ramlRules.pattern);
					if (!regex.test(receivedValue)) {
						errors.push(sourceDescription + ' "' + nameOfParameter + '" must be matched with the pattern ' + ramlRules.pattern + '.');
					}
				}
				if (ramlRules.enum) {
					if (ramlRules.enum.indexOf(receivedValue) < 0) {
						errors.push(sourceDescription + ' "' + nameOfParameter + '" must be one of the elements in ' + ramlRules.enum + '.');
					}
				}
			}
		}
	}

	return ( errors.length === 0 ? null : errors );
};



// Given a reference to a resource object within oMeta and a reference to a
// method within that resource object within oMeta, return a fully populated
// parameters object with the values from the request object if given, else
// the default values from the meta data
// Values may come from request.params[], request.query[], or request.body[]
// Datatype-specific conversions are done so that the returned param object
// has "real" ints, floats, booleans, etc. when appropriate
// No validation is done here.
var fillParamObject = function(req, resReply, oResource, oMethod) {
	var params, missing,
		queryParameters, queryParameterName, uriParameters, uriParameterName, headers;

	params = {};

	queryParameters = oMethod.queryParameters;
	if ( queryParameters ) {
		queryParameters.forEach( function(queryParameter) {
			queryParameterName = queryParameter.name;
			missing = true;
			['params', 'query', 'body', 'payload'].forEach(function(source) {
				if (missing && req[source] && req[source][queryParameterName]) {
					params[queryParameterName] = getTypedValue(req[source][queryParameterName], queryParameter.type);
					missing = false;
				}
			});

			if ( missing && queryParameter.hasOwnProperty('default') ) {
				params[queryParameter.name] = getTypedValue(queryParameter.default, queryParameter.type);
			}
		});
	}

	uriParameters = oMethod.uriParameters;
	if ( uriParameters ) {
		uriParameters.forEach(function(uriParameter) {
			uriParameterName = uriParameter.name;
			missing = true;
			if (req['params'] && req['params'][uriParameterName]) {
				params[uriParameterName] = getTypedValue(req['params'][uriParameterName], uriParameter.type);
				missing = false;
			}
			if ( missing && uriParameter.hasOwnProperty('default') ) {
				params[uriParameter.name] = getTypedValue(uriParameter.default, uriParameter.type);
			}
		});
	}


	headers = oMethod.headers;
	if ( headers ) {
		headers.forEach(function(header) {
			if ( req.headers[header.originalName] ) {
				params[header.name] = getTypedValue(req.headers[header.originalName], header.type);
			} else if ( header.hasOwnProperty('default') ) {
				params[header.name] = getTypedValue(header.default, header.type);
			}
		});
	}

	// Pass request object and the response object / reply function in params
	// just in case a client needs "direct" access
	if ( req ) {
		params._request = req;
	}
	if ( resReply ) {
		// Use both 'names' for convenience
		params._response = resReply; // For Express
		params._reply    = resReply; // For HAPI
	}
	
	return params;
};



// The "meat" of the route handler that gets added to the middleware framework
// req is the request object for both Express and Hapi.
// resReply is the response object for Express or the reply object for Hapi.
// params is an object with these keys
// - appServer              : This is the Express app object
// - relativeUri            : The relative URI for the route being added. E.g., /search
// - method                 : The HTTP method for the route being added. E.g., GET
// - fcn                    : The API implementation function.
// - authStrategy           : @TODO
// - includeFakeDataSupport : Whether to support fake data responses. true / false
// - fNoCache               : Appropriate function to set no-cache pragma
// - fRespond               : Appropriate function to respond, based on middleware framework
// - fullRelativeUri        : Derived from base URI and relative URI
// - oResource              : Object representing the resource (that corresponds to relativeUri)
// - oMethod                : Object representing the method (that corresponds to method)
var coreHandler = function(req, resReply, handlerParams) {
	var oResource, oMethod, fcn, includeFakeDataSupport, fNoCache, fRespond,
		errors, params, fakeDataKey, responseContentType;

	oResource              = handlerParams.oResource;
	oMethod	               = handlerParams.oMethod;
	fcn                    = handlerParams.fcn;
	includeFakeDataSupport = handlerParams.includeFakeDataSupport;
	fNoCache               = handlerParams.fNoCache;
	fRespond               = handlerParams.fRespond;

	errors = enforceMandatoryChecks(req, oResource, oMethod);
	if ( errors ) {
		fRespond.call(null, resReply, 400, errors);
		return;
	}

	params = fillParamObject(req, resReply, oResource, oMethod);
	errors = enforceValidationChecks(params, oResource, oMethod);
	if ( errors ) {
		fRespond.call(null, resReply, 400, errors);
		return;
	}

	if ( includeFakeDataSupport ) {
		fakeDataKey = req.query && req.query[configObj.fakeDataKey] || 
			req.body && req.body[configObj.fakeDataKey] || 
			req.payload && req.payload[configObj.fakeDataKey] || 
			null;
		if ( fakeDataKey ) {
			malcolmFake.respondWithFakeData(resReply, handlerParams.relativeUri, handlerParams.method, fakeDataKey, fRespond);
			return;
		}
	}

	// Call the implementation function for the "meat" of this route
	fcn.call(null, params, function(err, result) {
		var httpResponseInfo, responseCode, response;

		if ( err ) {
			log('malcolm::coreHandler: route implementation function error: ' + JSON.stringify(err));
			responseCode = err.statusCode || 500;
			fRespond.call(null, resReply, responseCode, err);
			return;
		}
		httpResponseInfo = getHttpResponse(result);
		responseCode        = httpResponseInfo[0];
		response            = httpResponseInfo[1];
		responseContentType = httpResponseInfo[2];
		if ( oMethod.noCache ) { fNoCache.call(null, resReply); }
		fRespond.call(null, resReply, responseCode, response, responseContentType);
		return;
	});
	return;
};



// Once RAML file is read/parsed, set up efficient datastructures
// This can/should be called within init after malcolm.loadRaml is called
var preprocess = function() {
	var metaResource, metaMethod;

	// Pre-process the metadata in RAML file
	malcolmRaml.preprocess(oMeta);

	// Pre-process extended metadata in JX file
	// Loop through resource keys in oJx (from JX file)
	loopByOwnProperties (oJx, function(jxResourceValue, jxResourceName) {
		// Loop through method keys within resource within oJX (from JX file)
		loopByOwnProperties (jxResourceValue, function(jxMethodValue, jxMethodName) {
			// Ensure the oMeta object has this same resource
			if ( oMeta.hasOwnProperty(jxResourceName) ) {
				metaResource = oMeta[jxResourceName];
				// Ensure the resource object within the oMeta object has this same method
				if ( metaResource.hasOwnProperty(jxMethodName) ) {
					metaMethod = metaResource[jxMethodName];

					// Copy over important extended metadata fields from oJX (JX file) to oMeta
					['noCache', 'fcn', 'mocks', 'tests'].forEach (function(propertyName) {
						if ( jxMethodValue.hasOwnProperty(propertyName) ) {
							metaMethod[propertyName] = jxMethodValue[propertyName];
						}
					});
				}
			}
		});
	});

	// oMeta now has the good stuff!
};



// Initialize malcolm
// - pConfigObj is mandatory
//	 - pConfigObj.raml is mandatory
//	 - pConfigObj.jx is optional
//	 - pConfigObj.apiVersion is optional; overrides version in RAML file if given. Unused if pConfig.baseUri is given.
//	 - pConfigObj.baseUri is optional; overrides baseUri in RAML file if given
//	 - All other keys are optional (and have implied default values)
// - Returns result via callback called with non-null err value or a result value
var init = function(pConfigObj, callback) {
	var urlParts;

	if ( !pConfigObj ) {
		callback({ status: 'ERROR', message: 'Config object must be provided' });
		return;
	}

	malcolmRaml.init();
	oJx   = null;
	oMeta = {};		// Note: empty object, not null!

	// Lay provided configuration object over default configuration object
	configObj = _.clone(defaultConfigObj);
	_.extend(configObj, pConfigObj);

	if ( !configObj.raml ) {
		oMeta = null;
		callback({ status: 'ERROR', message: 'RAML file must be provided.' });
		return;
	}

	if ( configObj.logging && configObj.logging.logFunction && configObj.logging.logThis ) {
		malcolmUtil.initLogging(configObj.logging.logFunction, configObj.logging.logThis);
	}

	malcolmRaml.loadRaml(configObj, function(err, unused) {
		var ramlBaseUri;

		if ( err ) { callback(err); return; }

		if ( configObj.hasOwnProperty('baseUri') ) {
			baseUri = configObj.baseUri;
		} else if ( configObj.hasOwnProperty('apiVersion') ) {
			ramlBaseUri = malcolmRaml.get('baseUri');
			baseUri = ramlBaseUri.replace('{version}', configObj.apiVersion);
		} else {
			ramlBaseUri = malcolmRaml.get('baseUri');
			baseUri = ramlBaseUri.replace('{version}', malcolmRaml.get('version'));
		}
		// Now trim protocol, port, and host. Just leave something like "/services/v1"
		urlParts = url.parse(baseUri, true);
		baseUri = urlParts.path;

		if ( !configObj.jx ) {
			oJx = null;
			preprocess();
			malcolmFake.setTopLevelPath(path.dirname(configObj.raml));
			callback(null, { status: 'OK' });
			return;
		}

		fs.readFile(configObj.jx, 'utf8', function(err, data) {
			if ( err ) {
				callback({
					status: 'ERROR',
					errorCode: 'COULD-NOT-LOAD-JX',
					message: 'Error attempting to load json file.',
					error: err
				});
				return;
			}
			try {
				oJx = JSON.parse(data);
				
			} catch (error) {
				callback({
					status: 'ERROR',
					errorCode: 'COULD-NOT-PARSE-JX',
					message: 'Error attempting to parse json file.',
					error: error
				});
				return;
			}
			preprocess();
			malcolmFake.setTopLevelPath(path.dirname(configObj.raml));
			callback(null, {status: 'OK'});
			return;
		});
		return;
	});
};



// Throws an exception if:
// - relativeUri is falsy
// - method is falsy
// - method is something unsupported (GET, PUT, POST, DELETE)
// - relativeUri and/or method are not found within RAML
// Returns a two-element array [resource object, method object] if nothing is wrong
var validateRelativeUriAndMethod = function(functionName, relativeUri, method) {
	var mth, tmp, oResource, oMethod;

	if ( !relativeUri ) { throw new Error(functionName + ' requires a relativeUri value.'); }
	if ( !method )      { throw new Error(functionName + ' requires a method value.'); }

	mth = ( method ? method.toUpperCase() : null );
	if ( mth !== 'GET' && mth !== 'PUT' && mth !== 'POST' && mth !== 'DELETE' ) {
		throw new Error(functionName + ' cannot handle a method value of "' + method + '".');
	}

	tmp = find(relativeUri, mth);
	oResource = tmp[0];
	oMethod	  = tmp[1];

	if ( !oResource ) {
		throw new Error(functionName + ' cannot find the resource URI "' + relativeUri + '" within your RAML file.');
	}
	if ( !oMethod )	 {
		throw new Error(functionName + ' cannot find a method "' + method +
			'" for the resource URI "' + relativeUri + '" within your RAML file.');
	}

	return tmp;
};



// Parameters:
// - module is expected to be the module object as passed by the caller
//   of addExpressRoutes() or addHapiRoutes()
// - pathFileFuncName is expected to look like: controllers/math.js:generaterandomnumber
// Returns:
// - a JS Function object that is the implementation of the specified function
var getFunctionObject = function(module, pathFileFuncName) {
	var pieces, pathFile, funcName, mod, fcn;

	pieces = ( pathFileFuncName ? pathFileFuncName.split(':') : null );
	pathFile = ( ( pieces && pieces.length > 0 ) ? pieces[0] : null );
	funcName = ( ( pieces && pieces.length > 1 ) ? pieces[1] : null );
	mod = ( module ? _.find(module.children, function(mm) { return mm.filename.endsWith(pathFile); }) : null );
	fcn = ( mod && mod.exports ? mod.exports[funcName] : null );
	return fcn;
};



// Internal function used by addExpressRoute and addHapiRoute
// Example usage: addRoute({
//	appServer                : app -OR- server (the app object for Express or the server object for Hapi)
//	relativeUri	             : '/search',
//	method                   : 'GET',
//  coreHandler              : coreHandler
//	fcn	                     : searchController.search,
//	authStrategy             : @TODO: OPENISSUE: What goes here?
//	includeFakeDataSupport	 : true,
//	fGenerateFullRelativeUri : f(baseUri, relativeUri) that returns fullRelativeUri,
//	fNoCache                 : f(resReply) that sets no-cache pragma
//	fRespond                 : f(resReply, responseCode, response, responseContentType) that sends HTTP response w/ response code
// });
var addRoute = function(params) {
	var tmp, oResource, oMethod,
		fullRelativeUri;

	tmp = validateRelativeUriAndMethod('malcolm.addRoute', params.relativeUri, params.method);
	oResource = tmp[0];
	oMethod	 = tmp[1];

	// Generate the full relative URI (different for each middleware framework)
	fullRelativeUri = params.fGenerateFullRelativeUri.call(null, baseUri, params.relativeUri);

	// Add the route to the middleware framework
	params.fAddRoute.call(null, {
		appServer              : params.appServer,
		relativeUri            : params.relativeUri,
		method                 : params.method,
		coreHandler            : coreHandler,
		fcn	                   : params.fcn,
		authStrategy           : params.authStrategy,
		includeFakeDataSupport : params.includeFakeDataSupport,
		fNoCache               : params.fNoCache,
		fRespond               : params.fRespond,
		fullRelativeUri        : fullRelativeUri,
		oResource              : oResource,
		oMethod	               : oMethod
	});
};



// Main entry point to add an Express route
// Example usage: malcolm.addExpressRoute(app, '/search', 'GET', searchController.search, true);
var addExpressRoute = function(app, relativeUri, method, fcn, includeFakeDataSupport) {
	addRoute({
		appServer                : app,
		relativeUri              : relativeUri,
		method                   : method,
		coreHandler              : coreHandler,
		fcn	                     : fcn,
		includeFakeDataSupport	 : ( typeof includeFakeDataSupport === 'undefined' ? true : includeFakeDataSupport ),
		fGenerateFullRelativeUri : malcolmExpress.generateFullRelativeUri,
		fNoCache                 : malcolmExpress.noCache,
		fAddRoute                : malcolmExpress.addRoute,
		fRespond                 : malcolmExpress.respond
	});
};



// Main entry point to add all Express routes at once
// Example usage: malcolm.addExpressRoutes(app, true);
// Depends on the JX file containing fcn values for all methods on all routes
var addExpressRoutes = function(app, module, includeFakeDataSupport) {
	// Loop through resource keys in oMeta object
	loopByOwnProperties(oMeta, function(metaResourceValue, metaResourceName) {
		// Loop through method keys within resource within oMeta object
		loopByOwnProperties(metaResourceValue, function(metaMethodValue, metaMethodName) {
			var fcn;
			fcn = getFunctionObject(module, metaMethodValue.fcn);
			if ( !fcn ) {
				log('malcolm::addExpressRoutes: Critical Error: Could not add route for resource ' +
					metaResourceName + ' and method ' + metaMethodName);
			} else {
				log('malcolm: Adding route for ' +
					metaMethodName + ' on ' + metaResourceName +
					', which invokes ' + metaMethodValue.fcn);
				addExpressRoute(app, metaResourceName, metaMethodName.toUpperCase(),
					fcn, includeFakeDataSupport);
			}
		});
	});
};



// Main entry point to add a Hapi route
// Example usage: malcolm.addHapiRoute(app, '/search', 'GET', '@TODO', searchController.search, true);
var addHapiRoute = function(server, relativeUri, method, fcn, authStrategy, includeFakeDataSupport) {
	addRoute({
		appServer                : server,
		relativeUri              : relativeUri,
		method                   : method,
		coreHandler              : coreHandler,
		fcn	                     : fcn,
		authStrategy             : authStrategy,
		includeFakeDataSupport	 : ( typeof includeFakeDataSupport === 'undefined' ? true : includeFakeDataSupport ),
		fGenerateFullRelativeUri : malcolmHapi.generateFullRelativeUri,
		fNoCache                 : malcolmHapi.noCache,
		fAddRoute                : malcolmHapi.addRoute,
		fRespond                 : malcolmHapi.respond
	});
};



// Main entry point to add all HAPI routes at once
// Example usage: malcolm.addHapiRoutes(app, authStrategy, true);
// Depends on the JX file containing fcn values for all methods on all routes
var addHapiRoutes = function(app, module, authStrategy, includeFakeDataSupport) {
	// Loop through resource keys in oMeta object
	loopByOwnProperties(oMeta, function(metaResourceValue, metaResourceName) {
		// Loop through method keys within resource within oMeta object
		loopByOwnProperties(metaResourceValue, function(metaMethodValue, metaMethodName) {
			var fcn;
			fcn = getFunctionObject(module, metaMethodValue.fcn);
			if ( !fcn ) {
				log('malcolm::addHapiRoutes: Critical Error: Could not add route for resource ' +
					metaResourceName + ' and method ' + metaMethodName);
			} else {
				log('malcolm: Adding route for ' +
					metaMethodName + ' on ' + metaResourceName +
					', which invokes ' + metaMethodValue.fcn);
				addHapiRoute(app, metaResourceName, metaMethodName.toUpperCase(),
					fcn, authStrategy, includeFakeDataSupport);
			}
		});
	});
};



// -------------------- Express and HAPI routes for "direct use" by client routes --------------------



var getVersionInfo = function() {
	var versionInfo = malcolmRaml.getVersionInfo();
	return versionInfo;
};



var version = function(req, resOrReply, expressOrHapi) {
	var versionInfo;
	versionInfo = getVersionInfo();
	expressOrHapi.respondJson.call(null, resOrReply, 200, versionInfo);
};
// Express route to return version info as JSON
var expressVersion = function(req, res) {
	version(req, res, malcolmExpress);
};
// HAPI route to return version info as JSON
var hapiVersion = function(req, reply) {
	version(req, reply, malcolmHapi);
};



var doc = function(req, resOrReply, expressOrHapi) {
	malcolmDoc.generateDocumentation(configObj.raml, function(err, docHtml) {
		var errHtml;
		if ( err ) {
			log('malcolm::doc: generateDocumentation error:');
			log(JSON.stringify(err));
			errHtml = '<html><head><title>Error</title></head><body>' +
				'<h1>An error occurred.</h1>' +
				'<p>' + JSON.stringify(err) + '</p>' +
				'</body></html>';
			expressOrHapi.respondHtml.call(null, resOrReply, errHtml);
		} else {
			expressOrHapi.respondHtml.call(null, resOrReply, docHtml);
		}
	});
};
// Express route to return API documentation as HTML
var expressDoc = function(req, res) {
	doc(req, res, malcolmExpress);
};
// HAPI route to return API documentation as HTML
var hapiDoc = function(req, reply) {
	doc(req, reply, malcolmHapi);
};



var addFakeDataResponse = function(req, resOrReply, expressOrHapi) {
	var bodyProp, relativeUri, method, fakeDataKey, response, errMsg;

	bodyProp = ( req.body ? 'body' : ( req.payload ? 'payload' : null ) );
	if ( bodyProp ) {
		relativeUri = req[bodyProp].relativeUri;
		method      = req[bodyProp].method;
		fakeDataKey = req[bodyProp].fakeDataKey;
		response    = req[bodyProp].response;       // String!
		if ( !relativeUri || !method || !fakeDataKey || !response ) {
			errMsg = 'Missing one or more of: relativeUri, method, fakeDataKey, response.';
			expressOrHapi.respondJson.call(null, resOrReply, 400, { status: 'ERROR', message: errMsg });
			return;
		}
		malcolmFake.addFakeDataResponse(relativeUri, method, fakeDataKey, response);
		expressOrHapi.respondJson.call(null, resOrReply, 200, { status: 'OK' });
		return;
	} else {
		errMsg = 'Could not find request body. Did you GET instead of POST?';
		expressOrHapi.respondJson.call(null, resOrReply, 400, { status: 'ERROR', message: errMsg });
		return;
	}
};
// Express route to add a fake data response
// Expects method POST and body like { relativeUri: xxx, method: xxx, fakeDataKey: xxx, response: xxx }
// Note that req.body.response comes in as a JSON string, not an object
var expressAddFakeDataResponse = function(req, res) {
	addFakeDataResponse(req, res, malcolmExpress);
};
// HAPI route to add a fake data response
// Expects method POST and body like { relativeUri: xxx, method: xxx, fakeDataKey: xxx, response: xxx }
// Note that req.body.response comes in as a JSON string, not an object
var hapiAddFakeDataResponse = function(req, reply) {
	addFakeDataResponse(req, reply, malcolmHapi);
};



var clearFakeDataResponse = function(req, resOrReply, expressOrHapi) {
	var bodyProp, relativeUri, method, fakeDataKey, errMsg;

	bodyProp = ( req.body ? 'body' : ( req.payload ? 'payload' : null ) );
	if ( bodyProp ) {
		relativeUri = req[bodyProp].relativeUri;
		method      = req[bodyProp].method;
		fakeDataKey = req[bodyProp].fakeDataKey;
		if ( !relativeUri || !method || !fakeDataKey ) {
			errMsg = 'Missing one or more of: relativeUri, method, fakeDataKey.';
			expressOrHapi.respondJson.call(null, resOrReply, 400, { status: 'ERROR', message: errMsg });
			return;
		}
		malcolmFake.clearFakeDataResponse(relativeUri, method, fakeDataKey);
		expressOrHapi.respondJson.call(null, resOrReply, 200, { status: 'OK' });
		return;
	} else {
		errMsg = 'Could not find request body. Did you GET instead of POST?';
		expressOrHapi.respondJson.call(null, resOrReply, 400, { status: 'ERROR', message: errMsg });
		return;
	}
};
// Express route to remove a fake data response
// Expects method DELETE and body like { relativeUri: xxx, method: xxx, fakeDataKey: xxx }
var expressClearFakeDataResponse = function(req, res) {
	clearFakeDataResponse(req, res, malcolmExpress);
};
// HAPI route to remove a fake data response
// Expects method DELETE and body like { relativeUri: xxx, method: xxx, fakeDataKey: xxx }
var hapiClearFakeDataResponse = function(req, reply) {
	clearFakeDataResponse(req, reply, malcolmHapi);
};



// -------------------- Exports --------------------



// Public API ("covered" by malcolm.js)
exports.init                         = init;
exports.addExpressRoutes             = addExpressRoutes;
exports.addExpressRoute              = addExpressRoute;
exports.addHapiRoutes                = addHapiRoutes;
exports.addHapiRoute                 = addHapiRoute;

// Express routes for "direct use" by clients ("covered" by malcolm.js)
exports.expressVersion               = expressVersion;
exports.expressDoc                   = expressDoc;
exports.expressAddFakeDataResponse   = expressAddFakeDataResponse;
exports.expressClearFakeDataResponse = expressClearFakeDataResponse;

// HAPI routes for "direct use" by clients ("covered" by malcolm.js)
exports.hapiVersion                  = hapiVersion;
exports.hapiDoc                      = hapiDoc;
exports.hapiAddFakeDataResponse      = hapiAddFakeDataResponse;
exports.hapiClearFakeDataResponse    = hapiClearFakeDataResponse;

// @TODO: Remove
exports.getJx                        = getJx;
exports.getMeta                      = getMeta;
