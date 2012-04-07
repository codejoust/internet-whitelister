#!/usr/bin/env node

var stdin = process.openStdin()
  , url = require('url')
  , redis = require('redis')
  , redis_conn = redis.createClient()
  , writeout = console.log;

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

function check_user_allowed(ip, ok, fail){
	if (!ip){ fail(); return; }
	redis_conn.get('u:ip:' + ip, function(err, data){
		if (err){ fail(); }
		else if (data == 'free') { 
			ok(); 
		}
		else { fail(); }
	})
}

stdin.on('data', function(chunk){
 try {
  var input_raw = (chunk + '').split(' ');
  var request = {url_raw: input_raw.shift(), ip: input_raw.shift(), ident: input_raw.shift(), method: input_raw.shift()};
  if (request.ip){
  	request.ip = request.ip.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/)[0];
  }
  request.url = url.parse(request.url_raw);
  if (request.url['hostname']){
    check_user_allowed(request.ip, function(){
	  writeout("True");
	}, function(){
  	  check_allowed_host(request.url['hostname'], function(){
       redis_conn.publish('visits', JSON.stringify({ip: request.ip, host: request.url['hostname'], date: new Date().getTime()}));
       writeout("True");
	  }, function(type){
       writeout((request.method == 'CONNECT') ? '302:' : '' + "http://localhost/pproxy.php?h=" + request.url['hostname'] + "&u=" + request.url_raw + '&m=' + request.method);
	  });
   });
  } else {
    writeout("302:http://localhost/unknown.html?err=ERR! No hostname&raw=" + escape(chunk+''));
  }
  } catch (e){
	writeout("302:http://localhost/unknown.html?err=" + e);
  }
});
