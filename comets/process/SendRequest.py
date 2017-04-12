from stompest.config import StompConfig
from stompest.sync import Stomp

client = Stomp(StompConfig('tcp://activemq:61613'))
client.connect()
client.send('/queue/test', 'request sent')
client.disconnect()

