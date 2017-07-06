// Documentation-Related Functions

'use strict';

var	raml2html  = require('raml2html');



var generateDocumentation = function(ramlFilePath, callback) {
	var raml2htmlConfig;

	raml2htmlConfig = raml2html.getDefaultConfig();  // Newer versions of raml2html: raml2html.getConfigForTheme();
	raml2html.render(ramlFilePath,
		raml2htmlConfig,
		function(html) {
			callback(null, html);
		},
		function(error) {
			callback(error);
		}
	);
};



// Exports
exports.generateDocumentation	 = generateDocumentation;
