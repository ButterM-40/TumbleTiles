#!/usr/bin/env bash
# Debian project setup script for TumbleTiles.

sudo apt install python3-full \
&& python3 -m venv ./.venv \
&& echo './.venv/bin/python3 $@' > ./py \
&& sudo chmod +x ./py \
&& ./py -m pip install -r requirements.txt

