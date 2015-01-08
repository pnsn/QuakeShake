#!/bin/bash
/usr/bin/node /etc/QuakeShake/server/quakeShakePub.js $1 >> /var/log/quakeshake.log 2>&1 &