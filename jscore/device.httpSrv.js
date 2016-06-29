//Einbinden des Hauptmoduls
var device = require('./device.js');

//Einbinden benötigter Node.JS Modules und Erweiterungen
var fs = require('fs');
var http = require('http');
var mime = require('mime');

//Deklaration des Untermoduls
device.httpSrv = (function () {

    //Deklaration der Membervariablen
    var cr = '\r\n',
        urls,
        services;

    //Initialisierung des Moduls
    var init = function (_urls, _services, _port) {
        
        urls = _urls;
        services = _services;

        //Erstellen des HTTP Servers
        http.createServer(function (req, res) {

            device.log('Incoming HTTP-Request: '+req.url,'http');

            //Auswerten der angefragten URL und Weiterleiten an die jeweiligen Module
            if (req.url == urls.device.wwwRootDir)
                deviceDesc(req, res);

            else if (req.url.match(new RegExp('\\' + urls.device.wwwRootDir+urls.device.presDir)))
                presentation(req, res);

            else {
                service(req,res);
            }

        }).listen(_port);
    };

    //Funktion zum Auswerten der Anfrage an die Präsentationswebsite
    var presentation = function (req, res){

        //Regulärer Ausdruck um eine Anfrage für die Rückgabe eines LOGs abzufangen
        if (req.url.match(new RegExp('\\'+'/log/'))){

            var url=req.url.split('/');
            var data = device.getLog(url.pop());

            //HTTP 200 OK Header senden, anschließend das Array des Logs
            res.writeHead(200, { 'Content-Type':'text' });
            res.end(data.join(cr), 'utf-8');

        //Anfragen, die direkt an das Hauptverzeichnis der Website gehen, bekommen die index.html zurückgeliefert
        } else if (req.url == urls.device.wwwRootDir+urls.device.presDir){

            requestFile(urls.device.presPath +'/index.html', function(content){
                res.writeHead(200, { 'Content-Type':'text/html' });
                res.end(content, 'utf-8');
            });

        //Verarbeiten aller weiterer Anfragen
        } else{

            //Auslesen der angeforderten Datei
            requestFile(urls.device.baseDir+req.url, function(content, mimetype){

                //Rückgabe der angeforderten Datei
                if(content){
                    res.writeHead(200, { 'Content-Type': mimetype });
                    res.end(content, 'utf-8');
                }

                //Fehlermeldung '404' senden wenn die Datei nicht existiert
                res.writeHead(404, { 'Content-Type':'text' });
                res.end('File not Found', 'utf-8');
            });
        }
    };

    //Funktion zur Rückgabe der UPnP Device Description
    var deviceDesc = function (req, res){

        requestFile(urls.device.deviceDescPath, function(content){
            res.writeHead(200, { 'Content-Type':'text/xml' });
            res.end(content, 'utf-8');
        });
    };

    //Funktion zum Auswerten der Anfrage an einen Service
    var service = function (req, res){

        //Schleife für alle implementierten Services
        for (var key in services) {

            //Abfangen der Anfrage einer UPnP Service Description (SCPDURL)
            if (req.url == urls.device.wwwRootDir + services[key].SCPDURL) {

                requestFile(urls.device.baseDir + services[key].SCPDURL, function (content) {
                    res.writeHead(200, { 'Content-Type':'text/xml' });
                    res.end(content, 'utf-8');
                });

            //Abfangen einer Steuerungsanfrage (controlURL eines Service)
            } else if (req.url == urls.device.wwwRootDir + services[key].controlURL) {

                //Zwischenspeichern des anfragenden Service
                var service = services[key];

                //Abfangen wenn weitere Daten (HTTP Body) empfangen werden
                req.on('data', function (data) {

                    device.log('SOAP Message from '+req.headers.host+' to '+req.url+':'+cr+data , 'control');

                    //Weiterleiten der SOAP Nachricht an das Modul "device.control" und speichern der Antwort
                    var soapres = device.control.getResponse(data.toString(), service);

                    if(soapres){
                        device.log('SOAP Message to '+req.headers.host, 'control');

                        //Senden des SOAP Header und Body
                        res.writeHead(200, soapres.header);
                        res.end(soapres.body);
                    }
                });

            //Abfangen einer Anfrage für eine Ereignisregistrierung / Erneuerung / Abmeldung
            } else if (req.url == urls.device.wwwRootDir + services[key].eventSubURL) {

                device.log('Recieving Event Request from ' + req.headers.host + ' to ' + req.url ,'event');

                //Weiterleiten der Anfrage an das Modul "device.event" und speichern der Antwort
                var eventres = device.event.getResponse(req, services[key]);

                //Senden der Antwort
                if (typeof eventres == 'object') res.writeHead(200, eventres);
                else res.writeHead(200,{});

                res.end();
            }
        }
    };

    //Funktion zum Auslesen angeforderter Dateien
    var requestFile = function (url , callback){

        //Einlesen der Datei
        fs.readFile(url, function (err, content) {

            //Rückgabe einer Fehlermeldung wenn die Datei nicht verfügbar ist
            if(err){
                device.log('Requested file not available', 'http');
                callback(false);
            }

            //Rückgabe des Inhalts der Datei, sowie des MIME-Type der Datei
            callback(content, mime.lookup(url));
        });
    };

    //Rückgabe von öffentlich zugänglichen Variablen und Funktionen
    return {
        init:init
    };
})();
