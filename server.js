var express = require('express')
  , redis = require('redis-node')
  , redis_conn = redis.createClient()
  , app = express.createServer();

app.use(express.bodyParser());

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

app.get('/accepted', function(req,res){
	redis_conn.zrangebyscore('resdomains','1','inf', function(err, keys){
		res.render('index.jade', {locals: {psites: keys}});
	});
});

app.post('/update', function(req, res){
	if (req.body.domain){
		var domain = req.body.domain;
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
