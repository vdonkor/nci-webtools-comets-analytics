import json, sys, os, time, linecache
from flask import Flask, request, json, jsonify, send_from_directory
from rpy2.robjects import r as wrapper

app = Flask(__name__)
wrapper.source('./cometsWrapper.R')

def buildFailure(message,statusCode = 400):
  response = jsonify(message)
  response.status_code = statusCode
  return response

def buildSuccess(message):
  response = jsonify(message)
  response.status_code = 200
  return response

# takes excel workbook as input
@app.route('/cometsRest/integrityCheck', methods = ['POST'])
def integrityCheck():
    try:
        userFile = request.files['inputFile']
        if not os.path.exists('uploads'):
            os.makedirs('uploads')
        name, ext = os.path.splitext(userFile.filename)
        filename = "cometsInput_" + time.strftime("%Y_%m_%d_%I_%M") + ext
        saveFile = userFile.save(os.path.join('uploads', filename))
        if os.path.isfile(os.path.join('uploads', filename)):
            print("Successfully Uploaded")
        result=json.loads(wrapper.checkIntegrity(os.path.join('uploads', filename))[0])
        if ("error" in result):
            response = buildFailure(result['error'])
        else:
            result['saveValue']['filename'] = os.path.splitext(filename)[0]
            response = buildSuccess(result['saveValue'])
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
        response = buildFailure({"status": False, "error":"An unknown error occurred"})
    return response

# takes previously uploaded file and 
@app.route('/cometsRest/correlate', methods = ['POST'])
def correlate():
    try:
        parameters = dict(request.form)
        for field in parameters:
            parameters[field] = parameters[field][0]
        inputData = {
            'cohort': parameters['cohortSelection'],
            'filename': os.path.join('uploads', parameters['filename']+".xlsx"),
            'method': parameters['methodSelection']
        }
        if (parameters['methodSelection'] == 'batch'):
            inputData['model'] = parameters['modelSelection']
        elif (parameters['methodSelection'] == 'interactive'):
            inputData['model'] = parameters['modelDescription']
            inputData['outcomes'] = parameters['outcome'].split(',')
            inputData['exposures'] = parameters['exposure'].split(',')
            inputData['covariates'] = parameters['covariates'].split(',')
        else:
            return buildFailure({"status": False, "error": "An unknown or no method of analyses was selected."})
        result=json.loads(wrapper.runModel(json.dumps(inputData))[0])
        if ("error" in result):
            response = buildFailure(result['error'])
        else:
            response = buildSuccess(result['saveValue'])
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
        response = buildFailure({"status": False, "error":"An unknown error occurred"})
    return response
        
import argparse
if __name__ == '__main__':
    parser = argparse.ArgumentParser()

    # Default port is 9200
    parser.add_argument('-p', '--port', type = int, dest = 'port', default = 9200, help = 'Sets the Port')
    parser.add_argument('-d', '--debug', action = 'store_true', help = 'Enables debugging')
    args = parser.parse_args()
    app.run(host = '0.0.0.0', port = args.port, debug = args.debug, use_evalex = False)
