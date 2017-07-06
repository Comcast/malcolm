'use strict';

var chai           = require('chai');
var malcolmExpress = require('../lib/malcolm-express.js');

var expect = chai.expect;

describe('malcolm-express', function() {

	describe('generateFullRelativeUri', function() {

		it('should replace {foo} with :foo', function() {
			var result = malcolmExpress.generateFullRelativeUri('http://localhost:8000/api/v1', '/posts/{postId}');
			expect(result).to.equal('http://localhost:8000/api/v1/posts/:postId');
		});


		it('should handle two substitutions', function() {
			var result = malcolmExpress.generateFullRelativeUri('http://localhost:8000/api/v1', '/users/{userId}/posts/{postId}');
			expect(result).to.equal('http://localhost:8000/api/v1/users/:userId/posts/:postId');
		});


		it('should handle no substitutions', function() {
			var result = malcolmExpress.generateFullRelativeUri('http://localhost:8000/api/v1', '/posts');
			expect(result).to.equal('http://localhost:8000/api/v1/posts');
		});

	});

});
