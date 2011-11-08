#!/usr/bin/env node

var stdin = process.openStdin()
  , url = require('url')
  , redis = require('redis-node')
  , redis_conn = redis.createClient();

/*
function check_allowed_host(host, ok, fail){
  if (host == 'localhost'){
  	  ok();
  	  return true;
  }
  redis_conn.hget('d:' + host, 'allowed', function(domain_exists){
    if (!domain_exists){
    	var stripped_host = host.match(/[^.]+\.[^.]+$/)
    	if (!stripped_host){
    		fail();
    	} else {
			redis_conn.hget('d:' + stripped_host, 'allowed', function(st_host_ex){
				if (st_host_ex){
					redis_conn.hcincrby('d:' + stripped_host, 'hits', 1);
					ok();
				} else {
					redis_conn.hset('d:' + stripped_host, '

				}
				redis_conn.incr('d:' + stripped_host);
			});
		}
	} else {
		redis_conn.hincrby('d:' + host, 'hits', 1);
		ok();
	}
  });
}
*/


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
      console.log("http://localhost/"+type+".html?h=" + request.url['hostname'] + "&u=" + request.url_raw);
	});
  } else {
    console.log("http://localhost/unknown.html?err=ERR! No hostname&raw=" + escape(chunk+''));
  }
  } catch (e){
	console.log("http://localhost/unknown.html?err=" + e);
  }
});
