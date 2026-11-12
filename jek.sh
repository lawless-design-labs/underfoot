#!/bin/bash
# bundle install
set -e

bundle exec jekyll serve &
sleep 3

open -a Safari http://127.0.0.1:4000/underfoot/
