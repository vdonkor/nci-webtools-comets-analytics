from traceback import format_exc
import json, linecache, os, requests, smtplib, sys, time, yaml
import boto3
from pyper import R
from flask import Flask, json, jsonify, request, Response, send_from_directory
from stompest.config import StompConfig
from stompest.sync import Stomp

app = Flask(__name__)

@app.errorhandler(Exception)
def error_handler(e):
    app.logger.error(format_exc())
    return jsonify(str(e)), 500

"""
def init():
    '''Performs initial setup for the application'''

    with open('restricted/settings.yml', 'r') as f:
        app.config = yaml.safe_load(f)

    r = R()
    r('source("./cometsWrapper.R")')
    app.config['excel_templates'] = json.loads(r['getTemplates()'])
    app.config['cohorts'] = json.loads(r['getCohorts()'])

def stream_json(data):
    for chunk in json.JSONEncoder().iterencode(data):
        yield chunk

def send_email(sender, recipients, subject, contents):
    '''Sends an email

    Parameters
    ----------
    sender - The sender of the email
    recipients - A comma-separated string of recipients
    subject - The email's subject
    contents - A utf-8 string containing the email's contents
    '''
    config = app.config['email']
    smtp = smtplib.SMTP_SSL(config['host'], config['port'])
    smtp.login(config['username'], config['password'])
    message = '\n'.join([
        'From: ' + sender,
        'To: ' + recipients,
        'Subject: ' + subject,
        contents
    ])
    smtp.sendmail(sender, recipients, message)
    smtp.quit()

def upload_file_s3(filepath, bucket_prefix='/comets/input/'):
    config = app.config['s3']

    s3 = boto3.client(
        's3',
        aws_access_key_id=config['username'],
        aws_secret_access_key=config['password']
    )

    filename = os.path.split(filepath)[1]
    bucket_key = bucket_prefix + filename

    s3.object(config['bucket'], bucket_key).put(
        Body=open(filepath, 'rb')
    )

def queue_file(parameters):
    config = app.config['queue']
    queue_name = '/queue/Comets'
    queue_input = json.dumps(parameters)

    client = Stomp(
        StompConfig('tcp://%s:%s' % (config['host'], config['port']))
    )
    client.connect()
    client.send(
        queue_name,
        queue_input,
        {'correlation-id': parameters['filename']}
    )
    client.disconnect()

# heartbeat monitor
@app.route('/cometsRest/public/ping', methods = ['GET'])
def ping():
    return jsonify({'pong':1})


@app.route('/check_integrity', methods=['POST'])
def check_integrity():
    input_file = request.files['inputFile']
    input_file.save(os.path.join('tmp'))


# takes excel workbook as input
@app.route('/cometsRest/integrityCheck', methods = ['POST'])
def integrityCheck():
    try:
        userFile = request.files['inputFile']
        if not os.path.exists('tmp'):
            os.makedirs('tmp')
        name, ext = os.path.splitext(userFile.filename)
        filename = "Input_"+name+"_"+ time.strftime("%Y_%m_%d_%I_%M") + ext.lower()
        filepath = os.path.join('tmp', filename)
        saveFile = userFile.save(os.path.join('tmp', filename))
        rds_filepath = filepath + '.rds'

        if os.path.isfile(os.path.join('tmp', filename)):
            print("Successfully Uploaded")
        r = pr.R()
        r('source("./cometsWrapper.R")')
        r.assign('filename',os.path.join('tmp',filename))
        r.assign('cohort',request.form['cohortSelection'])
        r('checkIntegrity = checkIntegrity(filename,cohort)')
        r('saveRDS(checkIntegrity, file="%s")' % rds_filepath)
        returnFile = r['checkIntegrity']
        del r
        with open(returnFile) as file:
            result = json.loads(file.read())
        os.remove(returnFile)
        os.remove(filepath)
        if ("error" in result):
            response = buildFailure(result['error'])
        else:
            result['saveValue']['filename'] = os.path.splitext(filename)[0]
            result['saveValue']['originalFilename'] = name+ext
            result['saveValue']['rdsFilename'] = rds_filepath
            response = buildSuccess(result['saveValue'])
    except Exception:
        app.logger.error(format_exc())
        response = buildFailure({"status": False, "integritymessage":"An unknown error occurred"})
    finally:
        return response

# takes previously uploaded file and
@app.route('/cometsRest/correlate', methods = ['POST'])
def correlate():
    try:
        userFile = request.files['inputFile']
        if not os.path.exists('tmp'):
            os.makedirs('tmp')
        name, ext = os.path.splitext(userFile.filename)
        filename = "Input_"+name+"_"+ time.strftime("%Y_%m_%d_%I_%M") + ext.lower()
        filepath = os.path.join('tmp', filename)
        saveFile = userFile.save(os.path.join('tmp', filename))

        parameters = dict(request.form)
        for field in parameters:
            parameters[field] = parameters[field][0]
        parameters['filename'] = filename

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
            os.remove(filepath)
            response = buildFailure({'status': 'info', 'statusMessage': "The results will be emailed to you."})
        else:
            if ('filename' in parameters):
                parameters['filename'] = os.path.join('tmp', parameters['filename'])
            r = pr.R()
            r('source("./cometsWrapper.R")')
            r.assign('parameters',json.dumps(parameters))
            r('correlate = runModel(parameters)')
            returnFile = r['correlate']
            os.remove(filepath)
            del r
            with open(returnFile) as file:
                result = json.loads(file.read())
            os.remove(returnFile)
            if ("error" in result):
                response = buildFailure(result['error'])
            else:
                if ('warnings' in result):
                    result['saveValue']['warnings'] = result['warnings']
                response = buildSuccess(result['saveValue'])

    except Exception:
        app.logger.error(format_exc())
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
        r.assign('parameters', json.dumps(parameters))
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
            return jsonify(result['error']), 500
        else:
            return jsonify(result['saveValue'])
    except Exception:
        app.logger.error(format_exc())
        return jsonify({"status": False, "statusMessage":"An unknown error has occurred."}), 500

@app.route('/cometsRest/templates', methods = ['GET'])
def templates():
    return jsonify(app.config["htmlTemplates"])

@app.route('/cometsRest/excelTemplates', methods=['GET'])
def excelTemplates():
    return jsonify(app.config["excelTemplates"])

@app.route('/cometsRest/public/cohorts', methods=['GET'])
def cohorts():
    return jsonify(app.config['cohortList'])

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
        return jsonify(response)
    except Exception:
        app.logger.error(format_exc())
        return jsonify({"status": False, "statusMessage":"An unknown error has occurred."}), 500

@app.route('/cometsRest/admin/users', methods=['GET'])
def user_list_get():
    try:
        url = "https://"+app.config['auth0.domain']+".auth0.com/api/v2/users?q=comets%3A*%20TO%20*&fields=app_metadata%2Cemail%2Cfamily_name%2Cgiven_name%2Cidentities.connection%2Cuser_id%2Cuser_metadata&include_fields=true&per_page=100&page="
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
        return buildSuccess({"user_list":response})
    except Exception:
        app.logger.error(format_exc())
        return jsonify({"status": False, "statusMessage":"An unknown error occurred"}), 500

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
            line = json.loads(requests.patch(url, data=json.dumps(data), headers=headers).text)
            line['comets'] = line['app_metadata']['comets']
            response.append(line)

        return jsonify({'user_list': response})
    except Exception:
        app.logger.error(format_exc())
        return jsonify({"status": False, "statusMessage":"An unknown error occurred"}), 500

init()
"""
if __name__ == '__main__':
    # If this script is being run by the python interpreter
    # then serve this application using debug mode on port 8000

    @app.route('/', strict_slashes=False)
    @app.route('/<path:path>', strict_slashes=False)
    def static_files(path):
        if path.endswith('/') or '.' not in path:
            path += 'index.html'
        return send_from_directory(os.getcwd(), path)

    app.run(host = '0.0.0.0', port = 8000, debug = True)
