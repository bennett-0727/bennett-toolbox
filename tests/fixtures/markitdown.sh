#!/bin/sh
case "$1" in
  *fail*) echo "boom: cannot convert" >&2; exit 2 ;;
esac
printf "# Converted\n\ncontent from %s\n" "$(basename "$1")"
