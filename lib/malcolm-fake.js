// Fake Data-Related Functions

'use strict';

var path        = require('path');
var fs          = require('fs');
var util        = require('./util.js');
var malcolmUtil = require('./malcolm-util.js');



var topLevelPath      = '';  // Should be set to directory path of RAML file (e.g., path.dirname(configObj.raml))
var	fakeDataResponses = {};  // A "hash table" (POJO) of fakeDataKey->response key-value pairs.



var setTopLevelPath = function(path) {
	topLevelPath = path;
};



// Generate a relative file name for a fake data response with the given relativeUri, method, and fakeDataKey
// Example: Given:
// - a topLevelPath of '/api' (via setTopLevelPath()),
// - a relativeUri of '/posts',
// - a method of 'GET', and
// - a fakeDataKey of 'EXAMPLE'
// this function will return 'api/mocks/posts/get/EXAMPLE.json'
var generateFakeDataFileName = function(relativeUri, method, fakeDataKey) {
	var fileName;

	// sanitize user input
	fakeDataKey = fakeDataKey.replace(/[^a-zA-Z0-9_]/g, '');

	fileName = path.posix.join(
		topLevelPath,
		'mocks',
		relativeUri,
		method.toLowerCase(),
		fakeDataKey + '.json'
	);
	return fileName;
};



// Returns a known fake data response if one is "known" by the given relativeUri, method, and fakeDataKey, otherwise returns null.
// Only consults our "hash table" of fake data responses (not the file system)
var getFakeDataResponse = function(relativeUri, method, fakeDataKey) {
	var fileName;

	fileName = generateFakeDataFileName(relativeUri, method, fakeDataKey);
	if ( !fakeDataResponses.hasOwnProperty(fileName) ) {
		return null;
	}
	return fakeDataResponses[fileName];
};



// Add the given fake data response, keyed by the given relativeUri, method, and fakeDataKey
// to our "hash table" of fake data responses
var addFakeDataResponse = function(relativeUri, method, fakeDataKey, response) {
	var fileName;

	try {
		response = JSON.parse(response);
	} catch (ex) {
		// For now, leave things alone, assuming response was/is already a JSON object
		// Notet that this is not likely if addFakeDataResponse is called within an
		// Express or Hapi route that passes a body parameter value (which will be
		// a String, not a JSON object).
	}
	fileName = generateFakeDataFileName(relativeUri, method, fakeDataKey);
	fakeDataResponses[fileName] = response;
};



// Clear the fake data response keyed by the given relativeUri, method, and fakeDataKey
// from our "hash table" of fake data responses
var clearFakeDataResponse = function(relativeUri, method, fakeDataKey) {
	var fileName;

	fileName = generateFakeDataFileName(relativeUri, method, fakeDataKey);
	delete fakeDataResponses[fileName];
};



// Respond with fake data response if we have one for the given relativeUri, method, and fakeDataKey
// All code paths respond (call fRespond)
var respondWithFakeData = function(resReply, relativeUri, method, fakeDataKey, fRespond) {
	var fakeDataFileName, fakeDataResponse, oMock, httpResponseInfo, responseCode, response, responseContentType;

	fakeDataFileName = generateFakeDataFileName(relativeUri, method.toLowerCase(), fakeDataKey);
	fakeDataResponse = getFakeDataResponse(relativeUri, method.toLowerCase(), fakeDataKey);
	if ( fakeDataResponse ) {
		fRespond.call(null, resReply, 200, util.replaceDynamicDateTimeVariablesJson(fakeDataResponse, '{{', '}}'));
		return;
	} else {
		// See if there is a file with this fakeDataKey in the right place in the file system.
		// The mocks/ directory should be at the same level as the .raml file specified
		// by the raml key in the malcolm.init() call.
		// E.g., api/mocks/<resource>/<subResource>/<method>/FAKEYJAKEY.json
		fs.readFile(fakeDataFileName, function(err, buf) {
			if ( err ) {
				fRespond.call(null, resReply, 500, {
					status: 'ERROR',
					errorCode: 'COULD-NOT-READ-MOCK-DATA-FILE',
					message: 'Could not read mock data file ' + fakeDataFileName + '.'
				});
				return;
			}

			oMock = null;
			try {
				oMock = JSON.parse(util.replaceDynamicDateTimeVariablesStr(buf.toString(), '{{', '}}'));
			} catch ( ex ) {
				fRespond.call(null, resReply, 500, {
					status: 'ERROR',
					errorCode: 'COULD-NOT-PROCESS-MOCK-DATA-FILE',
					message: 'Could not process mock data file ' + fakeDataFileName + '.'
				});
				return;
			}

			if ( !oMock ) {
				// An attempt was made to retrieve a named fake data response but we don't have one
				// with that name for this resource and this method.
				fRespond.call(null, resReply, 400, {
					status: 'ERROR',
					errorCode: 'UNKNOWN-FAKE-DATA-KEY',
					message: 'Unknown fake data response "' + fakeDataKey + '" requested.'
				});
				return;
			}

			// Return the requested fake data set (given by fakeDataKey)
			httpResponseInfo = malcolmUtil.getHttpResponse(oMock);
			responseCode     = httpResponseInfo[0];
			response         = httpResponseInfo[1];
			responseContentType = httpResponseInfo[2];
			fRespond.call(null, resReply, responseCode, response, responseContentType);
			return;
		});
		return;
	}
};



// Exports
exports.setTopLevelPath          = setTopLevelPath;
exports.generateFakeDataFileName = generateFakeDataFileName;
exports.getFakeDataResponse      = getFakeDataResponse;
exports.addFakeDataResponse      = addFakeDataResponse;
exports.clearFakeDataResponse    = clearFakeDataResponse;
exports.respondWithFakeData      = respondWithFakeData;
