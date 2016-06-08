from flask import Flask, request
import rpy2.robjects as robjects

app = Flask(__name__)
robjects.r['source']('rcode/cometsWrapper.R')

# separate api calls for the different authenication providers(Facebook, Google)
@app.route('/cometsRest/auth', methods = ['POST'])
def comets():

@app.route('/cometsRest/qc', methods = ['POST'])
def qualityControlCheck():
    #    return robjects.r['getApcDataJSON'](request.stream.read())[0]
    return ""

@app.route('/cometsRest/harm', methods = ['POST'])
def qualityControlCheck():
    return ""
@app.route('/cometsRest/correlate', methods = ['POST'])
def qualityControlCheck():
    return ""
