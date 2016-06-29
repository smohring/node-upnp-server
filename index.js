//Einbinden der Module des Frameworks
require('./jscore/device.js');
require('./jscore/device.ssdp.js');
require('./jscore/device.control.js');
require('./jscore/device.event.js');
require('./jscore/device.httpSrv.js');

//Einbinden der implementierten Services
require('./devices/mediaServer1/services/ConnectionManager.js');
require('./devices/mediaServer1/services/ContentDirectory.js');

//Initialisierung des Frameworks mit Basis-Pfad, UPnP Device- und Service Descriptions
device.init({ baseDir : './devices/mediaServer1/',
              deviceDesc : 'MediaServer.xml',
              serviceDesc : ['ConnectionManager.xml' , 'ContentDirectory.xml']
            });
