//Einbinden des Hauptmoduls
var device = require('./device.js');

//Einbinden benötigter Node.JS Modules und Erweiterungen
var util = require('util');
var http = require('http');
var os = require('os');
var dgram = require('dgram');
var uuid = require('node-uuid');

//Deklaration des Untermoduls
device.event = (function () {

    //Deklaration der Membervariablen
    var cr = '\r\n', t = '\t',
        service,
        udpconf = { address:'239.255.255.246', port:7900, ttl:4 },
        config,
        multicastEventKey = 0,
        subscriber = {
            'sid' : { callback : '', serviceId : '', host : '', port : '', path : '', seq : 0 }
        };

    //Initialisierung des Moduls
    var init = function (_config){

        config = _config;
    };

    //Funktion zum verarbeiten einer Anfrage
    var getResponse = function (_req, _service){

        service=_service;

        //Unterscheidung nach Ereignisregistrierung / Erneuerung / Abmeldung
        if(_req.method == 'SUBSCRIBE')
            return subscription(_req.headers);

        else if (_req.method == 'UNSUBSCRIBE')
            return cancelSubscription(_req.headers.SID);

        device.log('Invalid Event Request','events');
        return false;
    };

    //Funktion zum verarbeiten einer Ereignisregistrierung / Erneuerung
    var subscription = function (_req){

        var SID;

        //Wenn Parameter Callback vorhanden ist, handelt es sich um eine neue Ereignisregistrierung
        if(_req.callback){

            //Generieren einer neuen SID
            SID = 'uuid:'+uuid.v4();

            //Verwenden der SID als eindeutigen Objektschlüssel
            subscriber[SID] = {};

            //Extrahieren und Speichern der Callback URL aus Parameter Callback
            subscriber[SID].callback = _req.callback;
            var callback = subscriber[SID].callback;

            var urlstartPos = callback.search('<');
            var urlendPos = callback.search('>');
            var url = callback.slice(urlstartPos+1, urlendPos);

            url = url.replace('http://', '');
            var urlPortStartPos = url.search(':');
            var urlPortEndPos = url.search('/');

            //Speichern aller benötigten Daten aus der Anfrage in das subscriber-Objekt
            subscriber[SID].host = url.slice(0,urlPortStartPos);
            subscriber[SID].port = parseInt(url.slice(urlPortStartPos+1, urlPortEndPos));
            subscriber[SID].path = url.slice(urlPortEndPos, url.length);
            subscriber[SID].serviceId = service.serviceId;

            //Senden der Initialen Ereignismeldung
            sendInitialMessage(SID);

        } else SID = _req.SID;

        //Generieren des Headers für die Antwort
        var headers = {
            'Date' : new Date(),
            'Server' : os.type() + ', ' + os.release() + ' UPnP/1.1 UPnP-Device-Host/1.1',
            'SID' : SID,
            'CONTENT-LENGTH': 0,
            'Timeout' : 'Second-300'
         };

        //Rückgabe des Headers
        return headers;
    };

    //Funktion zum Löschen einer Ereignisregistrierung aus deb subscriber-Objekt
    var cancelSubscription = function (SID){

        delete subscriber[SID];
        return true;
    };

    //Funktion zum Senden der initialen Ereignismeldung
    var sendInitialMessage = function (SID){

        //try-catch Block zum Abfangen eines Fehlers bei nicht verfügbarer Funktion
        try {

            //Abrufen aller Statusvariablen eines bestimmten Service und Speichern zurückgegebener Argumente
            var args = eval ('device.'+subscriber[SID].serviceId+'.getEventedArgs();');
        }catch(err){

            device.log('Requested Function not implemented' ,'event');
            return false;
        }

        //Senden der initialen Ereignismeldung mit der aktueller SID und den empfangenen Argumenten (Statusvariablen)
        sendUnicast(SID,args);
        return true;
    };

    //Funktion zum Senden einer Unicast Ereignismeldung über HTTP
    var sendUnicast = function (SID, args){

        //Generieren des HTTP Body für die Antwort
        var body = buildBody (args);

        //Erzeugen der Konfigurationsparameter für den Versand der Ereignismeldung
        var options = {
            method : 'NOTIFY',
            host : subscriber[SID].host,
            port : subscriber[SID].port,
            path : subscriber[SID].path,
            agent : false,
            headers : {
                'CONTENT-TYPE' : 'text/xml; charset="utf-8"',
                'NT' : 'upnp-event',
                'NTS': 'upnp:propchange',
                'SID' : SID,
                'SEQ' : getEventKey(SID),
                'CONTENT-LENGTH': body.length
            }
        };

        //Senden des Headers der Ereignismeldung über die Node.JS Funktion http.request()
        var req = http.request(options);

        //Senden des HTTP Body über die Funktion req.end()
        req.end(body);
        return true;
    };

    //Funktion zum Senden einer Multicast Ereignismeldung über HTTP-MU
    var sendMulticast = function (_service, _lvl, _args){

        //Generieren des HTTP Body
        var body = buildBody (_args);

        //Generieren des Headers als String für den UDP Versand
        var header =
            'NOTIFY * HTTP/1.1'
            +cr+'HOST:' + udpconf.address+':'+udpconf.port
            +cr+'CONTENT-LENGTH: '+body.length
            +cr+'CONTENT-TYPE: text/xml; charset="utf-8"'
            +cr+'USN: '+config.UDN+'::'+ _service.serviceType
            +cr+'SVCIP: '+_service
            +cr+'NT: upnp-event'
            +cr+'NTS: upnp:propchange'
            +cr+'SEQ: '+ multicastEventKey
            +cr+'LVL: '+ _lvl
            +cr;

        //Erstellen eines UDP Sockets
        var udpSock = dgram.createSocket("udp4");

        //Umwandeln des Header + Body Strings in einen Buffer für den Versand über UDP
        var msg = new Buffer(header+body);

        //Binden des UDP Sockets an die Multicast IP Adresse
        udpSock.bind(udpconf.port);

        //Setzen des Time-To-Live Werts
        udpSock.setTTL(udpconf.ttl);

        //Senden der Ereignismeldung
        udpSock.send(msg, 0, msg.length, udpconf.port, udpconf.host, function (err, bytes) {
            device.log('EVENT Multicast Message to '+udpconf.host+':'+udpconf.port +cr + msg,'event');

            //Erhöhen des Multicast Ereignisschlüssels
            multicastEventKey++;

            //Schlißen des Sockets
            udpSock.close();
            return true;
        });
    };

    //Funktion zum Generieren des HTTP Body
    var buildBody = function (args){

        //Generieren des XML Strings
         var body =
            '<?xml version="1.0"?>'
            +cr+'<e:propertyset xmlns:e="urn:schemas-upnp-org:event-1-0">';

            //Alle Argumente (Statusvariablen) in die XML Struktur einarbeiten
            Object.getOwnPropertyNames(args).forEach(function(key) {
                body +=cr+t+'<e:property>'
                    +cr+t+t+'<' + key + '>' + args[key] + '</' + key +'>'
                    +cr+t+'</e:property>';

            });
            body +=cr+'</e:propertyset>'+cr;

         //Rückgabe des HTTP Body
         return body;
    };

    //Funktion zum Generieren des Ereignisschlüssels
    var getEventKey = function (SID){

        //Prüfen ob bereits ein Ereignisschlüssel existiert
        if (! ('seq' in subscriber[SID])){
            subscriber[SID].seq = 0;
            return subscriber[SID].seq;
        }

        //Ereignisschlüssel ab vorgeschriebenem Wert bei 1 beginnen
        if (subscriber[SID].seq == 4294967295){
            subscriber[SID].seq = 1;
            return subscriber[SID].seq;
        }

        //Erhöhen und Rückgabe des Ereignisschlüssels
        return ++subscriber[SID].seq;
    };
	
	//Rückgabe aller Abonnenten eines Ereignisses
	var getSubscribers = function(){
        return subscriber;
	};

    //Rückgabe von öffentlich zugänglichen Variablen und Funktionen
    return {
        init:init,
        getResponse:getResponse,
		getSubscribers:getSubscribers,
        sendMulticast:sendMulticast,
        sendUnicast:sendUnicast
    };
})();