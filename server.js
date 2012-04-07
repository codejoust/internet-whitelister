var express = require('express')
  , redis = require('redis')
  , redis_conn = redis.createClient()
  , app = express.createServer()
  ,	sio = require('socket.io')
  , io = sio.listen(app);

io.set('log level', 1);

app.use(express.bodyParser());
app.use(express.logger());
app.use(function(req, res, next){
  if (req.headers['Via'] && req.headers['Via'].match(/squid/i)){
	res.writeHead(405, {'Content-Type': 'text/plain'});
	res.end('Not Allowed');
  } else {
    next();
  }
});

io.sockets.on('connection', function(socket){
	var sub_conn = redis.createClient();
	sub_conn.on('message', function(channel, message){
	  socket.emit('visits', message);
	});
	sub_conn.subscribe('visits');
});

app.get('/', function(req, res){
	var sort = get_sort(req.param('find'))
	redis_conn.zrangebyscore('resdomains', sort[0], sort[1], function(err, keys){
		res.render('index.jade', {locals: {psites: keys, sort: sort[2]}});
	});
});

function get_sort(parm){
	if (parm=='denied') return ['0','0', 'denied']
	if (parm=='accepted') return ['1','inf','accepted']
	return ['-inf','-1','pending']
}

app.get('/access', function(req,res){
	res.send('/access/(ip)/(action=free/deny)');
});

function get_ip(req){
  return req.socket && (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress));
}


app.get('/audit', function(req, res){
	var per_page  = (req.params.page && parseInt(req.params.page)) ? parseInt(req.params.page) : 0;
	var page_size = 120;
	redis_conn.lrange('connaudit', per_page*page_size, 120 + per_page*page_size, function(err, data){
		res.render('audits.jade', {audits: data.map(function(audit_entry){
			try {
			  return JSON.parse(audit_entry);
			} catch (e){ return null; };
		})});
	});
});

app.get('/access/:ip/:action', function(req, res){
	if (req.params.ip && req.params.action){
	  redis_conn.lpush('connaudit', JSON.stringify({date: new Date(), act: req.params.action, host: req.params.ip, from: get_ip(req)}), function(err, ok){
	  	  if (err) console.err(err);
		});
	  redis_conn.set('u:ip:' + req.params.ip, req.params.action, function(err, ok){
		if (err){ res.send('err setting: ' + err) }
		else { res.send('ok: ip (' + req.params.ip + ') action '+req.params.action); }
  	  });
    } else { res.send('usage: /access/(ip)/(free/deny) - '); }
});

app.get('/accepted', function(req,res){
	redis_conn.zrangebyscore('resdomains','1','inf', function(err, keys){
		res.render('index.jade', {locals: {psites: keys}});
	});
});

app.post('/update', function(req, res){
	if (req.body.domain && req.body.action){
		var domain = req.body.domain;
	  redis_conn.lpush('connaudit', JSON.stringify({date: new Date(), act: req.body.action, host: req.body.domain, from: get_ip(req)}), function(err, ok){
	  	  if (err) console.err(err);
		});
		if (req.body.action == 'accept'){
			redis_conn.zadd('resdomains', 1, req.body.domain, function(err){
				//res.send({status: err});	
				res.send('<h4>allowed access for '+domain+'</h4><script>window.parent.document.forms["'+domain+'"].parentNode.className+=" del mv";</script>');
			});
		} else if (req.body.action == 'deny'){
			redis_conn.zadd('resdomains', 0, req.body.domain, function(err){
				res.send('<h4>denied access for '+domain+'</h4><script>window.parent.document.forms["'+domain+'"].parentNode.className+=" mv acc";</script>');
			});
		} else if (req.body.action == 'delete'){
			redis_conn.zrem('resdomains', req.body.domain, function(err){
				res.send('<h4>domain deleted: '+domain+'</h4><script>window.parent.document.forms["'+domain+'"].parentNode.className+=" del mv";</script>');
			});
		}
	}
});

app.listen(3333);
