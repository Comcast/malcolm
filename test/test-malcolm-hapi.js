'use strict';

var chai        = require('chai');
var malcolmHapi = require('../lib/malcolm-hapi.js');

var expect = chai.expect;

describe('malcolm-hapi', function() {

	describe('generateFullRelativeUri', function() {

		it('should leave :foo alone', function() {
			var result = malcolmHapi.generateFullRelativeUri('http://localhost:8000/api/v1', '/posts/:postId');
			expect(result).to.equal('http://localhost:8000/api/v1/posts/:postId');
		});


		it('should handle two (non-)substitutions', function() {
			var result = malcolmHapi.generateFullRelativeUri('http://localhost:8000/api/v1', '/users/:userId/posts/:postId');
			expect(result).to.equal('http://localhost:8000/api/v1/users/:userId/posts/:postId');
		});


		it('should handle no substitutions', function() {
			var result = malcolmHapi.generateFullRelativeUri('http://localhost:8000/api/v1', '/posts');
			expect(result).to.equal('http://localhost:8000/api/v1/posts');
		});

	});

});
