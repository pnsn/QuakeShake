#!/bin/bash
/usr/bin/node /etc/QuakeShake/server/quakeShakePub.js config=$1 >> /var/log/quakeshake-$1.log 2>&1 &