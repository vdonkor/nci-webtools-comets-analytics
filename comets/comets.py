from flask import Flask, request,json,jsonify
import rpy2.robjects as robjects
import sys, os, time, linecache

app = Flask(__name__)
wrapper = robjects.r
wrapper['source']('./cometsWrapper.R')

# separate api calls for the different authenication providers(Facebook, Google)
@app.route('/cometsRest/auth', methods = ['POST'])
def comets():
    return ""

@app.route('/cometsRest/qc', methods = ['POST'])
def qualityControlCheck():
    #    return robjects.r['getApcDataJSON'](request.stream.read())[0]
    return ""

# takes excel workbook as input
@app.route('/cometsRest/correlate/integrity', methods = ['POST'])
def integrityCheck():
    try:
        print "in integrityCheck"

        userFile = request.files['inputFile']
        if not os.path.exists('uploads'):
            os.makedirs('uploads')
                
        name, ext = os.path.splitext(userFile.filename)
        filename = "cometsInput_" + time.strftime("%Y_%m_%d_%I_%M") + ext
        serverFile = userFile.save(os.path.join('uploads', filename))
        
        if os.path.isfile(os.path.join('uploads', filename)):
            print "Successfully Uploaded"
        
        result=wrapper['processWorkbook'](filename)
        print "sending......"
        return jsonify(data=json.loads(result), status = "Success")
    except Exception as e:
        PrintException()

    
def PrintException():
    exc_type, exc_obj, tb = sys.exc_info()
    f = tb.tb_frame
    lineno = tb.tb_lineno
    filename = f.f_code.co_filename
    linecache.checkcache(filename)
    line = linecache.getline(filename, lineno, f.f_globals)
    print 'EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj)

import argparse
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    # Default port is production value; prod, stage, dev = 8140, sandbox = 9140
    parser.add_argument('-p', dest = 'port_num', default='9200', help='Sets the Port')
    parser.add_argument('--debug', action = 'store_true')
    args = parser.parse_args()
    app.run(host = '0.0.0.0', port = int(args.port_num), debug = args.debug, use_evalex = False)
