// Express-specific "callback" functions used within malcolm-core

'use strict';



var generateFullRelativeUri = function(baseUri, relativeUri) {
	// RAML parameterized routes look like /resource/{resourceId}.
	// Express parameterized routes look like /resource/:resourceId.
	// So, convert /resource/{foo} to /resource:foo
	return baseUri + relativeUri.replace(/\{([a-zA-Z_0-9]+)\}/g, ':$1');
};



// Params is an object with these keys
// - appServer              : This is the Express app object
// - relativeUri            : The relative URI for the route being added. E.g., /search
// - method                 : The HTTP method for the route being added. E.g., GET
// - coreHandler            : The coreHandler function
// - fcn                    : The API implementation function.
// - includeFakeDataSupport : Whether to support fake data responses. true / false
// - fNoCache               : Appropriate function to set no-cache pragma
// - fRespond               : Appropriate function to respond, based on middleware framework
// - fullRelativeUri        : Derived from base URI and relative URI
// - oResource              : Object representing the resource (that corresponds to relativeUri)
// - oMethod                : Object representing the method (that corresponds to method)
var addRoute = function(params) {
	var app, method, appFcn;

	app    = params.appServer;
	method = params.method;

	if ( method === 'GET' ) {
		appFcn = app.get;
	} else if ( method === 'PUT' ) {
		appFcn = app.put;
	} else if ( method === 'POST' ) {
		appFcn = app.post;
	} else if ( method === 'DELETE' ) {
		appFcn = app.delete;
	}

	appFcn.call(app, params.fullRelativeUri, function(req, res) {
		params.coreHandler.call(null, req, res, params);
	});
};



var noCache = function(res) {
	res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
	res.header('Pragma', 'no-cache');
	res.header('Expires', 0);
};



var respond = function(res, responseCode, response, responseContentType) {
	if (responseContentType) {
		res.type(responseContentType);
	}
	res.status(responseCode).send(response);
};



var respondJson = function(res, responseCode, response) {
	res.status(responseCode).json(response);
};



var respondHtml = function(res, html) {
	respond(res, 200, html, 'text/html');
};



// Exports
exports.generateFullRelativeUri = generateFullRelativeUri;
exports.addRoute                = addRoute;
exports.noCache                 = noCache;
exports.respond                 = respond;
exports.respondJson             = respondJson;
exports.respondHtml             = respondHtml;

