module.exports = CacheEngine;

function CacheEngine(options)
{
    this.cache = {};
    this.maxAge = options.maxAge;
} 

CacheEngine.prototype.get = function(key)
{
      if(this.cache[key] && this.cache[key].ts >= Date.now() - this.maxAge) {
        return this.cache[key].payload; 
      }

      if(this.cache[key] && this.cache[key].ts < Date.now() - this.maxAge) {
        delete this.cache[key];
      }
}

CacheEngine.prototype.put = function(key, value)
{
    this.cache[key] = {
      ts: Date.now(),
      payload: value 
    };
     
    return value;
}

CacheEngine.prototype.delete = function(key)
{
  delete this.cache[key];
}
