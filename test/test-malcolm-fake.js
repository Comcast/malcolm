'use strict';

var chai        = require('chai');
var malcolmFake = require('../lib/malcolm-fake.js');

var expect = chai.expect;

describe('malcolm-fake', function() {

	describe('generateFakeDataFileName', function() {

		it('should work', function() {
			var result;
			malcolmFake.setTopLevelPath('/api');
			result = malcolmFake.generateFakeDataFileName('/posts', 'GET', 'EXAMPLE');
			expect(result).to.equal('/api/mocks/posts/get/EXAMPLE.json');
		});

		it('should remove weird characters from fakeDataKey', function() {
			var result;
			malcolmFake.setTopLevelPath('/api');
			result = malcolmFake.generateFakeDataFileName('/posts', 'GET', 'FOO$BAR');
			expect(result).to.equal('/api/mocks/posts/get/FOOBAR.json');
		});

	});

	describe('getFakeDataResponse + addFakeDataResponse + clearFakeDataResponse', function() {

		it('should not find an unknown fake data response', function() {
			var result;
			malcolmFake.setTopLevelPath('/api');
			result = malcolmFake.getFakeDataResponse('/unknownRelativeUri', 'unknownMethod', 'unknownFakeDataKey');
			expect(result).to.equal(null);
		});

		it('should add and then find a fake data response', function() {
			var result;
			malcolmFake.setTopLevelPath('/api');
			malcolmFake.addFakeDataResponse('/someRelativeUri', 'someMethod', 'someFakeDataKey', { someResponse: 'RESPONSE' });
			result = malcolmFake.getFakeDataResponse('/someRelativeUri', 'someMethod', 'someFakeDataKey');
			expect(result.someResponse).to.equal('RESPONSE');
		});

		it('should add, clear, and then NOT find a fake data response', function() {
			var result;
			malcolmFake.setTopLevelPath('/api');
			malcolmFake.addFakeDataResponse('/someRelativeUri', 'someMethod', 'someFakeDataKey', { someResponse: 'RESPONSE' });
			malcolmFake.clearFakeDataResponse('/someRelativeUri', 'someMethod', 'someFakeDataKey');
			result = malcolmFake.getFakeDataResponse('/someRelativeUri', 'someMethod', 'someFakeDataKey');
			expect(result).to.equal(null);
		});

	});

});
