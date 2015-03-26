#!/bin/bash
/usr/bin/node /etc/QuakeShake/server/quakeShakeSub.js config=$1 >> /var/log/pnsn_web/quakeshakeSub-$1.log 2>&1 &