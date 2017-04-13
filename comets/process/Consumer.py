import json, linecache, logging, os, smtplib, sys, yaml, zipfile

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
        client = Stomp(StompConfig('tcp://activemq:61613'))
        yield client.connect()
        headers = { StompSpec.ACK_HEADER: StompSpec.ACK_CLIENT_INDIVIDUAL }
        client.subscribe('/queue/test', headers, listener = SubscriptionListener(self.consume, errorDestination = '/queue/error'))

    def consume(self, client, frame):
        parameters = json.loads(frame.body)
        print('')
        print('')
        print('Received frame: %s' % parameters)
        print('')
        result = json.loads(wrapper.runAllModels(json.dumps(parameters))[0])
        filepath = os.path.join('..','tmp',str(result['timestamp'])+'.zip')
        zipf = zipfile.ZipFile(filepath,'w',zipfile.ZIP_STORED)
        content = ""
        if (result['integrityCheck'] is dict):
            ic = result['integrityCheck']
            content += "Integrity Check\n"
            if ('warnings' in ic):
                content += "  Warnings:\n"
                warnings = ic['warnings'] if type(ic['warnings']) is list else [ic['warnings']]
                for index in warnings:
                    content += "    * "+warnings[index]+"\n"
            if ('error' in mod):
                content += "  Error: "+ic['error']+"\n"
        for model in result['models']:
            mod = result['models'][model]
            if (len(content) > 0):
                content += "\n"
            if ('saveValue' in mod):
                filename = mod['saveValue']
                if (os.path.isfile(filename)):
                    zipf.write(filename,os.path.basename(filename))
                os.remove(filename)
                del mod['saveValue']
            if (len(mod) > 0):
                content += model+"\n"
                if ('warnings' in mod):
                    content += "  Warnings:\n"
                    warnings = mod['warnings'] if type(mod['warnings']) is list else [mod['warnings']]
                    for warning in warnings:
                        content += "    * "+warning+"\n"
                if ('error' in mod):
                    content += "  Error: "+mod['error']+"\n"
        zipf.close()
        if (self.composeMail(config['email.sender'],parameters['email'],"Model data for "+parameters['filename'][4:],content,[filepath])):
            print("Email sent")
        else:
            print("Email not sent")
        print('')
        print('')

if __name__ == '__main__':
    def flatten(yaml,parent=None):
        for param in yaml:
            if (isinstance(yaml[param],dict)):
                flatten(yaml[param],param)
            else:
                config[(parent+"." if parent else "")+param] = yaml[param]
    with open("../restricted/settings.yml", 'r') as f:
        flatten(yaml.safe_load(f))
    wrapper.source('./cometsWrapper.R')
    logging.basicConfig(level = logging.DEBUG)
    Consumer().run()
    reactor.run()

