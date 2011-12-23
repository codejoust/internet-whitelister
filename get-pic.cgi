#!/usr/bin/env node

var http = require('http');
http.createServer(function(req,res){
res.writeHead(200, {'Content-Type': 'image/png'});
var pic_proc = require('child_process').spawn('./screenshot.py', [req.url.substr(1)])
pic_proc.stderr.pipe(process.stderr);
console.log(req.url);
var arand = function(n){ return Math.floor(Math.random() * n) },
    rands = arand(30) + ',' + arand(40) + ',' + arand(100);
var morgify = require('child_process').spawn('convert',['-','-rotate','200','-colorize',rands,'-']);
pic_proc.stdout.pipe(morgify.stdin);
morgify.stdout.on('data', function(data){ res.write(data); });
morgify.on('exit', function(){ res.end(); });
//pic_proc.on('exit', function(){res.end()});
//pic_proc.on('data', function(data){res.write(data)});
}).listen(1337, '0.0.0.0');




