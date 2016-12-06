#!/usr/bin/python

import sys, yaml
sys.stdout = sys.stderr

from comets import app as application

def flatten(yaml,parent=None):
    for param in yaml:
        if (isinstance(yaml[param],dict)):
            flatten(yaml[param],param)
        else:
            application.config[(parent+"." if parent else "")+param] = yaml[param]
with open("restricted/settings.yml", 'r') as f:
    flatten(yaml.safe_load(f))
    
