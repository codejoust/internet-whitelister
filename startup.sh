#!/bin/sh
forever start -a -l ~/internet-filter/logs/forever.log -o ~/internet-filter/logs/out.log -e ~/internet-filter/logs/err.log server.js
