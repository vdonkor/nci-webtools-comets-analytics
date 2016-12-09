import json, linecache, os, requests, smtplib, sys, time
from flask import Flask, json, jsonify, request, Response, send_from_directory
from rpy2.robjects import r as wrapper

app = Flask(__name__)
wrapper.source('./cometsWrapper.R')

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
        result=json.loads(wrapper.checkIntegrity(os.path.join('tmp', filename),request.form['cohortSelection'])[0])
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
            parameters['filename'] = os.path.join('tmp', parameters['filename']+".xlsx")
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
        result = json.loads(wrapper.runModel(json.dumps(parameters))[0])
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
        response = buildFailure({"status": False, "statusMessage":"An unknown error occurred"})
    finally:
        return response
        
@app.route('/cometsRest/templates', methods = ['GET'])
def templates():
    try:
        templates = {}
        if os.path.exists('templates'):
            for templateFile in os.listdir("templates"):
                if templateFile.endswith('.html'):
                    with open(os.path.join('templates', templateFile), 'r') as content_file:
                        content = content_file.read()
                        filename = os.path.splitext(templateFile)[0]
                        templates[filename] = content
        return jsonify(templates)
    except Exception as e:
        exc_type, exc_obj, tb = sys.exc_info()
        f = tb.tb_frame
        lineno = tb.tb_lineno
        filename = f.f_code.co_filename
        linecache.checkcache(filename)
        line = linecache.getline(filename, lineno, f.f_globals)
        print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))

@app.route('/cometsRest/public/cohorts', methods=['GET'])
def cohorts():
    cohorts = {
        'cohorts': json.loads(wrapper.getCohorts()[0])
    }
    response = buildSuccess(cohorts)
    return response

@app.route('/cometsRest/registration/user_metadata', methods=['POST'])
def user_metadata():
    try:
        parameters = json.loads(request.data)
        data = {
            "app_metadata": {
                "comets": "pending"
            },
            "user_metadata" : {
                "affiliation": parameters['affiliation'],
                "cohort": parameters['cohort'],
                "family_name": parameters['family_name'],
                "given_name": parameters['given_name']
            }
        }
        url = "https://ncicbiit.auth0.com/api/v2/users/"+parameters['user_id']
        headers = {
            "Authorization": "Bearer "+app.config['token'],
            "Content-Type": "application/json"
        }
        response = json.loads(requests.patch(url,data=json.dumps(data),headers=headers).text)
        response['comets'] = 'pending'
        user = response['user_metadata']
        name = user['given_name']+" "+user["family_name"]
        email = response['email']
        connection = response['identities'][0]['connection']
        if "facebook" in connection:
            connection = "Facebook"
        elif "google" in connection:
            connection = "Google"
        elif connection == "Username-Password-Authentication":
            connection = "Local"
        composeMail(
            app.config['email.sender'],
            app.config['email.admin'],
            "User "+name+" registered",
            "A new user has registered with the following information.\n\n"+
            "Name: "+name+"\n"+
            "E-Mail: "+email+"\n"+
            "Type: "+connection+"\n"
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
        response = buildFailure({"status": False, "statusMessage":"An unknown error occurred"})
    finally:
        return response

@app.route('/cometsRest/admin/users', methods=['GET'])
def user_list_get():
    try:
        url = "https://ncicbiit.auth0.com/api/v2/users?q=comets%3A%5B*%20TO%20*%5D&fields=app_metadata%2Cemail%2Cfamily_name%2Cgiven_name%2Cidentities.connection%2Cuser_id%2Cuser_metadata&include_fields=true&per_page=100&page="
        headers = {
            "Authorization": "Bearer "+app.config['token'],
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
            url = "https://ncicbiit.auth0.com/api/v2/users/"+parameters['user_id']
            headers = {
                "Authorization": "Bearer "+app.config['token'],
                "Content-Type": "application/json"
            }
            line = json.loads(requests.patch(url,data=json.dumps(data),headers=headers).text)
            line['comets'] = line['app_metadata']['comets']
            if (line['comets'] == 'active'):
                email = line['email']
                composeMail(
                    app.config['email.sender'],
                    email,
                    "Your Comets account has been approved.",
                    "The account you registered with the online COMETS Analytics tool has been moved to active status."
                )
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

if __name__ == '__main__':
    import argparse, yaml
    parser = argparse.ArgumentParser()

    # Default port is 9200
    parser.add_argument('-p', '--port', type = int, dest = 'port', default = 9200, help = 'Sets the Port')
    parser.add_argument('-d', '--debug', action = 'store_true', help = 'Enables debugging')
    def flatten(yaml,parent=None):
        for param in yaml:
            if (isinstance(yaml[param],dict)):
                flatten(yaml[param],param)
            else:
                app.config[(parent+"." if parent else "")+param] = yaml[param]
    with open("restricted/settings.yml", 'r') as f:
        flatten(yaml.safe_load(f))
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
