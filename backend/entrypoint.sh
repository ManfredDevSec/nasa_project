#!/bin/sh
set -e
mkdir -p "$(dirname "$SQLITE_PATH")"
python manage.py migrate --noinput
exec "$@"
