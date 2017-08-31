import json, linecache, os, requests, smtplib, sys, time, yaml
import pyper as pr
from boto.s3.connection import S3Connection
from flask import Flask, json, jsonify, request, Response, send_from_directory
from stompest.config import StompConfig
from stompest.sync import Stomp

app = Flask(__name__)

def flatten(yaml,parent=None):
    for param in yaml:
        if (isinstance(yaml[param],dict)):
            flatten(yaml[param],param)
        else:
            app.config[(parent+"." if parent else "")+param] = yaml[param]

def loadHtmlTemplates(app):
    templates = {}
    if os.path.exists('templates'):
        for templateFile in os.listdir("templates"):
            if templateFile.endswith('.html'):
                with open(os.path.join('templates', templateFile), 'r') as content_file:
                    content = content_file.read()
                    filename = os.path.splitext(templateFile)[0]
                    templates[filename] = content
    app.config["htmlTemplates"] = templates

def loadExcelTemplates(app):
    r = pr.R()
    r('source("./cometsWrapper.R")')
    r('templates = getTemplates()')
    app.config["excelTemplates"] = {
        'templates': json.loads(r['templates'])
    }

def loadCohortList(app):
    r = pr.R()
    r('source("./cometsWrapper.R")')
    r('cohorts = getCohorts()')
    app.config["cohortList"] = {
        'cohorts': json.loads(r['cohorts'])
    }

def buildFailure(message,statusCode = 500):
  response = jsonify(message)
  response.status_code = statusCode
  return response

def buildSuccess(message):
    def generate():
        forOutput = ""
        for chunk in json.JSONEncoder().iterencode(message):
            forOutput += chunk
            if (len(forOutput) > 10000):
                yield forOutput
                forOutput = ""
        yield forOutput
    return Response(generate(),status=200)

def composeMail(sender,recipients,subject,content):
    try:
        if (not isinstance(recipients,list)):
            recipients = [ recipients ]
        if (app.config['email.auth']):
            smtp = smtplib.SMTP_SSL(app.config['email.host'], app.config['email.port'])
            smtp.login(app.config['email.username'],app.config['email.password'])
        else:
            smtp = smtplib.SMTP(app.config['email.host'], app.config['email.port'])
        message = "From: "+sender+"\n"+"To: "+", ".join(recipients)+"\n"+"Subject: "+subject+"\n\n"+content
        smtp.sendmail(sender,recipients,message)
        smtp.quit()
        return True
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
        pass
    return False

def queueFile(parameters):
    s3conn = S3Connection(app.config['s3.username'],app.config['s3.password']).get_bucket(app.config['s3.bucket']).new_key('/comets/input/'+parameters['filename'])
    s3conn.set_contents_from_filename(os.path.join('tmp',parameters['filename']))
    forQueue = json.dumps(parameters)
    client = Stomp(StompConfig('tcp://'+app.config['queue.host']+':'+str(app.config['queue.port'])))
    client.connect()
    client.send('/queue/test',forQueue)
    client.disconnect()

# takes excel workbook as input
@app.route('/cometsRest/integrityCheck', methods = ['POST'])
def integrityCheck():
    try:
        userFile = request.files['inputFile']
        if not os.path.exists('tmp'):
            os.makedirs('tmp')
        name, ext = os.path.splitext(userFile.filename)
        filename = "cometsInput_" + time.strftime("%Y_%m_%d_%I_%M") + ext
        saveFile = userFile.save(os.path.join('tmp', filename))
        if os.path.isfile(os.path.join('tmp', filename)):
            print("Successfully Uploaded")
        r = pr.R()
        r('source("./cometsWrapper.R")')
        r.assign('filename',os.path.join('tmp',filename))
        r.assign('cohort',request.form['cohortSelection'])
        r('checkIntegrity = checkIntegrity(filename,cohort)')
        returnFile = r['checkIntegrity']
        del r
        with open(returnFile) as file:
            result = json.loads(file.read())
        os.remove(returnFile)
#        if ("warnings" in result):
#          print(result['warnings'])
#          sys.stdout.flush()
        if ("error" in result):
            response = buildFailure(result['error'])
        else:
            result['saveValue']['filename'] = os.path.splitext(filename)[0]
            result['saveValue']['originalFilename'] = name+ext
            response = buildSuccess(result['saveValue'])
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
        response = buildFailure({"status": False, "integritymessage":"An unknown error occurred"})
    finally:
        return response

# takes previously uploaded file and 
@app.route('/cometsRest/correlate', methods = ['POST'])
def correlate():
    try:
        parameters = dict(request.form)
        for field in parameters:
            parameters[field] = parameters[field][0]
        if ('filename' in parameters):
            parameters['filename'] = parameters['filename']+".xlsx"
        if ('outcome' in parameters):
            parameters['outcome'] = json.loads(parameters['outcome'])
            if (len(parameters['outcome']) == 0):
                parameters['outcome'] = None
        if ('exposure' in parameters):
            parameters['exposure'] = json.loads(parameters['exposure'])
            if (len(parameters['exposure']) == 0):
                parameters['exposure'] = None
        if ('covariates' in parameters):
            parameters['covariates'] = json.loads(parameters['covariates'])
            if (len(parameters['covariates']) == 0):
                parameters['covariates'] = None
        if ('strata' in parameters):
            if (len(parameters['strata']) == 0):
                parameters['strata'] = None
            else:
                parameters['strata'] = [parameters['strata']]
        if ('whereQuery' in parameters):
            parameters['whereQuery'] = json.loads(parameters['whereQuery']);
            if (len(parameters['whereQuery']) == 0):
                parameters['whereQuery'] = None
        if (parameters['modelName'] == "All models"):
            queueFile(parameters)
            response = buildFailure({'status': 'info', 'statusMessage': "The results will be emailed to you."})
        else:
            if ('filename' in parameters):
                parameters['filename'] = os.path.join('tmp', parameters['filename'])
            r = pr.R()
            r('source("./cometsWrapper.R")')
            r.assign('parameters',json.dumps(parameters))
            r('correlate = runModel(parameters)')
            returnFile = r['correlate']
            del r
            with open(returnFile) as file:
                result = json.loads(file.read())
            os.remove(returnFile)
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
        response = buildFailure({"status": False, "statusMessage":"An unknown error has occurred."})
    finally:
        return response

@app.route('/cometsRest/combine', methods = ['POST'])
def combine():
    try:
        parameters = dict(request.form)
        for field in parameters:
            parameters[field] = parameters[field][0]
        if not os.path.exists('tmp'):
            os.makedirs('tmp')
        timestamp = time.strftime("%Y_%m_%d_%I_%M")
        # abundences
        abundances = request.files['abundances']
        name, ext = os.path.splitext(abundances.filename)
        filenameA = os.path.join('tmp',"abundances_" + timestamp + ext)
        saveFile = abundances.save(filenameA)
        parameters['abundances'] = filenameA
        if os.path.isfile(filenameA):
            print("Successfully Uploaded Abundances")
        # metadata
        metadata = request.files['metadata']
        name, ext = os.path.splitext(metadata.filename)
        filenameM = os.path.join('tmp',"metadata_" + timestamp + ext)
        saveFile = metadata.save(filenameM)
        parameters['metadata'] = filenameM
        if os.path.isfile(filenameM):
            print("Successfully Uploaded Metadata")
        #samples
        sample = request.files['sample']
        name, ext = os.path.splitext(sample.filename)
        filenameS = os.path.join('tmp',"sample_" + timestamp + ext)
        saveFile = sample.save(filenameS)
        parameters['sample'] = filenameS
        if os.path.isfile(filenameS):
            print("Successfully Uploaded Sample")
        r = pr.R()
        r('source("./cometsWrapper.R")')
        r.assign('parameters',json.dumps(parameters))
        r('combine = combineInputs(parameters)')
        returnFile = r['combine']
        del r
        with open(returnFile) as file:
            result = json.loads(file.read())
        os.remove(returnFile)
        os.remove(filenameA)
        os.remove(filenameM)
        os.remove(filenameS)
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
        response = buildFailure({"status": False, "statusMessage":"An unknown error has occurred."})
    finally:
        return response

@app.route('/cometsRest/templates', methods = ['GET'])
def templates():
    return jsonify(app.config["htmlTemplates"])

@app.route('/cometsRest/excelTemplates', methods=['GET'])
def excelTemplates():
    return buildSuccess(app.config["excelTemplates"])
        
@app.route('/cometsRest/public/cohorts', methods=['GET'])
def cohorts():
    return buildSuccess(app.config['cohortList'])

@app.route('/cometsRest/registration/user_metadata', methods=['POST'])
def user_metadata():
    try:
        parameters = json.loads(request.data)
        data = {
            "app_metadata": {
                "comets": "active"
            },
            "user_metadata" : {
                "affiliation": parameters['affiliation'],
                "cohort": parameters['cohort'],
                "family_name": parameters['family_name'],
                "given_name": parameters['given_name']
            }
        }
        url = "https://"+app.config['auth0.domain']+".auth0.com/api/v2/users/"+parameters['user_id']
        headers = {
            "Authorization": "Bearer "+app.config['auth0.token'],
            "Content-Type": "application/json"
        }
        response = json.loads(requests.patch(url,data=json.dumps(data),headers=headers).text)
        response['comets'] = 'active'
        user = response['user_metadata']
        email = response['email']
        composeMail(
            app.config['email.sender'],
            app.config['email.admin'],
            "Comets User Registration",
            "Dear Comets Admins,\n\n"+
            "This email is to let you know a user just registered on the Comets Analytics web site and entered the following information.\n\n"+
            "Email Address: "+email+"\n"+
            "Last Name: "+user["family_name"]+"\n"+
            "First Name: "+user["given_name"]+"\n"+
            "Affiliation: "+user["affiliation"]+"\n"+
            "Cohort: "+user["cohort"]+"\n\n"+
            "Sincerely,\n"+
            "Sent from the Comets Analytics Web Tool"
        )
        response = buildSuccess(response)
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
        response = buildFailure({"status": False, "statusMessage":"An unknown error has occurred."})
    finally:
        return response

@app.route('/cometsRest/admin/users', methods=['GET'])
def user_list_get():
    try:
        url = "https://"+app.config['auth0.domain']+".auth0.com/api/v2/users?q=comets%5B*%20TO%20*%5D&fields=app_metadata%2Cemail%2Cfamily_name%2Cgiven_name%2Cidentities.connection%2Cuser_id%2Cuser_metadata&include_fields=true&per_page=100&page="
        headers = {
            "Authorization": "Bearer "+app.config['auth0.token'],
            "Content-Type": "application/json"
        }
        page = 0
        request = json.loads(requests.get(url+str(page),headers=headers).text)
        response = request
        while len(request) == 100:
            page += 1
            request = json.loads(requests.get(url+str(page),headers=headers).text)
            response += request
        response = buildSuccess({"user_list":response})
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
        response = buildFailure({"status": False, "statusMessage":"An unknown error occurred"})
    finally:
        return response

@app.route('/cometsRest/admin/users', methods=['PATCH'])
def user_list_update():
    try:
        user_list = json.loads(request.data)
        response = []
        for parameters in user_list:
            comets = parameters['app_metadata']['comets']
            data = {
                "app_metadata": {
                    "comets": comets
                }
            }
            url = "https://"+app.config['auth0.domain']+".auth0.com/api/v2/users/"+parameters['user_id']
            headers = {
                "Authorization": "Bearer "+app.config['auth0.token'],
                "Content-Type": "application/json"
            }
            line = json.loads(requests.patch(url,data=json.dumps(data),headers=headers).text)
            line['comets'] = line['app_metadata']['comets']
            response.append(line)
        response = buildSuccess({'user_list': response})
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
        response = buildFailure({"status": False, "statusMessage":"An unknown error occurred"})
    finally:
        return response

with open("restricted/settings.yml", 'r') as f:
    flatten(yaml.safe_load(f))
loadHtmlTemplates(app)
loadExcelTemplates(app)
loadCohortList(app)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()

    # Default port is 9200
    parser.add_argument('-p', '--port', type = int, dest = 'port', default = 9200, help = 'Sets the Port')
    parser.add_argument('-d', '--debug', action = 'store_true', help = 'Enables debugging')
    args = parser.parse_args()
    if (args.debug):
        @app.route('/common/<path:path>')
        def common_folder(path):
            return send_from_directory("C:\\common\\",path)

        @app.route('/<path:path>')
        def static_files(path):
            if (path.endswith('/')):
                path += 'index.html'
            return send_from_directory(os.getcwd(),path)
    #end remove
    app.run(host = '0.0.0.0', port = args.port, debug = args.debug, use_evalex = False)
