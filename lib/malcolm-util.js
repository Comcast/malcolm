// Utility Functions

'use strict';

var	moment = require('moment');

// The function and 'this' object that will be used when log() is called. Defaults to console.log().
var fLog     = console.log;
var fLogThis = console;



// Configure which function and which 'this' object to use when log() is called
var initLogging = function(param_fLog, param_fLogThis) {
	fLog     = param_fLog;
	fLogThis = param_fLogThis;
};



// "Cover" for client's preferred logging mechanism
// Handles variable number of arguments
// Should only be used after initLogging() has been called, otherwise console.log will be used
var log = function() {
	try {
		fLog.apply(fLogThis, arguments);
	} catch ( ex ) {
		console.log('malcolm-util.js::log: An exception occurred attempting to log:');
		console.log(arguments.toString());
		console.log('The exception is:');
		console.log(ex.toString());
	}
};



// Convert string value into "real" typed value (e.g., a JavaScript number for integers or numbers)
var getTypedValue = function(sVal, datatype) {
	if ( !sVal ) { return null; }
	if ( !datatype ) { datatype = 'string'; }

	datatype = datatype.toLowerCase();
	if ( datatype === 'string' ) {
		return sVal;
	}
	if ( datatype === 'integer' ) {
		return parseInt(sVal, 10);
	}
	if ( datatype === 'number' ) {
		return parseFloat(sVal);
	}
	if ( datatype === 'boolean' ) {
		return ( sVal === 'true' || sVal === 'TRUE' || sVal === '1' || sVal === 'y' || sVal === 'Y' ? true : false );
	}
	if ( datatype === 'date' ) {
		// RAML spec says values must be a string representation of a date as defined in RFC2616 Section 3.3 [RFC2616]
		// E.g., Sun, 06 Nov 1994 08:49:37 GMT
		// But we're more promiscuous here...
		// We use moment.js, which will check if the string matches any known ISO 8601 format, then fall back
		// to new Date(string) if a known format is not found.
		return moment(sVal).toDate();
	}
	// Unknown datatype
	// @TODO: Log unusual case
	return sVal;
};



// * Returns a three-entry array with:
//   - an HTTP response code (e.g., 200),
//   - a JSON response (default; can be a string if other content type is set), and
//   - a response content type (e.g., 'application/json')
// * In most cases, the response code will be 200, the response will be the provided obj, unchanged,
//   and the response content type will be 'application/json'
// * But if the obj given represents a custom HTTP response, then the response code will come
//   from obj.responseCode, the response will come from obj.response, and the content type will
//   come from obj.responseContentType.
var getHttpResponse = function(obj) {
	if ( !obj ) { return [ 500, { status: 'ERROR', message: 'Could not getHttpResponse for null object.' } ]; }
	if ( obj.hasOwnProperty('responseCode') && obj.hasOwnProperty('response') ) {
		if ( obj.hasOwnProperty('responseContentType') ) {
			return [ obj.responseCode, obj.response, obj.responseContentType ];
		}
		return [ obj.responseCode, obj.response, 'application/json' ];
	}
	return [ 200, obj, 'application/json' ];
};



// Exports
exports.initLogging                  = initLogging;
exports.log                          = log;
exports.getTypedValue                = getTypedValue;
exports.getHttpResponse              = getHttpResponse;
