// HAPI-specific "callback" functions used within malcolm-core

'use strict';



var generateFullRelativeUri = function(baseUri, relativeUri) {
	// Both RAML parameterized routes and Hapi parameterized routes look like /resource/{resourceId}.
	return baseUri + relativeUri;
};



// Params is an object with these keys
// - appServer              : This is the Hapi server object
// - relativeUri            : The relative URI for the route being added. E.g., /search
// - method                 : The HTTP method for the route being added. E.g., GET
// - coreHandler            : The coreHandler function
// - fcn                    : The API implementation function.
// - authStrategy           : @TODO
// - includeFakeDataSupport : Whether to support fake data responses. true / false
// - fNoCache               : Appropriate function to set no-cache pragma
// - fRespond               : Appropriate function to respond, based on middleware framework
// - fullRelativeUri        : Derived from base URI and relative URI
// - oResource              : Object representing the resource (that corresponds to relativeUri)
// - oMethod                : Object representing the method (that corresponds to method)
var addRoute = function(params) {
	var server;

	server = params.appServer;

	server.route({
		method: params.method,
		path:	 params.fullRelativeUri,
		config: { auth: params.authStrategy },
		handler: function(req, reply) {
			params.coreHandler.call(null, req, reply, params);
		}
	});
};



var noCache = function(reply) {
	var response = reply();
	response.header('Cache-Control', 'no-cache, no-store, must-revalidate');
	response.header('Pragma', 'no-cache');
	response.header('Expires', 0);
};



var respond = function(reply, responseCode, response, responseContentType) {
	reply(response).code(responseCode).type(responseContentType);
};



var respondJson = function(reply, responseCode, response) {
	reply(response).code(responseCode).type('application/json');
};



var respondHtml = function(reply, html) {
	respond(reply, 200, html, 'text/html');
};



// Exports
exports.generateFullRelativeUri = generateFullRelativeUri;
exports.addRoute                = addRoute;
exports.noCache                 = noCache;
exports.respond                 = respond;
exports.respondJson             = respondJson;
exports.respondHtml             = respondHtml;
