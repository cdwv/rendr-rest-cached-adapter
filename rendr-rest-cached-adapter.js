var RestAdapter = require('rendr/server/data_adapter/rest_adapter');
var _ = require('underscore');
var util = require('util');
var crypto = require('crypto');
var equal = require('deep-equal');
var CacheEngine = require('./primitive-cache');

module.exports = RestCachedAdapter;

var cache, 
    cachedEndpointRegexes
    ;

function RestCachedAdapter(options) {
    _.defaults(options, {
       userAgent: 'Rend RestCachedAdapter',
       cachedEndpoints: [],
       maxAge: 30 * 1000,
    });

    cachedEndpointRegexes = getRegexes(options.cachedEndpoints);
    cache = new CacheEngine({ maxAge: options.maxAge });
    
    RestAdapter.call(this, options);
}

util.inherits(RestCachedAdapter, RestAdapter);

RestCachedAdapter.prototype.request = function(req, api) {
	/*
    _.defaults(api, {
      forever: true,
    });
	*/

    var requestStartTime = Date.now();
    var _arguments = arguments;
    var _this = this;

    if(!isCacheable(api.path, api.query)) {
      console.log('Not cacheable endpoint', api.path, api.query);
      RestAdapter.prototype.request.apply(this, arguments);
      return;
    }
      console.log('Cacheable endpoint', api.path, api.query);

      var requestHash = crypto
        .createHmac('sha256', JSON.stringify({ path: api.path, query: api.query }))
        .digest('hex');

      var _callback = _arguments[_arguments.length - 1];
      if(req.headers['force-refresh']) {
        cache.delete(requestHash);
      }
      
      var cachedResponse = cache.get(requestHash) || cache.put(requestHash, new Promise(function(resolve, reject){
        console.log('started promise', requestHash);
        // overwrite callback
        _arguments[_arguments.length - 1] = function(err, response, body) {
          if(err) {
            console.log('data not fetched', err);
            reject({err: err, response: response, body: body})
            return;
          }
          console.log('data fetched from api', requestHash, 'in', Date.now() - requestStartTime)
          resolve({ err: err, response: response, body: body});
        }

        RestAdapter.prototype.request.apply(_this, _arguments);
      }));
      
      cachedResponse.then(function(res) {
        _callback(res.err, res.response, res.body);
      }).catch(function(res) {
        cache.delete(requestHash);
        _callback(res.err, res.response, res.body);
      });
}

function getRegexes(list)
{
    return list.map(function(obj) {
        obj.path = new RegExp(obj.path)
        return obj;
    });
}

function isCacheable(path, query)
{
    cachedEndpointRegexes.some(function(obj) {
        if (obj.path.test(path) && equal(query, obj.query || {})) {
            this.result = true;
            return true;
        }
        return false;
    }, this);

    return this.result;
}

