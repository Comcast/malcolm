malcolm
=========


## Summary

**malcolm** is a node.js package that provides API developers coding in node.js the ability to leverage their RAML definitions __within the code that implements the API described by the RAML__.

Unlike other RAML-related utilities that do things like generate 
documentation or test harnesses, this package allows web service developers to __actually use the semantics of their RAML within the code that implements their API__.

Not only does this drastically cut out boilerplate "parameter marshalling" code in your route implementations, it allows you to better guarantee that your actual API implementation conforms to its RAML defintion, which, without **malcolm**, would remain completely disconnected from the RAML beyond your best intentions. Said another way, **malcolm** fights "bit rot" of your RAML.

**malcolm** works with Express or HAPI. Currently, only RAML (version 0.8) is supported; future versions will work with Swagger.



## Functionality Overview

#### Current Functionality

**malcolm** provides the following functionality:

- All features delivered __without__ code generation
- Transport-independent API implementation functions
  (usable/testable without HTTP).
- Middleware-independent API implementation functions
  (usable within Express or HAPI with no change).
- Fake data response support, including
    - the ability to dynamically upload and remove fake data responses, and
    - the ability to use "variable expressions" for dates and times
      within fake data responses (e.g., "+2h|x" for two hours from
      now in Unix epoch format).
- Dynamic API documentation creation (no build/generation step).
- Declaratively set methods as non-cacheing.

#### Future Functionality

At some point, I'd like to get **malcolm** to provide the following functionality at some point:

- Logging of request and response details (declarative)
- Statistics logging (calls, response codes, timing, performance)
- Dynamic "Try It" experience (no build/generation step).
- Support for JWT.
- Unit test support.
- Code coverage reporting for unit tests and fake data responses.



## Example: Malcolm in 60 Seconds

Here's how easy it is to use **malcolm.js**:


NOTE: Change `addExpressRoute` to `addHapiRoute` if you're using HAPI instead of Express.

NOTE: Future versions of **malcolm** will support Swagger as well as RAML. For now, you'll need to convert/translate your Swagger to RAML.

**myApp.raml**

```
/* Your RAML, as usual */
```

**myApp.jx.json (OPTIONAL)**

Something like this (note that "nested" resources are NOT NESTED here):

```
{
	"/search": {
		"get": {
			"fcn": "controllers/search.js:search"
		}
	},

	"/favorites": {
		"get": {
			"fcn": "controllers/favorites.js:getAllFavorites"
		},
		"post": {
		    "fcn": "controllers/favorites.js:addFavorite"
		},
		"delete": {
		    "fcn": "controllers/favorites.js:clearFavorites"
		}
	},
	
	"/favorites/{favoriteId}": {
		"get": {
			"fcn": "controllers/favorites.js:getAllFavorite"
		},
		"put": {
		    "fcn": "controllers/favorites.js:updateFavorite"
		},
		"delete": {
		    "fcn": "controllers/favorites.js:deleteFavorite"
		}
	}
}
```

**server.js**

```
malcolm             = require('malcolm');
searchController    = require('./controllers/search.js');     // Your handler
favoritesController = require('./controllers/favorites.js');  // functions

// Any other middleware you want up front
// (E.g., cookie processing, authentication, etc.)

malcolm.init({
    raml:   './api/myApp.raml',    // RAML file
    jx:     './api/myApp.json'     // Extended metadata
}, function(err) {
    if ( err ) { ... Shouldn't happen ... }

    // Add all routes at once (REQUIRES "JX.JSON" FILE ABOVE)
    malcolm.addExpressRoutes(app, module);

    // Or, add routes one at a time (DOESN'T REQUIRE "JX.JSON" FILE)
    /*
    malcolm.addExpressRoute(app, '/search',                 'GET',    searchController.search);
    malcolm.addExpressRoute(app, '/favorites',              'GET',    favoritesController.getAllFavorites);
    malcolm.addExpressRoute(app, '/favorites',              'POST',   favoritesController.addFavorite);
    malcolm.addExpressRoute(app, '/favorites',              'DELETE', favoritesController.clearFavorites);
    malcolm.addExpressRoute(app, '/favorites/{favoriteId}', 'GET',    favoritesController.getFavorite);
    malcolm.addExpressRoute(app, '/favorites/{favoriteId}', 'PUT',    favoritesController.updateFavorite);
    malcolm.addExpressRoute(app, '/favorites/{favoriteId}', 'DELETE', favoritesController.deleteFavorite);
    ...
    */
});
```

**controllers/search.js**

```
function search = function(params, callback) {
    // NOTE: All parameters from request bundled nicely in params object 
    //       (whether via URL parameter, querystring, body, or header)
    // NOTE: No need to check for missing mandatory parameters
    // NOTE: No need to enforce validation rules (minLength, maxLength, minimum, maximum, etc.)
    // NOTE: Not called at all if/when any parameter validation errors occur (400 response prior)
    // NOTE: No need to apply default values if/when available and no value provided in request
    // NOTE: Datatype conversions performed automatically prior to invocation
    // NOTE: No res.json() call... just invoke callback with result
    // NOTE: Switch between Express and HAPI with no code changes here

    // ... Do search stuff using params.xxx, params.yyy, etc. ...
    if ( err ) {
        // Return a 500 response code with JSON response payload
        callback(err);
    } else if ( someCondition ) {
        // Return custom response code with payload of custom content type
    	callback(null, {
    	    responseCode: xxx,
    	    response: resultObject,
    	    responseContentType: 'application/json'
    	});
    } else {
        // Return a 200 response code with JSON response payload
        callback(null, resultObject);
    }
};
exports.search = search;
```

**controllers/favorites.js**

```
/* Simple functions (as in search.js) that have the signature: */
/*     function xxx(params, callback) */
function getAllFavorites = function(params, callback) { ... };
function addFavorite     = function(params, callback) { ... };
function clearFavorites  = function(params, callback) { ... };
function getFavorite     = function(params, callback) { ... };
function updateFavorite  = function(params, callback) { ... };
function deleteFavorite  = function(params, callback) { ... };

exports.getAllFavorites = getAllFavorites;
exports.addFavorite     = addFavorite;
exports.clearFavorites  = clearFavorites;
exports.getFavorite     = getFavorite;
exports.updateFavorite  = updateFavorite;
exports.deleteFavorite  = deleteFavorite;
```


## (Almost) Real Examples

See the git repository [malcolm-sample-express-client](https://github.com/comcast/malcolm-sample-express-client) for a simple example API server implemented with malcolm and Express.

See the git repository [malcolm-sample-hapi-client](https://github.com/comcast/malcolm-sample-hapi-client) for a simple API server implemented with malcolm and HAPI.

NOTE: The resource names within the RAML files of these examples are purposefully named to be illustrative and are not "proper" REST resource names.



## How to Use

To use **malcolm**, clients:

- Author .raml files as usual
- OPTIONAL: Author an optional .jx.json file that holds extended metadata and which enables developers to avoid even more boilerplate code (see the section "The optional .jx.json file" below for more information)
- After calling `malcolm.init`, use either `malcolm.addExpressRoutes` or `malcolm.addHapiRoutes` to add all routes at once (requires the .jx.json file) or `malcolm.addExpressRoute` or `malcolm.addHapiRoute` for each route (does not require the .jx.json file).
- Author transport-independent API implementation functions that take a POJO
  parameter value and invoke a callback with results (or an error), *NOT* functions
  that are tied to Express (with req, res parameters) or HAPI (with req, reply parameters).
- Within these API implementation functions, you don't have to worry about:

  - whether parameters were passed via Express/HAPI URL parameters, query string variables, headers, or within the body of an HTTP request
  - parameter validation
  - default value handling
  - datatype conversions (e.g., string => int, float, or Date)



## Extending RAML with Implementation-Specific Metadata

Some "advanced" features of **malcolm** require the specification of "extended metadata". This is metadata that is not supported by the core RAML specification. The extended metadata is specified in a __.jx.json__ file.

Because RAML does not allow "extra"/unknown properties and because we don't want to depend on a "hack" where we encode our extra metadata within properties like RAML's description field, **malcolm** depends on an "extra", "external" .jx.json file. 

The extra metadata includes the following kinds of information:

- function names for the functions implementing the actual route handling functions for each method for each resource from the API
- declarative specification, per method, of whether the method should
  set non-cacheing headers

While the core features of **malcolm** will work with just a RAML file, other features require the extended metadata defined in the companion .jx.json file.

Note that "nested" resources are NOT NESTED here.

##### Example extended metadata JSON file

```
{
	"/search": {
		"get": {
			"fcn": "controllers/search.js:search"
		}
	},

	"/favorites": {
		"get": {
			"fcn": "controllers/favorites.js:getAllFavorites"
		},
		"post": {
		    "fcn": "controllers/favorites.js:addFavorite"
		},
		"delete": {
		    "fcn": "controllers/favorites.js:clearFavorites"
		}
	},
	
	"/favorites/{favoriteId}": {
		"get": {
			"fcn": "controllers/favorites.js:getAllFavorite"
		},
		"put": {
		    "fcn": "controllers/favorites.js:updateFavorite"
		},
		"delete": {
		    "fcn": "controllers/favorites.js:deleteFavorite"
		}
	}
}
```

##### Features available without a .jx.json file

These features are available without a .jx.json file:

- All features delivered __without__ code generation
- Transport-independent API implementation functions
  (usable/testable without HTTP).
- Middleware-independent API implementation functions
  (usable within Express or HAPI with no change).
- Fake data response support, including
    - the ability to dynamically upload and remove fake data responses, and
    - the ability to use "variable expressions" for dates and times
      within fake data responses (e.g., "+2h|x" for two hours from
      now in Unix epoch format).
- Dynamic API documentation creation (no build/generation step).

Note that without the .jx.json file, you must use `addExpressRoute` or `addHapiRoute` for each individual route.

##### Features requiring the .jx.json file

These features require a .jx.json file as well as your RAML file:

- The ability to add all routes at once with `addExpressRoutes` or
  `addHapiRoutes` (note the 's'; plural)
- Declaratively set methods as non-cacheing.



## Dependencies

Check `package.json` to see **malcolm**'s dependencies.

**malcolm** does not directly depend on Express or HAPI, but for Express, it does access the request object in a way that requires Express 4.x (to get to req.body parameters).

**malcolm** does depend on raml-parser and raml2html, and because of this, only works with RAML 0.8 specifications, not RAML 1.0 specifications.
		 


## Installation

Approach 1: Directly install the desired version of this package. Use an appropriate 
git version tag.

```
    $ npm install --save git://git@github.com/comcast/malcolm.git#v1.0.1
```

Approach 2: Specify a package dependency on this package within a package.json file. Use an appropriate git version tag.

```
{
    "dependencies": {
        ...
        "malcolm": "git://github.com/comcast/malcolm.git#v1.0.1",
        ...  
    }
}
```

A list of tags for this repository is available on GitHub in the same dropdown as the branch selector. Also see the [Change Log](CHANGELOG.md).



## Fake Data / Mock Data / API Stubs

To help support clients of your API perform automated testing with your API, **malcolm** supports (a) the specification of sets of fake data responses (both static and dynamic) for each resource and method in the API, (b) a mechanism to optionally include support for these fake data responses within the **malcolm** API (e.g., perhaps turning this feature off in production), and (c) a way for clients to specify a specific fake data response to return per API invocation.

Fake data responses may be static (files within your source code) or may be dynamically uploaded (and cleared).

Note that the use of static fake data responses requires that in addition to your .raml file, you have a set of fake data response JSON files organized as described below and/or use the dynamic fake data uploading/clearing feature (see below).

### Defining static fake data responses

All static fake data responses should be organized into a directory hierarchy that matches your resource (and sub-resource, etc.) hierarchy, under a  mocks/ subdirectory in the same directory that holds your .raml file (which you specify when you call malcolm.init (your `raml` property value)).

For example, if you initialize malcolm like this:

```
malcolm.init({
    raml:   'api/my.raml',
    ...
}, ...
```
Then your fake data responses should be organized/located like this:

```
...
    api/
        my.raml             /* This is your RAML file */
        mocks/              /* These are all of your mock/fake data responses */
            resource1/
                get/
                    FOO.json
                    BAR.json
                post/
                    ZIPPY.json
            resource2/
                subResource2a/
                    get/
                        HELLO.json
```

NOTE: Notice the get/, post/, etc. subdirectories. These are lower-case
versions of HTTP method names. These are required.

NOTE: It is likely you will at first forget to add the 'get/' subdirectory if you normally/only have GET requests. You'll get over it.

### Conditionally Adding Fake Data Support

By default, the `malcolm.addExpressRoute` function (and the
`malcolm.addHapiRoute` function) adds fake data support by default.

Here, "fake data support" means that request processing will look
for a specific query string parameter and use this to return a
fake data response if one is defined (else the parameter will be ignored by **malcolm**).

#### Explicitly controlling fake data support

To explicitly control whether fake data support is added when metadata
about fake data sets is available, pass an extra boolean parameter to
`malcolm.addExpressRoute` (or `malcolm.addHapiRoute`):

```
// *** Notice the final boolean parameter
malcolm.addExpressRoute(app, '/posts', 'GET', postsController.getPosts, true);
```

One use of this explicity boolean parameter might be to set it to true for test / stage servers but to false for production servers (where you pass true or false depending on some environment check).

When fake data support is enabled, the malcolm code that runs before the
"real" route function for a given route checks for a special request
variable that, if present, determines which of a set of named fake data
responses to return *instead of invoking the "real" route function*.

### Uploading dynamic fake data responses

See the sample repos [malcolm-sample-express-client](https://github.com/comcast/malcolm-sample-express-client) and [malcolm-sample-hapi-client](https://github.com/comcast/malcolm-sample-hapi-client) for examples of how to add routes to allow testers to dynamically upload fake data responses (and clear them).

Basically, this entails:

- Adding a route (Express or HAPI) to which you'll POST to add a new fake data response (specifying the relative URI of the resource, the method, the fake data key, and the actual response you want to be returned when a request is made to the given resource with the given method and the given fake data key), and
- Adding a route (Express or HAPI) to which you'll DELETE to clear a fake data response (specifying the relative URI of the resource, the method, and the fake data key)

### Requesting fake data responses

Regardless of whether fake data responses are static files or dynamically uploaded, callers to API functions must specify that they want a fake data response. If no such indication is provided, all fake data processing is skipped and API functions perform "normally".

To specify which of a possible list of named fake data responses an API method invocation should return, the caller should pass a request query string variable named "**_malcolmFake**" (note the leading underscore) with a value which matches the name of a fake data response defined within the extended RAML metadata. This should be set as appropriate for the request (e.g., within the query string for GET calls or within the body JSON within POST calls).

For example:

```
curl http://myserver:8765/posts?userId=123&tag=ALL&_malcolmFake=NO_POSTS
```

The specific name for the request variable ("_malcolmFake" by default) may be overriden by specifying a "fakeDataKey" value when calling `malcolm.init()`. See the "Configuration" section below for more information.

It is recommended that fake data responses are named with ALL_CAPS, with underscores separating words (to resemble the naming convention used for constants in most languages).



## Dynamically generated HTML documentation

```
app.get('/your/path/doc', malcolm.expressDoc);  // or malcolm.hapiDoc
```

This produces HTML documentation for your API, based on your RAML file.

Note that this HTML documentation is dynamically generated from your RAML file
(not statically generated and saved).

Note that unless you may or may not want to make sure that this route is
disabled in production.

NOTE: This will *only* include information contained in standard RAML metadata fields (because it relies upon the API provided by
https://github.com/kevinrenskers/raml2html, which only "knows about" standard RAML).



## Configuration
As described above, the malcolm.init() call should be passed an object with these
two mandatory keys:


```
raml : 'myProject.raml',
jx   : 'myProject.json'
```

As well, the following properties may be passed, which control various aspects of
the module's behavior (default values are shown):

```

fakeDataKey: 'fakeyFakeFake',    // By default, '_malcolmFake' is used. Change it if you want

logging: {
    logLevel: 0,                 // 0=no logging, 1=logging (@TODO: other levels?) UNUSED
    logFunction: console.log,    // Replace if you want
    logThis: console             // Replace if you want
},

htmlResponseCodes: { // UNUSED
    success: 200,
    invalidParameterValue: 400,  // Whether missing or invalid
    internalError: 500           // Should a malcolm error occur
},

parameterErrorHandling: { // UNUSED
    includeErrorDetails: true,   // Should messages about any param problems be returned?
    stopAtFirstError: false      // Stop at first error, or gather all errors?
},

statistics: {
    statsLevel: 0,               // 0=no stats, 1=stats (@TODO: other levels?)
}

```



## Running malcolm Unit Tests

To run the test suite, first invoke the following command within the repo, which installs dependencies:

     $ npm install

then run the tests:

     $ npm test



## @TODO: Implementation

- Implement all features marked as FUTURE
- Support entity types (?) for resources and methods (like traits)
- Add more unit tests



## @TODO: Documentation
- Update doc after resolution of all items marked as @TODO
- Keep doc updated as FUTURE features are implemented



## Changelog
See [Changelog.md](CHANGELOG.md)



## Contributing
See [Contributing.md](CONTRIBUTING.md).



## License
**malcolm** is freely distributable under the terms of the [Apache 2.0 license](https://www.apache.org/licenses/LICENSE-2.0).
