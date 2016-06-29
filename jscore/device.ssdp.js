//Einbinden des Hauptmoduls
var device = require('./device.js');

//Einbinden benötigter Node.JS Modules und Erweiterungen
var dgram = require('dgram');
var fs = require('fs');
var os = require('os');

//Deklaration des Untermoduls
device.ssdp = (function () {

    //Deklaration der Membervariablen
    var cr = '\r\n',
        ssdp = {
            address:'239.255.255.250',
            port:1900,
            timeout:1800,
            ttl:4,
            interval : 90000
        },
        searchTypes = [],
        config = {};

    //Initialisierung des Moduls
    var init = function(_searchTypes, _config){

        searchTypes = _searchTypes;
        config = _config;

        //Senden der Nachrichten zur Bekanntgabe des UPnP Geräts und Services
        ssdpAnnounce();

        //Starten des UDP Sockets um auf Suchanfragen zu Antworten
        ssdpResponse();
    };

    //Funktion zum Bekanntgeben der Verfügbarkeit nach Start des UPnP Geräts
    var ssdpAnnounce = function () {

       //Senden einer NOTIFY-Nachricht für jeden implementierten Such-Typ
       var announce = function(){
            for (var x=0; x < searchTypes.length; x++)
                ssdpSendMsg(ssdpBuildHeader('notify',searchTypes[x]), ssdp.address, ssdp.port);
       };

       //Einmalige Bekanntgabe aller implementierten Such-Typen
       announce();

       //Bekanntgabe aller implementierten Such-Typen in regelmäßigem Intervall
       setInterval(announce, ssdp.interval);
    };

    //Funktion zum Senden einer Antwort auf Suchanfragen
    var ssdpResponse = function () {

        //Erstellen eines UDP-Sockets
        var udpSock = dgram.createSocket("udp4");

        //Abhören des UPD Sockets auf eingehende Nachrichten
        udpSock.on("message", function (msg, sender) {

            device.log('SSDP Message from '+sender.address+':'+sender.port +cr +msg, 'ssdp');

            //Die empfangene Nachricht auf Parameter ST prüfen und Empfänger auslesen
            var ssdpRecipients = ssdpGetRecipients(msg.toString());

            //Generieren eines Headers und Senden einer Nachricht für jeden implementierten Such-Typ
            if(ssdpRecipients){
                for (var x=0; x < ssdpRecipients.length; x++)
                    ssdpSendMsg(ssdpBuildHeader('response' ,ssdpRecipients[x]), sender.address, sender.port);

            } else device.log('No SSDP ST match','ssdp');
        });

        //Überprüfen ob der UDP Socket abgehört wird
        udpSock.on("listening", function () {

            var address = udpSock.address();
            device.log('SSDP Service listening on ' + address.address + ":" + address.port, 'ssdp');
        });

        //Senden der bye-bye Nachricht beim Schließen des UDP Sockets
        udpSock.on("close",function (err){

            device.log('Sending bye-bye Message to Network','ssdp');
            ssdpSendMsg(ssdpBuildHeader('byebye'), ssdp.address, ssdp.port);
        });

        //Binden des UDP Sockets an den SSDP Port
        udpSock.bind(ssdp.port);

        //Hinzufügen des Sockets zur SSDP Multicast Adresse
        udpSock.addMembership(ssdp.address);
    };

    //Funktion zum Senden einer SSDP Nachricht
    var ssdpSendMsg = function (ssdpHeader, address, port) {

        //Erstellen eines UDP Sockets
        var udpSock = dgram.createSocket("udp4");

        //Umwandeln des SSDP Headers (String) in einen Buffer für den Versand über UDP
        var msg = new Buffer(ssdpHeader);

        //Binden des Sockets an die verfügbaren Netzwerkadressen
        udpSock.bind();

        //Setzen des Time-to-Live Werts auf den SSDP Standard
        udpSock.setTTL(ssdp.ttl);

        //Senden der SSDP Nachricht an die IP und den Port des Empfängers
        udpSock.send(msg, 0, msg.length, port, address, function (err, bytes) {

            device.log('SSDP Message to '+address+':'+port +cr +msg,'ssdp');

            //Schließen des UDP Sockets
            udpSock.close();
        });
    };

    //Funktion zum Auswerten der Antwort auf eine Suchanfrage
    var ssdpGetRecipients = function(msg){

        var recipients = [];

        //Bei 'ssdp:all' müssen alle UPnP Geräte und Services Antworten
        if(msg.search('ssdp:all') != -1) return searchTypes;

        //Prüfen des Parameters ST aus der empfangenen Nachricht und Vergleichen der Werte mit allen Such-Typen
        for (var x = 0; x < searchTypes.length; x++){

            //Wenn ein UPnP Gerät oder Service dem Such-Typ entspricht, Zwischenspeichern in ein neues Array
            if(msg.search(searchTypes[x]) != -1)
                recipients.push(searchTypes[x]);
        }

        //Rückgabe des Arrays mit den gefundenen Such-Typen
        if (recipients.length > 0)return recipients;
        else return false;
    };

    //Funktion zum Generieren eines SSDP Headers für den Versand über UDP
    var ssdpBuildHeader = function(headerTyp, ST){

        //Generieren des Parameters USN (Bei Services und Gerät unterschiedlich)
        if(ST != 'upnp:rootdevice' || ST != config.UDN)
            var USN = config.UDN != ST ? config.UDN +'::' +ST : config.UDN;

        //Fallunterscheidung zur Generierung und Rückgabe des SSDP Headers
        switch (headerTyp){
            case 'search' :
                //Header für die Suche nach UPnP Geräten - Nur für Kontrollpunkte
                break;
            case 'notify' :
                return 'NOTIFY * HTTP/1.1'
                        +cr+'NT: ' + ST
                        +cr+'CACHE-CONTROL: max-age=' + ssdp.timeout
                        +cr+'HOST: ' + ssdp.address + ':' + ssdp.port
                        +cr+'NTS: ssdp:alive'
                        +cr+'USN: ' + USN
                        +cr+'SERVER: ' + os.type() + ', ' + os.release() + ' UPnP/1.0 UPnP-Device-Host/1.0'
                        +cr+'LOCATION: ' + config.location
                        +cr+'Content-Length: 0'
                        +cr+cr;
                break;
            case 'response' :
                return 'HTTP/1.1 200 OK'
                        +cr+'ST: ' + ST
                        +cr+'CACHE-CONTROL: max-age=' + ssdp.timeout
                        +cr+'EXT: '
                        +cr+'USN: ' + USN
                        +cr+'SERVER: ' + os.type() + ', ' + os.release() + ' UPnP/1.0 UPnP-Device-Host/1.0'
                        +cr+'LOCATION: ' + config.location
                        +cr+'Content-Length: 0'
                        +cr+cr;
                break;
            case 'byebye' :
                return 'NOTIFY * HTTP/1.1'
                        +cr+'HOST: ' + ssdp.address + ':' + ssdp.port
                        +cr+'NTS: ssdp:byebye'
                        +cr+'USN: ' + USN
                        +cr+'Content-Length: 0'
                        +cr+cr;
                break;
        }
    };

    //Rückgabe von öffentlich zugänglichen Variablen und Funktionen
    return {
        init:init
    };
})();
