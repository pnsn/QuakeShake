#!/bin/bash
/usr/bin/node /etc/QuakeShake/server/quakeShakeSub.js config=$1 >> /var/log/quakeshakeSub.log 2>&1 &