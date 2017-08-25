import json, linecache, logging, os, smtplib, sys, yaml, zipfile

from boto.s3.connection import S3Connection
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
            print('EXCEPTION IN ({}, LINE {} "{}"): {}'.format(filename, lineno, line.strip(), exc_obj))
            pass
        return False
  
    @defer.inlineCallbacks
    def run(self):
        client = Stomp(StompConfig('tcp://'+config['queue.host']+':'+str(config['queue.port'])))
        yield client.connect()
        headers = { StompSpec.ACK_HEADER: StompSpec.ACK_CLIENT_INDIVIDUAL }
        client.subscribe('/queue/test', headers, listener = SubscriptionListener(self.consume, errorDestination = '/queue/error'))

    def consume(self, client, frame):
        parameters = json.loads(frame.body)
        logger.info('Received frame: %s' % parameters)
        filename = parameters['filename']
        parameters['filename'] = os.path.join('tmp',filename)
        s3conn = S3Connection(config['s3.username'],config['s3.password']).get_bucket(config['s3.bucket'])
        s3conn.get_key('/comets/input/'+filename).get_contents_to_filename(parameters['filename'])
        result = json.loads(wrapper.runAllModels(json.dumps(parameters))[0])
        logger.debug('result contents')
        logger.debug(result)
        sys.stdout.flush();
        content = ""                  
        if (type(result['integrityCheck']) is dict):
            ic = result['integrityCheck']
            content += "  Integrity Check\n"
            if ('warnings' in ic):
                content += "    Warnings:\n"
                warnings = ic['warnings'] if type(ic['warnings']) is list else [ic['warnings']]
                for index in warnings:
                    content += "      * "+warnings[index]+"\n"
            if ('error' in ic):
                content += "    Error: "+ic['error']+"\n"
                if (self.composeMail(config['email.sender'],parameters['email'],"Model data for "+filename[4:],content)):
                    logger.info("Email sent")
                else:
                    logger.info("Email not sent")
                return
        filenameZ = str(result['timestamp'])+'.zip'
        filepath = os.path.join('tmp',filenameZ)
        zipf = zipfile.ZipFile(filepath,'w',zipfile.ZIP_STORED)
        for model in result['models']:
            mod = result['models'][model]
            if (len(content) > 0):
                content += "\n"
            content += "  "+model
            if ('error' in mod):
                content += " - Error"
            else:
                content += " - Complete"
                if (len(mod['ptime']) > 0):
                    content += " ( "+mod['ptime']+" )"
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
        header = "We've finished running your file: "+parameters['originalFilename']+"\n\n"
        if (len(zipf.infolist()) > 0):
            s3key = s3conn.new_key('/comets/results/'+filenameZ);
            s3key.set_contents_from_filename(filepath)
            header += "The results of your batch data run are available through the following link. Any additional information (warnings, errors, etc.) are included below.\n\n"
            header += s3key.generate_url(expires_in=604800)+"\n\n" #604800 = 7d*24h*60m*60s
            header += "The search results will be available for the next 7 days.\n\n"
        else:
            header += "There were no models or all the models resulted in errors, so no data is available. Any additional information (warnings, errors, etc.) are included below.\n\n"
        if (self.composeMail(
                config['email.sender'],
                parameters['email'],
                "Comets Batch Mode Model Results - "+filenameZ,
                "Dear COMETS user,\n\n"+
                header+
                "The following models were run.\n\n"+
                content+"\n\n"+
                "Respectfully,\n\n"+
                "COMETS Web Tool"
            )):
            logger.info("Email sent")
        else:
            logger.info("Email not sent")
        os.remove(filepath)

if __name__ == '__main__':
    def flatten(yaml,parent=None):
        for param in yaml:
            if (isinstance(yaml[param],dict)):
                flatten(yaml[param],param)
            else:
                config[(parent+"." if parent else "")+param] = yaml[param]
    with open("restricted/settings.yml", 'r') as f:
        flatten(yaml.safe_load(f))
    wrapper.source('./process/processWrapper.R')
    logging.basicConfig(level = logging.INFO)
    Consumer().run()
    reactor.run()

