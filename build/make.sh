#!/bin/bash

set -eo pipefail

if [[ ! -d /source ]]; then 
  echo 'The `/source` directory has not been mounted.' 1>&2
  exit 2
fi

source "$HOME/.cargo/env"
eval "$(fnm env --use-on-cd --shell bash)"

cd /source
make "$@"

if [[ -d .output ]]; then
  dir_owner="$(stat -c '%u' .)"
  chown -R "$dir_owner" .output
fi
