import json, linecache, logging, os, smtplib, sys, yaml, zipfile
import boto3
from boto.s3.connection import S3Connection
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from rpy2.robjects import r as wrapper
from stompest.config import StompConfig
from stompest.async import Stomp
from stompest.async.listener import SubscriptionListener
from stompest.protocol import StompSpec
from twisted.internet import defer, reactor

config = {}
logger = logging.getLogger("comets_processor")

class Consumer(object):

    def timestamp(self):
        return datetime.now().strftime("%Y-%m-%d %T")

    def composeMail(self,sender,recipients,subject,message,files=[]):
        try:
            if not isinstance(recipients,list):
                recipients = [recipients]
            packet = MIMEMultipart()
            packet['Subject'] = subject
            packet['From'] = sender
            packet['To'] = ", ".join(recipients)
            packet.attach(MIMEText(message))
            for file in files:
                with open(file,"rb") as openfile:
                    packet.attach(MIMEApplication(
                        openfile.read(),
                        Content_Disposition='attachment; filename="%s"' % os.path.basename(file),
                        Name=os.path.basename(file)
                    ))
            if (config['email.auth']):
                smtp = smtplib.SMTP_SSL(config['email.host'], config['email.port'])
                smtp.login(config['email.username'], config['email.password'])
            else:
                smtp = smtplib.SMTP(config['email.host'], config['email.port'])
            smtp.sendmail(sender,recipients,packet.as_string())
            smtp.quit()
            return True
        except Exception as e:
            exc_type, exc_obj, tb = sys.exc_info()
            f = tb.tb_frame
            lineno = tb.tb_lineno
            filename = f.f_code.co_filename
            linecache.checkcache(filename)
            line = linecache.getline(filename, lineno, f.f_globals)
            logger.info('[{}] EXCEPTION IN ({}, LINE {} "{}"): {}'.format(self.timestamp(), filename, lineno, line.strip(), exc_obj))
            pass
        return False

    @defer.inlineCallbacks
    def run(self):
        client = Stomp(StompConfig('tcp://'+config['queue.host']+':'+str(config['queue.port'])+'?startupMaxReconnectAttempts=-1,initialReconnectDelay=1000,maxReconnectAttempts=-1'))
        yield client.connect()
        headers = { StompSpec.ACK_HEADER: StompSpec.ACK_CLIENT_INDIVIDUAL }
        client.subscribe('/queue/Comets', headers, listener = SubscriptionListener(self.consume, errorDestination = '/queue/error'))

    def consume(self, client, frame):
        try:
            parameters = json.loads(frame.body)
            filename = parameters['filename']

            bucket = config['s3.bucket']
            username = config['s3.username']
            password = config['s3.password']
            input_folder = config['s3.input_folder'] or '/comets/input/'
            output_folder = config['s3.output_folder'] or '/comets/results/'

            logger.info('--------------------------------------------------------------------------------')

            logger.info('[%s] Received frame: %s' % (self.timestamp(), parameters))
            logger.info('[%s] Original filename: %s' % (self.timestamp(), parameters['originalFilename']))
            logger.info('[%s] Fetching input file from S3: %s' % (self.timestamp(), input_folder+filename))
            parameters['filename'] = os.path.join('tmp',filename)

            if username and password:
                s3 = boto3.resource('s3', aws_access_key_id=username, aws_secret_access_key=password)
            else:
                s3 = boto3.resource('s3')

            s3.meta.client.download_file(bucket, input_folder+filename, parameters['filename'])
            logger.info('[%s] Load data input file: %s' % (self.timestamp(), filename))

            # s3conn.delete_key(input_folder+filename)
            s3.meta.client.delete_object(Bucket=bucket, Key=input_folder+filename)
            logger.info('[%s] Delete input file from s3 bucket: %s' % (self.timestamp(), filename))

            result = json.loads(wrapper.runAllModels(json.dumps(parameters))[0])
            logger.debug('[%s] result contents' % self.timestamp())

            logger.info('[%s] Delete input file after running models: %s' % (self.timestamp(), filename))
            os.remove(parameters['filename'])

            logger.debug(result)
            sys.stdout.flush()

            content = ""
            integrityFile = None
            if (type(result['integrityCheck']) is dict):
                ic = result['integrityCheck']
                content += "  Integrity Check\n"
                if ('warnings' in ic):
                    content += "    Warnings:\n"
                    warnings = ic['warnings'] if type(ic['warnings']) is list else [ic['warnings']]
                    for warning in warnings:
                        content += "      * "+warning+"\n"
                if ('error' in ic):
                    content += "    Error: "+ic['error']+"\n"
                    if (self.composeMail(config['email.sender'],parameters['email'],"Model data for "+filename[4:],content)):
                        logger.info("[%s] Email sent" % self.timestamp())
                    else:
                        logger.info("[%s] Email not sent"  % self.timestamp())
                    return
                if ('csv' in ic):
                    integrityFile = ic['csv']
            filenameZ = "Result_"+parameters['originalFilename'][:-5]+"_"+datetime.fromtimestamp(result['timestamp']).strftime("%Y_%m_%d_%I_%M")+'.zip'
            filepath = os.path.join('tmp',filenameZ)
            zipf = zipfile.ZipFile(filepath,'w',zipfile.ZIP_STORED)
            if (integrityFile):
                zipf.write(integrityFile,os.path.basename(integrityFile))
                os.remove(integrityFile)
            if 'inputs' in result:
                zipf.write(result['inputs'],os.path.basename(result['inputs']))
                os.remove(result['inputs'])
            if 'descrcsv' in result:
                zipf.write(result['descrcsv'],os.path.basename(result['descrcsv']))
                os.remove(result['descrcsv'])
            ptime = 0
            for mod in result['models']:
                model = mod['modelName']
                content += "\n  "+model
                if ('error' in mod):
                    content += " - Error"
                else:
                    content += " - Complete"
                    if ('ptime' in mod):
                        if (len(mod['ptime']) > 0):
                            try:
                                ptime += float(mod['ptime'][17:-4])
                                content += " ( "+mod['ptime']+" )"
                            except ValueError as e:
                                pass
                        del mod['ptime']
                content += "\n"
                if ('saveValue' in mod):
                    filename = mod['saveValue']
                    if (os.path.isfile(filename)):
                        zipf.write(filename,os.path.basename(filename))
                    os.remove(filename)
                    del mod['saveValue']
                if (len(mod) > 0):
                    if ('warnings' in mod):
                        content += "    Warnings:\n"
                        warnings = mod['warnings'] if type(mod['warnings']) is list else [mod['warnings']]
                        for warning in warnings:
                            content += "      * "+warning+"\n"
                    if ('error' in mod):
                        content += "    Error: "+mod['error']+"\n"
            zipf.close()
            header = "We've finished running your file: "+os.path.splitext(parameters['originalFilename'])[0]+"\n\n"
            if (len(zipf.infolist()) > 0):
                bucket_key = output_folder+filenameZ
                s3.meta.client.upload_file(filepath, bucket, bucket_key)

                # s3key = s3conn.new_key(output_folder+filenameZ);
                # s3key.set_contents_from_filename(filepath)
                header += "The results of your batch data run are available through the following link. Any additional information (warnings, errors, etc.) are included below.\n\n"
                header += s3.meta.client.generate_presigned_url(
                    ClientMethod='get_object',
                    Params={'Bucket': bucket, 'Key': bucket_key},
                    ExpiresIn=604800
                )

                # header += s3key.generate_url(expires_in=604800)+"\n\n" #604800 = 7d*24h*60m*60s
                header += "\n\nThe search results will be available for the next 7 days.\n\n"
            else:
                header += "There were no models or all the models resulted in errors, so no data is available. Any additional information (warnings, errors, etc.) are included below.\n\n"
            if (self.composeMail(
                    config['email.sender'],
                    parameters['email'],
                    "Comets Batch Mode Model Results - "+filenameZ,
                    "Dear COMETS user,\n\n"+
                    header+
                    "The following models were run and took a total processing time of "+format(ptime,".4g")+" sec.\n"+
                    content+"\n\n"+
                    "Respectfully,\n\n"+
                    "COMETS Web Tool"
                )):
                logger.info("[%s] Email sent" % self.timestamp())
            else:
                logger.info("[%s] Email not sent" % self.timestamp())
            os.remove(filepath)
        except Exception as e:
            exc_type, exc_obj, tb = sys.exc_info()
            f = tb.tb_frame
            lineno = tb.tb_lineno
            filename = f.f_code.co_filename
            linecache.checkcache(filename)
            line = linecache.getline(filename, lineno, f.f_globals)
            logger.info('EXCEPTION IN ([{}] {}, LINE {} "{}"): {}'.format(self.timestamp(), filename, lineno, line.strip(), exc_obj))
            if (self.composeMail(
                    config['email.sender'],
                    parameters['email'],
                    "Comets Batch Mode Model Results - error",
                    "Dear COMETS user,\n\n"+
                    "This job failed to be processed due to an internal error. Please contact the COMETS Web Tool team for assistance in resolving the issue.\n\n"+
                    "Respectfully,\n\n"+
                    "COMETS Web Tool"
                )):
                logger.info("[%s] Failure email sent." % self.timestamp())

if __name__ == '__main__':
    import argparse

    def flatten(yaml,parent=None):
        for param in yaml:
            if (isinstance(yaml[param],dict)):
                flatten(yaml[param],param)
            else:
                config[(parent+"." if parent else "")+param] = yaml[param]
    with open("restricted/settings.yml", 'r') as f:
        flatten(yaml.safe_load(f))
    wrapper.source('./process/processWrapper.R')

    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--log-folder',
        type=str,
        default='/deploy/logs/',
        dest='log_folder',
        help='path to the processor logs folder',
    )

    args = parser.parse_args()
    log_filename = 'comets_processor.log'
    log_filepath = os.path.join(args.log_folder, log_filename)

    logging.basicConfig(level=logging.INFO)

    logger.addHandler(
        logging.handlers.TimedRotatingFileHandler(log_filepath, 'midnight')
    )
    logger.info('[%s] Started COMETS processor' % datetime.now().strftime("%Y-%m-%d %T"))

    Consumer().run()
    reactor.run()
