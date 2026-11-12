#!/bin/bash

# Kill the jekyll process excluding the grep process itself
kill -9 $(ps aux | grep '[j]ekyll' | awk '{print $2}')
# kill -9 $(ps aux | grep jekyll | head -1 | awk '{print $2}')

