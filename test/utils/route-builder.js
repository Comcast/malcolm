'use strict';

function RouteBuilder(relativeUri) {
	var version = RouteBuilder.prototype.version ? RouteBuilder.prototype.version : '** UNKNOWN **';
	var relUri = ( (RouteBuilder.prototype.typeOfServer === 'Express') ?
		relativeUri.replace(/\{([a-zA-Z_0-9]+)\}/g, ':$1') :
		relativeUri );
	return '/' + version + relUri;
}

RouteBuilder.prototype.setMalcolmVersion = function(malcolm) {
	var result, response;
	result = {};
	if ( RouteBuilder.prototype.typeOfServer === 'Express' ) {
		response = {
			status: function(code) {
				result['statusCode'] = code;
				return {
					json: function(obj) {
						result['response'] = obj;
					}
				};
			}
		};
		malcolm.expressVersion({}, response);
	} else {
		response = function(response) {
			result.response = response;
			return {
				'code': function(responseCode) {
					result.responseCode = responseCode;
					return {
						'type': function(responseContentType) {
							result.responseContentType = responseContentType;
						}
					};
				}
			};
		};
		malcolm.hapiVersion({}, response);
	}
	RouteBuilder.prototype.version = result.response ? result.response.version : '';
};

RouteBuilder.prototype.setServerVersion = function(typeOfServer) {
	RouteBuilder.prototype.typeOfServer = typeOfServer;
};

module.exports = RouteBuilder;
