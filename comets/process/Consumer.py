
from twisted.internet import defer, reactor
from stompest.config import StompConfig
from stompest.async import Stomp
from stompest.async.listener import SubscriptionListener

class Consumer(object):
  
    @defer.inlineCallbacks
    def run(self):
        client = Stomp(StompConfig('tcp://activemq:61613')).connect()
        headers = { StompSpec.ACK_HEADER: StompSpec.ACK_CLIENT_INDIVIDUAL }
        client.subscribe('/queue/test', headers, listener = SubscriptionListener(self.consume, errorDestination = '/queue/error'))

    def consume(self, client, frame):
        print('Received frame: %s' % frame.body)

if __name__ == '__main__':
    Consumer().run()
    reactor.run()

