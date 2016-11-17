#!/usr/bin/python

import sys #, yaml
sys.stdout = sys.stderr

from comets import app as application

with open("../settings.yml", 'r') as f:
    application.config['token'] = f.read()
#    cfg = yaml.load(ymlfile)
#    for parameter in cfg:
#        application.config[parameter] = cfg[parameter]
