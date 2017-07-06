'use strict';

var _          = require('underscore-contrib');
var proxyquire = require('proxyquire');
var chai       = require('chai');
var sinon      = require('sinon');
var sinonChai  = require('sinon-chai');
var origMoment = require('moment-timezone');

var expect = chai.expect;
chai.use(sinonChai);

describe('UTIL', function() {

	describe('date/time variable substitution function', function() {
		var defaultDate = {date: 5, month: 7, year: 2016}; // 5 August, 2016
		var currentDate; // can be overriden in tests
		var moment;
		var util;

		var debug = false;

		// override moment function to set specified date. All its methods will be called through.
		var createCustomMoment = function(){
			return function(timeObject) {
				var m;
				timeObject = timeObject || {hour: 0, minute: 0, second: 0};

				m = origMoment(timeObject);

				// set specified date for predictable results
				m.year(currentDate.year).month(currentDate.month).date(currentDate.date); 
				return m;
			};
		};

		before(function() {
			// lock the timezone for predictable results
			origMoment.tz.setDefault('America/Los_Angeles');
			moment = createCustomMoment();

			util = proxyquire('../lib/util.js', {
				'moment': moment
			});

		});
		
		beforeEach(function() {
			currentDate = _.clone(defaultDate);
		});

		describe('replaceDynamicDateTimeVariables()', function() {
			var testCaseIndex, testCasesSuccessful, testCasesFailed, successfulTestLauncher, failedTestLauncher;

			successfulTestLauncher = function(testCaseData) {
				it(testCaseData.description, function() {
					var result = util.replaceDynamicDateTimeVariables(testCaseData.template, testCaseData.prefix, testCaseData.suffix);

					expect(result).to.equal(testCaseData.expectedResult);
				});
			};

			failedTestLauncher = function(testCaseData) {
				it(testCaseData.description + ' template = "' + testCaseData.template + '"', function() {
					var runner = function() {
						// as Chai only checks that the beginning of error message matches (e.g. for Error('abcd')
						// expect(runner).to.throw('abc') will success
						// we recreate Error object wrapping its message with []. Also logging could be added for debug purposes
						try {
							var result = util.replaceDynamicDateTimeVariables(testCaseData.template, testCaseData.prefix, testCaseData.suffix);
							if (debug) {
								console.log('Result:', result);
							}
							return result;
						} catch (err) {
							if (debug) {
								console.log(err);
							}
							throw new Error('[' + err.message + ']');
						}
					};

					expect(runner).to.throw('[' + testCaseData.expectedError + ']');
				});
			};

			// positive test cases
			testCasesSuccessful = [
				{
					'description': 'should return "plain text" for "plain text"',
					'template': 'plain text',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': 'plain text'
				},
				{
					'description': 'should correctly process "A {{+2h|x}} Z"',
					'template': 'A {{+2h|x}} Z',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': 'A 1470387600000 Z'
				},
				{
					'description': 'should correctly process any kind of braces like $$$ and $$: "A $$$+2h|x$$ Z"',
					'template': 'A $$$+2h|x$$ Z',
					'prefix': '$$$',
					'suffix': '$$',
					'expectedResult': 'A 1470387600000 Z'
				},
				{
					'description': 'should do the right thing for "{{+2h|YYYY-MM-DD HH:mm:SS}}"',
					'template': '{{+2h|YYYY-MM-DD HH:mm:SS}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '2016-08-05 02:00:00'
				},
				{
					'description': 'should do the right thing for "{{-3d|YYYY-MM-DD HH:mm:SS}}"',
					'template': '{{-3d|YYYY-MM-DD HH:mm:SS}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '2016-08-02 00:00:00'
				},
				{
					'description': 'should change month correctly: "{{-30d|YYYY-MM-DD HH:mm:SS}}"',
					'template': '{{-30d|YYYY-MM-DD HH:mm:SS}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '2016-07-06 00:00:00'
				},
				{
					'description': 'should replace several dates at once: "A{{+0h|x}} {{+1h|x}}Z"',
					'template': 'A{{+0h|x}} {{+1h|x}}Z',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': 'A1470380400000 1470384000000Z'
				},
				{
					'description': 'should do the right thing for "{{20:00+1d|x}}"',
					'template': '{{20:00+1d|x}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '1470538800000'
				},
				{
					'description': 'should do the right thing for "{{10:01:33-1d|X}}"',
					'template': '{{10:01:33-1d|X}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '1470330093'
				},
				{
					'description': 'should do the right thing for "{{00:00-0d|X}}"',
					'template': '{{0:0-0d|X}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '1470380400'
				},
				{
					'description': 'should do the right thing for "{{20:00|x}}"',
					'template': '{{20:00|YYYY-MM-DD HH:mm:ssZ}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '2016-08-05 20:00:00-07:00'
				},
				{
					'description': 'should do the right thing for "{{20:00:35|x}}"',
					'template': '{{20:00:35|YYYY-MM-DD HH:mm:ssZ}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedResult': '2016-08-05 20:00:35-07:00'
				}
			];

			// negative test cases
			testCasesFailed = [
				{
					'description': 'Should fail when no prefix/suffix was specified, ',
					'template': 'plain text',
					'prefix': '',
					'suffix': '',
					'expectedError': 'Invalid dynamic date/time string: '
				},
				{
					'description': 'Should fail when',
					'template': '{{10|x}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedError': 'Invalid relative date/time string: 10'
				},
				{
					'description': 'Should fail when',
					'template': '{{+10|x}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedError': 'Invalid relative date/time string: +10'
				},
				{
					'description': 'Should fail when',
					'template': '{{19:00+1s|x}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedError': 'Invalid relative date/time string (d only): 19:00+1s'
				},
				{
					'description': 'Should fail when',
					'template': '{{19:00:01+1s|x}}',
					'prefix': '{{',
					'suffix': '}}',
					'expectedError': 'Invalid relative date/time string (d only): 19:00:01+1s'
				}
			];

			// generate tests
			for (testCaseIndex in testCasesSuccessful) {
				successfulTestLauncher(testCasesSuccessful[testCaseIndex]);
			}
			for (testCaseIndex in testCasesFailed) {
				failedTestLauncher(testCasesFailed[testCaseIndex]);
			}

		});


		describe('replaceDynamicDateTimeVariablesStr()', function() {

			it('should replace variables in passed quoted string', function() {
				var result = util.replaceDynamicDateTimeVariablesStr('"{{+1h|YYYY-MM-DD HH:mm:ss}}"', '{{', '}}');

				expect(result).to.equal('2016-08-05 01:00:00');
			});


			it('should replace variables in passed backslashed and quoted string', function() {
				var result = util.replaceDynamicDateTimeVariablesStr('\\"{{+1h|YYYY-MM-DD HH:mm:ss}}\\"', '{{', '}}');

				expect(result).to.equal('2016-08-05 01:00:00');
			});


			it('should ignore errors', function() {
				var result = util.replaceDynamicDateTimeVariablesStr('"{{10|x}}"', '{{', '}}');

				expect(result).to.equal('"{{10|x}}"');
			});

		});


		describe('replaceDynamicDateTimeVariablesJson()', function() {

			it('should replace variables in passed quoted strings', function() {
				var result = util.replaceDynamicDateTimeVariablesJson({foo: '"{{+1h|YYYY-MM-DD HH:mm:ss}}"'}, '{{', '}}');

				expect(result).to.deep.equal({foo: '2016-08-05 01:00:00'});
			});


			it('should replace variables in passed strings', function() {
				var result = util.replaceDynamicDateTimeVariablesJson({foo: '{{+1h|X}}'}, '{{', '}}');

				expect(result).to.deep.equal({foo: 1470384000});
			});


			it('should ignore errors', function() {
				var result = util.replaceDynamicDateTimeVariablesJson({foo: '"{{10|x}}"'}, '{{', '}}');

				expect(result).to.deep.equal({foo: '"{{10|x}}"'});
			});

		});

	});

	describe('loopByOwnProperties()', function() {
		var util;

		before(function() {
			util = proxyquire('../lib/util.js', {});
		});


		it('should iterate own properties of object', function() {
			function ObjWithProto() {
				this.foo = 'foo_val';
			}

			ObjWithProto.prototype = {bar: 'bar_val'};

			var obj = new ObjWithProto();
			obj.foobar = 'foobar_val';

			var iterator = sinon.stub();

			util.loopByOwnProperties(obj, iterator);

			expect(iterator).to.be.calledTwice;
			expect(iterator).to.be.calledWith('foo_val',    'foo',    { foo: 'foo_val', foobar: 'foobar_val' });
			expect(iterator).to.be.calledWith('foobar_val', 'foobar', { foo: 'foo_val', foobar: 'foobar_val' });
		});


		it('should ignore non-objects', function() {
			var iterator = sinon.stub();

			util.loopByOwnProperties(123, iterator);

			expect(iterator).not.to.have.been.called;
		});

		
	});

});
