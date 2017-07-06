// RAML-Related Functions

'use strict';

var	_	        = require('underscore-contrib'),
	ramlParser  = require('raml-parser'),
	util        = require('./util.js'),
	malcolmUtil = require('./malcolm-util.js');

var loopByOwnProperties = util.loopByOwnProperties;
var log                 = malcolmUtil.log;

var	oRaml = {};    // Will hold RAML info as a parsed JSON object (via raml-parser)



var init = function() {
	oRaml = {};
};



// Load and parse the RAML file given in the config object (by 'raml' key) and callback
var loadRaml = function(configObj, callback) {
	ramlParser.loadFile(configObj.raml).then(function(data) {
		oRaml = data;
		callback(null, null);  // Could return oRaml, but we want to hide it
		return;
	}, function(error) {
		var errMsg;
		errMsg = 'Error attempting to load raml file ' + configObj.raml;
		callback({
			status: 'ERROR',
			errorCode: 'COULD-NOT-LOAD-RAML',
			message: errMsg,
			error: error
		});
		return;
	});
};



// Once RAML file is read/parsed, set up efficient datastructures
// This can/should be called within init after the oRaml datastructure is populated by loadRaml
// Modifies oMeta object
var preprocess = function(oMeta) {
	var ramlResources;

	if ( !oRaml.resources ) { throw new Error('INTERNAL ERROR: Expected resources key not found.'); }

	// Pre-process RAML metadata
	ramlResources = oRaml.resources;
	ramlResources.forEach( function(ramlResource) {
		preprocessRamlResourceNode(oMeta, ramlResource, '');
	});
};



// Simple "getter" cover for oRaml datastructure
var get = function(prop) {
	return oRaml[prop];
};



// Returns { title: xxx, version: xxx } with the best possible title and version information
// Title: Either "<title> API" where <title> comes from the RAML file -or- "***UNKNOWN***"
// Version: Either "<version>" where <version> comes from the RAML file -or- "***UNKNOWN***"
var getVersionInfo = function() {
	var title, version;

	if ( oRaml && oRaml.hasOwnProperty('title') ) {
		title = oRaml.title + ' API';
	} else {
		title = '***UNKNOWN***';
	}

	if ( oRaml && oRaml.hasOwnProperty('version') ) {
		version = oRaml.version;
	} else {
		version = '***UNKNOWN***';
	}

	return {
		name: title,
		version: version
	};
};



var genMetaQueryParameterObject = function(queryParameterName, ramlQueryParameterObject) {
	var oMetaQueryParameterObj;

	oMetaQueryParameterObj = {'name': queryParameterName};

	// default values:
	oMetaQueryParameterObj.type = 'string';
	oMetaQueryParameterObj.required = false;

	['type', 'required', 'default', 'minLength', 'maxLength', 'minimum', 'maximum', 'pattern', 'enum'].forEach(
		function(nameOfProperty) {
			if ( ramlQueryParameterObject.hasOwnProperty(nameOfProperty) ) {
				oMetaQueryParameterObj[nameOfProperty] = ramlQueryParameterObject[nameOfProperty];
			}
		}
	);

	// @TODO: repeat (?), named parameters with multiple types
	return oMetaQueryParameterObj;
};



var genMetaHeaderObject = function(headerName, ramlHeaderObject) {
	var originalHeaderName, metaHeaderObj;

	originalHeaderName = headerName;
	headerName = headerName.replace(/^[Xx]-/g, ''); // Remove leading X- if present
	headerName = headerName.replace(/-/g, '_');		 // Convert hyphens to underscores
	// Turns out it's basically the same set of fields to transfer over...
	metaHeaderObj = genMetaQueryParameterObject(headerName, ramlHeaderObject);
	// Keep the original header name for when we need to get the actual value sent via
	// a header.
	metaHeaderObj.originalName = originalHeaderName;
	return metaHeaderObj;
	//
};



var getRamlRequestParameters = function(obj) {
	return obj.queryParameters ||
		_.getPath(obj, ['body', 'multipart/form-data', 'formParameters']);
};



// add unique request parameters newRequestParameters to existing array of parameters storedRequestParameters
var addUniqueRamlRequestParams = function(storedRequestParams, newRequestParams) {
	var paramObj;

	loopByOwnProperties(newRequestParams, function(requestParamValue, requestParamName) {
		// Protect against dups
		if (!_.findWhere(storedRequestParams, {name: requestParamName})) {
			paramObj = genMetaQueryParameterObject(requestParamName, requestParamValue);
			storedRequestParams.push(paramObj);
		}
	});
};



// add unique headers newHeaders to existing array of headers storedHeaders
var addUniqueRamlHeaders = function(storedHeaders, newHeaders) {
	var headersObj;

	loopByOwnProperties(newHeaders, function(headerValue, headerName) {
		// Protect against dups
		if (!_.findWhere(storedHeaders, {originalName: headerName})) {
			headersObj = genMetaHeaderObject(headerName, headerValue);
			storedHeaders.push(headersObj);
		}
	});
};



var processTraits = function(oMetaObj, methodName, iss) {
	var trait, traitQueryParameters;

	loopByOwnProperties(iss, function(is) {
		// Find matching trait
		trait = _.find(oRaml.traits, function(currentTrait) {
			var keys, key;
			keys = _.keys(currentTrait);
			if (keys.length === 1) {
				key = keys[0];
				if (key === is) {
					return true;
				}
				return false;
			}
			log('INTERNAL ERROR: Unexpected RAML trait with more than one top-level key');
			return false;
		});

		if (trait) {
			traitQueryParameters = getRamlRequestParameters(trait[is]);
			addUniqueRamlRequestParams(oMetaObj[methodName].queryParameters, traitQueryParameters);

			addUniqueRamlHeaders(oMetaObj[methodName].headers, trait[is].headers);
		} else {
			log('INTERNAL ERROR: Method refers to a trait, but that trait cannot be found');
		}
	});
};



// preprocess RAML resource nodes adding data to oMeta object
var preprocessRamlResourceNode = function(oMeta, ramlResource, uriPath) {
	var methodName, queryParameters, childRamlResources;

	var oMetaObj = {};
	var uriParameters = ramlResource.uriParameters;
	var methods = ramlResource.methods;

	loopByOwnProperties( methods, function(method) {
		methodName = method.method;

		oMetaObj[methodName] = {queryParameters: [], headers: [], uriParameters: []};
		addUniqueRamlRequestParams(oMetaObj[methodName].uriParameters, uriParameters);

		queryParameters = getRamlRequestParameters(method);
		addUniqueRamlRequestParams(oMetaObj[methodName].queryParameters, queryParameters);

		addUniqueRamlHeaders(oMetaObj[methodName].headers, method.headers);

		processTraits(oMetaObj, methodName, method.is);
	});

	// store result
	oMeta[uriPath + ramlResource.relativeUri] = oMetaObj;

	// Recurse for any child resources of this resource
	if ( ramlResource.resources ) {
		childRamlResources = ramlResource.resources;
		childRamlResources.forEach( function(childRamlResource) {
			preprocessRamlResourceNode(oMeta, childRamlResource, uriPath + ramlResource.relativeUri);
		});
	}
};



// @TODO: Remove
var getRamlAsJson = function() {
	return oRaml;
};



// Exports
exports.init                        = init;
exports.loadRaml                    = loadRaml;
exports.preprocess                  = preprocess;
exports.get                         = get;
exports.getVersionInfo              = getVersionInfo;
exports.preprocessRamlResourceNode  = preprocessRamlResourceNode;
exports.getRamlAsJson               = getRamlAsJson; // @TODO: Remove
