#!/usr/bin/python

import sys
sys.stdout = sys.stderr

from comets import app as application

with open("restricted/token.txt", 'r') as f:
    application.config['token'] = f.read()
