'use strict';

// constructor
// @params serverType (mandatory) string: "hapi" | "express"
// @params routeBuilder (optional) function which gets an uri and transforms it
var FakeServer = function(serverType, routeBuilder) {
	FakeServer.prototype.serverType = serverType;
	FakeServer.prototype.resetRoutes();
	FakeServer.prototype.routeBuilder = routeBuilder;
};

// For the Hapi route adding
FakeServer.prototype.route = function(params) {
	FakeServer.prototype._addUrl(params.path);
	FakeServer.prototype.routeHandler[params.path][params.method.toUpperCase()] = params.handler;
};

FakeServer.prototype._addUrl = function(path) {
	if ('object' != typeof FakeServer.prototype.routeHandler[path]) {
		FakeServer.prototype.routeHandler[path] = {};
	}
};

// Express routes support

FakeServer.prototype.get = function(uri, handler) {
	FakeServer.prototype._addUrl(uri);
	FakeServer.prototype.routeHandler[uri]['GET'] = handler;
};

FakeServer.prototype.put = function(uri, handler) {
	FakeServer.prototype._addUrl(uri);
	FakeServer.prototype.routeHandler[uri]['PUT'] = handler;
};

FakeServer.prototype.post = function(uri, handler) {
	FakeServer.prototype._addUrl(uri);
	FakeServer.prototype.routeHandler[uri]['POST'] = handler;
};

FakeServer.prototype.delete = function(uri, handler) {
	FakeServer.prototype._addUrl(uri);
	FakeServer.prototype.routeHandler[uri]['DELETE'] = handler;
};

FakeServer.prototype.resetRoutes = function() {
	FakeServer.prototype.routeHandler = {};
};

FakeServer.prototype.getRoutes = function() {
	return FakeServer.prototype.routeHandler;
};

// Emulation of the request sending
FakeServer.prototype.inject = function(requestData, callback) {
	var result, reply;

	result = {};
	switch (FakeServer.prototype.serverType.toLowerCase()) {
		case 'hapi':
			// data processing for malcolm::fRespondWithJson_Hapi
			reply = function(response) {
				result.response = response;
				return {
					'code': function(responseCode) {
						result.responseCode = responseCode;
						return {
							'type': function(responseContentType) {
								result.responseContentType = responseContentType;
								process.nextTick(function() {
									callback(result);
								});
							}
						};
					}
				};
			};
			break;
		case 'express':
			// data processing for malcolm::fRespondWithJson_Express
			reply = {
				'type': function(responseContentType) {
					result['responseContentType'] = responseContentType;
				},
				'json': function(responseCode, response) {
					result['responseCode'] = responseCode;
					result['response'] = response;
				},
				'status': function(responseCode) {
					result['responseCode'] = responseCode;
					return {
						'send': function(response) {
							result['response'] = response;
							process.nextTick(function() {
								callback(result);
							});
						}
					};
				}
			};
			break;
		default:
			throw new Error('Illegal type of server');
	}
	var route = FakeServer.prototype.routeBuilder ?
		FakeServer.prototype.routeBuilder(requestData.url) : requestData.url;
	var method = requestData.method.toUpperCase();
	if ('undefined' === typeof this.routeHandler[route] ) {
		throw new Error('Not been called addHapiRoute/addExpressRoute for any methods of route "' + route + '"');
	} else if ('undefined' === typeof this.routeHandler[route][method]) {
		throw new Error('Not been called addHapiRoute/addExpressRoute for "' + method + '" of route "' + route + '"');
	} else {
		this.routeHandler[route][method](requestData, reply);
	}
};

module.exports = FakeServer;
