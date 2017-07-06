// Overall Malcolm Module

'use strict';

var malcolmCore = require('./malcolm-core.js');
var malcolmRaml = require('./malcolm-raml.js'); // @TODO: Remove



// Public API
exports.init             = malcolmCore.init;
exports.addExpressRoutes = malcolmCore.addExpressRoutes;
exports.addExpressRoute	 = malcolmCore.addExpressRoute;
exports.addHapiRoutes    = malcolmCore.addHapiRoutes;
exports.addHapiRoute     = malcolmCore.addHapiRoute;



// Express route handlers for "direct use" by client routes
exports.expressVersion               = malcolmCore.expressVersion;
exports.expressDoc                   = malcolmCore.expressDoc;
exports.expressAddFakeDataResponse   = malcolmCore.expressAddFakeDataResponse;
exports.expressClearFakeDataResponse = malcolmCore.expressClearFakeDataResponse;



// HAPI routes handlers for "direct use" by client routes 
exports.hapiVersion               = malcolmCore.hapiVersion;
exports.hapiDoc                   = malcolmCore.hapiDoc;
exports.hapiAddFakeDataResponse   = malcolmCore.hapiAddFakeDataResponse;
exports.hapiClearFakeDataResponse = malcolmCore.hapiClearFakeDataResponse;



// For unit testing purposes
exports.private = {};
exports.private.getRamlAsJson = malcolmRaml.getRamlAsJson; // @TODO: Remove
exports.private.getJx         = malcolmCore.getJx;         // @TODO: Remove
exports.private.getMeta	      = malcolmCore.getMeta;       // @TODO: Remove
