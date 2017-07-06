
module.exports = {
	'queryParameters': {
		'url': '/testQueryParameters',
		'requestCollection': {Hapi: 'query', Express: 'query'},
		'methods': ['get', 'post', 'put', 'delete'],
		'description': 'query parameters'
	},
	'headers': {
		'url': '/testHeaders',
		'requestCollection': {Hapi: 'headers', Express: 'headers'},
		'methods': ['get', 'post', 'put', 'delete'],
		'description': 'headers'
	},
	'multipart/form-data': {
		'url': '/testMultipartFormData',
		'requestCollection': {Hapi: 'payload', Express: 'body'},
		'methods': ['post'],
		'description': 'multipart/form-data parameters'
	},
	'urlParameters': {
		'url': '/testUriParameters/{getTestParm0}-{getTestParm1}-{getTestParm2}-{getTestParm3}-{getTestParm4}-{getTestParm5}',
		'requestCollection': {Hapi: 'params', Express: 'params'},
		'methods': ['get'],
		'description': 'uri parameters'
	},
	'queryParametersTraits': {
		'url': '/testQueryParameters/traits',
		'requestCollection': {Hapi: 'query', Express: 'query'},
		'methods': ['get', 'post', 'put', 'delete'],
		'description': 'query parameters with traits'
	},
	'headers/Traits': {
		'url': '/testHeaders/traits',
		'requestCollection': {Hapi: 'headers', Express: 'headers'},
		'methods': ['get', 'post', 'put', 'delete'],
		'description': 'headers with traits'
	},
	'multipart/form-data/Traits': {
		'url': '/testMultipartFormData/traits',
		'requestCollection': {Hapi: 'payload', Express: 'body'},
		'methods': ['post'],
		'description': 'multipart/form-data parameter with traits'
	}

};


