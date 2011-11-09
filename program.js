#!/usr/bin/env node

var stdin = process.openStdin()
  , url = require('url')
  , redis = require('redis-node')
  , redis_conn = redis.createClient();

function check_allowed_host(host, ok, fail){
	redis_conn.zscore('resdomains', host, function(err, rank){
		if (rank == 0){
			fail('deny');
			return;
		}
		if (rank && rank > 0){
			ok();
			redis_conn.zincrby('resdomains', 1, host);
		} else {
			var stripped_host = host.match(/[^.]+\.[^.]+$/);
			redis_conn.zscore('resdomains', stripped_host, function(err, rank){
				if (rank && rank > 0){
					ok();
					redis_conn.zincrby('resdomains', 1, stripped_host);
				} else {
					fail('unknown');
					if (rank != 0) redis_conn.zincrby('resdomains', -1, stripped_host);
				}
			});
		}
	});
}


stdin.on('data', function(chunk){
 try {
  var input_raw = (chunk + '').split(' ');
  var request = {url_raw: input_raw.shift(), ip: input_raw.shift(), ident: input_raw.shift(), method: input_raw.shift()};
  request.url = url.parse(request.url_raw);
  if (request.url['hostname']){
  	check_allowed_host(request.url['hostname'], function(){
      console.log("True");
	}, function(type){
      console.log((request.method == 'CONNECT') ? '302:' : '' + "http://192.168.1.209/"+type+".html?h=" + request.url['hostname'] + "&u=" + request.url_raw);
	});
  } else {
    console.log("302:http://192.168.1.209/unknown.html?err=ERR! No hostname&raw=" + escape(chunk+''));
  }
  } catch (e){
	console.log("302:http://192.168.1.209/unknown.html?err=" + e);
  }
});
