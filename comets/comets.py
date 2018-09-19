from traceback import format_exc
import os
import requests
import smtplib
import time
import yaml
import boto3
from pyper import R
from flask import Flask, json, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from stompest.config import StompConfig
from stompest.sync import Stomp

app = Flask(__name__)


@app.errorhandler(Exception)
def error_handler(e):
    '''Ensures that uncaught errors are logged and returned as json'''
    app.logger.error(format_exc())
    return jsonify(str(e)), 500


def debug(host='0.0.0.0', port=8000):
    '''Starts the flask server in debug mode on port 8000'''

    @app.route('/', strict_slashes=False)
    @app.route('/<path:path>', strict_slashes=False)
    def static_files(path):
        if path.endswith('/') or '.' not in path:
            path += 'index.html'
        return send_from_directory(os.getcwd(), path)

    app.run(host, port, debug=True)


def init():
    '''Performs initial setup for the application.'''

    with open('restricted/settings.yml', 'r') as f:
        app.config.update(yaml.safe_load(f))

    r = R()
    r('source("cometsWrapper.R")')
    app.config['cohorts'] = r['get_comets_cohorts()']
    app.config['excel_templates'] = r['get_comets_templates()']

    temp_dir = 'tmp'
    if not os.path.isdir(temp_dir):
        os.makedirs(temp_dir)
    app.config['temp_dir'] = temp_dir


init()


def stream_json(data):
    '''A json generator'''
    for chunk in json.JSONEncoder().iterencode(data):
        yield chunk


def send_email(sender, recipients, subject, contents):
    '''Sends an email using smtp_ssl

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
    message = '\n'.join(
        'From: ' + sender,
        'To: ' + recipients,
        'Subject: ' + subject,
        contents
    )
    smtp.sendmail(sender, recipients, message)
    smtp.quit()


def upload_file_s3(filepath, bucket_prefix='/comets/'):
    '''Uploads a file to Amazon S3

    Parameters
    ----------
    filepath - Path to the file to upload
    bucket_prefix - Prefix for the file's bucket key
    '''

    config = app.config['s3']
    filename = os.path.split(filepath)[1]
    bucket_key = bucket_prefix + filename

    boto3.resource(
        's3',
        aws_access_key_id=config['username'],
        aws_secret_access_key=config['password']
    ).Bucket(
        name=config['bucket']
    ).upload_file(
        bucket_key,
        filepath
    )


def queue_correlation_job(parameters, queue_name='/queue/Comets'):
    '''Queues a batch correlation job

    Parameters
    ----------
    parameters - A list containing the path to the s3 input file, as well as \
                 the models to run

    queue_name - The name of the queue to submit this job to
    '''
    config = app.config['queue']
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


def save_uploaded_file(uploaded_file, prefix='input'):
    '''Saves an uploaded file to the temp folder and returns its filepath

    Parameters
    ----------
    uploaded_file - The uploaded file from Flask

    prefix - A file prefix for the uploaded file
    '''

    temp_dir = app.config['temp_dir']
    filename = '_'.join(
        prefix,
        time.strftime('%Y_%m_%d_%I_%M'),
        secure_filename(uploaded_file.filename)
    )
    filepath = os.path.join(temp_dir, filename)
    uploaded_file.save(filepath)
    return filepath


@app.route('/api/ping', methods=['GET'])
@app.route('/cometsRest/public/ping', methods=['GET'])
def ping():
    '''Returns a response if this service is running'''
    return jsonify({'pong': 1})


@app.route('/api/cohorts', methods=['GET'])
def get_cohorts():
    '''Returns all cohorts'''
    return jsonify(app.config['cohorts'])


@app.route('/api/excel_templates', methods=['GET'])
def get_excel_templates():
    '''Returns excel template parameters used to generate input files'''
    return jsonify(app.config['excel_templates'])


@app.route('/api/read_input', methods=['POST'])
def check_integrity():
    '''Checks the integrity of an input file and returns the processed input'''

    filepath = save_uploaded_file(request.files['inputFile'])

    r = R()
    r.filepath = filepath
    r('source("cometsWrapper.R")')
    output = r['read_comets_input(filepath)']

    if 'error' in output:
        raise(output['error'])

    return jsonify(output)


@app.route('/api/correlate_batch', methods=['POST'])
def correlate_batch():
    '''Queues a batch correlation job'''

    model_parameters = json.loads(request.form.json)
    filepath = model_parameters['input_filepath']

    upload_file_s3(filepath, '/comets/input/')
    queue_correlation_job(model_parameters, queue_name='/queue/Comets')
    return jsonify(True)


@app.route('/api/correlate', methods=['POST'])
def correlate():
    '''Runs a correlation given a user-defined model'''

    parameters = json.loads(request.form.json)

    r = R()
    r('source("cometsWrapper.R")')
    r.parameters = json.dumps(parameters)
    output = r['run_comets_correlation(parameters)']
    return jsonify(output)


@app.route('/api/create_input', methods=['POST'])
def create_input():
    '''Creates a COMETS input file given csv files, a variable map, and a
    template name

    Returns the path to the output file
    '''

    output_file = 'comets_input_%s.xlsx' % time.strftime('%Y_%m_%d_%I_%M')
    output_filepath = os.path.join(app.config['temp_dir'], output_file)

    r = R()
    r.comets_wrapper_path = './cometsWrapper.R'

    r.template = request.form.template
    r.varmap = request.form.varmap
    r.output_filepath = output_filepath
    r.abundances_filepath = save_uploaded_file(request.files['abundances_file'])
    r.metabolites_filepath = save_uploaded_file(request.files['metabolites_file'])
    r.subjects_filepath = save_uploaded_file(request.files['subjects_file'])

    output = r['''create_comets_input(
            template = template,
            varmap = varmap,
            outputfile = output_filepath,
            filenames = list(
                abundancesfile = abundances_filepath
                metabfile = metabolites_filepath
                subjfile = subjects_filepath
            ))''']

    return jsonify(output)


@app.route('/admin/users', methods=['POST'])
def create_user():
    '''Registers a new comets user and notifies administrators'''

    config = app.config['auth0']

    parameters = request.json
    data = {
        'app_metadata': {
            'comets': 'active'
        },
        'user_metadata': {
            'affiliation': parameters['affiliation'],
            'cohort': parameters['cohort'],
            'family_name': parameters['family_name'],
            'given_name': parameters['given_name']
        }
    }

    headers = {'Authorization': 'Bearer ' + config['token']}

    url = 'https://%s.auth0.com/api/v2/user/%s' % (
        config['domain'],
        config['user_id']
    )

    response = requests.patch(url, json=data, headers=headers).json()

    response['comets'] = 'active'
    user = response['user_metadata']
    email = response['email']

    email_config = app.config['email']
    send_email(
        email_config['sender'],
        email_config['admin'],
        '\n'.join(
            'Comets User Registration',
            'Dear Comets Admins, \n',
            'This email is to let you know a user has registered on the ' +
            'COMETS Analytics web site and entered the following information.',
            'Email Address: ' + email,
            'Last Name: ' + user['family_name'],
            'First Name: ' + user['given_name'],
            'Affiliation: ' + user['affiliation'],
            'Cohort: ' + user['cohort'],
            '\nSincerely,',
            'Sent from the Comets Analytics Web Tool',
        )
    )
    return jsonify(response)


@app.route('/admin/users', methods=['GET'])
def get_users():
    '''Retrieves all comets users'''

    config = app.config['auth0']
    page = 0
    users = []
    total_users = 1  # placeholder value to begin paginating results

    # retrieve 1000 users at a time
    while len(users) < total_users:
        response = requests.get(
            'https://%s.auth0.com/api/v2/users' % config['domain'],
            headers={'Authorization': 'Bearer ' + config['token']},
            params={
                'search_engine': 'v3',
                'include_totals': 'true',
                'page': page,
                'per_page': 1000,
            }
        ).json()
        total_users = response['total']
        users += response['users']
        page += 1

    return jsonify(users)


@app.route('/admin/users', methods=['PATCH'])
def update_users():
    '''Updates a list of comets users'''

    config = app.config['auth0']

    # for each user record provided, make a PATCH request for that user
    # and return the result for each request
    records = request.json()
    responses = map(lambda record: requests.patch(
        'https://%s.auth0.com/api/v2/users' % config['domain'],
        headers={'Authorization': 'Bearer ' + config['token']},
        json=record
    ).json(), records)

    return jsonify(responses)


# Launch in debug mode if this script is being run by the python interpreter
if __name__ == '__main__':
    debug()
