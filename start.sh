#!/bin/bash
# Launch ytgui on the desktop's X display as the logged-in user (copied from aidle/restart.sh).
cd "$(dirname "$0")"
pkill -f "electron.*pluck/main.js" 2>/dev/null; sleep 1
X_PS=$(pgrep -a Xwayland | head -1); [ -z "$X_PS" ] && X_PS=$(pgrep -a Xorg | head -1)
XDISPLAY=$(echo "$X_PS" | grep -oP '(?<= )\:\d+(?= |$)' | head -1)
XAUTH=$(echo "$X_PS" | grep -oP '(?<=-auth )\S+')
[ -z "$XDISPLAY" ] && XDISPLAY=$(who | awk '$1 == "thegeeky" && $NF ~ /^\(:[0-9]+\)$/ { gsub(/[()]/, "", $NF); print $NF; exit }')
[ -z "$XDISPLAY" ] || [ -z "$XAUTH" ] && { echo "No X display found" >&2; exit 1; }
runuser -u thegeeky -- bash -c "HOME=/home/thegeeky USER=thegeeky DISPLAY=$XDISPLAY XAUTHORITY=$XAUTH $(pwd)/node_modules/electron/dist/electron --no-sandbox --disable-gpu $(pwd)/main.js" > /tmp/pluck.log 2>&1 &
sleep 3; pgrep -f "electron.*pluck/main.js" | head -1 | sed 's/^/App running, PID: /'
