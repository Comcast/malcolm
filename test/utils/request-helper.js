'use strict';

// Constructor
function Req(data) {
	this.data = {};
	this.extend(data);
	this.timeout = 10000; // default timeout
}

Req.prototype.setApp = function(app) {
	Req.prototype.app = app;
	return this;
};

Req.prototype.setTimeout = function(timeout) {
	this.timeout = timeout;
	return this;
};

Req.prototype.extend = function(newData) {
	this._deepExtend(newData, this.data);
	return this;
};

Req.prototype._deepExtend = function(newData, curNode) {
	for (var property in newData) {
		var newDataNode = newData[property];
		if (typeof newDataNode === 'object') {
			curNode[property] = {};
			this._deepExtend(newDataNode, curNode[property]);
		} else {
			curNode[property] = newDataNode;
		}
	}
};

Req.prototype.method = function(methodName) {
	this.data.method = methodName.toUpperCase();
	return this;
};

Req.prototype.payload = function(payload) {
	this.data.payload = payload;
	return this;
};

Req.prototype.setPayloadKey = function(payloadKeyName, payloadKeyValue) {
	if (!this.data.payload) {
		this.data.payload = {};
	}
	this.data.payload[payloadKeyName] = payloadKeyValue;
	return this;
};

Req.prototype.params = function(params) {
	this.data.params = params;
	return this;
};

Req.prototype.setParamsKey = function(paramsKeyName, paramsKeyValue) {
	if (!this.data.params) {
		this.data.params = {};
	}
	this.data.params[paramsKeyName] = paramsKeyValue;
	return this;
};

Req.prototype.headers = function(headers) {
	this.data.headers = headers;
	return this;
};

Req.prototype.setHeader = function(headerName, headerValue) {
	if (!this.data.headers) {
		this.data.headers = {};
	}
	this.data.headers[headerName] = headerValue;
	return this;
};

Req.prototype.url = function(url) {
	this.data.url = url;
	return this;
};

Req.prototype.setDefaultUrl = function(defaultUrl) {
	Req.prototype.defaultUrl = defaultUrl;
	return this;
};

Req.prototype.setCollection = function(nameOfCollection, valueOfCollection) {
	this.data[nameOfCollection] = valueOfCollection;
	return this;
};

Req.prototype.setCollectionKey = function(nameOfCollection, nameOfKey, valueOfKey) {
	if ( !this.data[nameOfCollection] ) {
		this.data[nameOfCollection] = {};
	}
	this.data[nameOfCollection][nameOfKey] = valueOfKey;
	return this;
};

Req.prototype.sendAndReceive = function(responseProcessing, done) {
	this.data.url = this.data.url || this.defaultUrl;
	this.data.method = this.data.method.toUpperCase() || 'GET';
	this.needForceDone = true;
	this.error = null;
	this.done = done;
	var that = this;
	setTimeout(function() {
		if ( that.needForceDone && (typeof (that.done) === 'function') ) {
			that.done(new Error('This request was forcibly completed as timeout!'));
		}
	}, this.timeout);
	this.printRequest();
	this.app.inject(
		this.data,
		function(response) {
			try {
				responseProcessing(response);
			} catch (err) {
				that.error = err;
			}
			that.needForceDone = false;
			if (typeof (that.done) === 'function') {
				that.done(that.error);
			}
		}
	);

	return this;
};

Req.prototype.printRequest = function() {
	if (this.verbose) {
		console.log('---- Request ----\n' + JSON.stringify(this.data, null, 4) + '\n--------------------\n');
	}
	return this;
};

Req.prototype.setVerbose = function(verbose) {
	Req.prototype.verbose = verbose;
	return this;
};

module.exports = Req;
