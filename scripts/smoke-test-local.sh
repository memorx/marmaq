#!/usr/bin/env bash
# Wrapper: corre el smoke test contra localhost:3000
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/smoke-test.sh" local
