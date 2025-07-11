#!/bin/bash

set -eo pipefail

if [[ ! -d /source ]]; then 
  echo 'The `/source` directory has not been mounted.' 1>&2
  exit 2
fi

source "$HOME/.cargo/env"
eval "$(fnm env --use-on-cd --shell bash)"

cd /source
make "$@" || ret=$?

dir_owner="$(stat -c '%u:%g' .)"
chown -R "$dir_owner" .
exit $ret
