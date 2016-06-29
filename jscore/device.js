//Einbinden benötigter Node.JS Modules und Erweiterungen
var fs = require('fs');
var uuid = require('node-uuid');
var xml2js = require('xml2js');
var util = require('util');
var async = require('async');

//Deklaration des Moduls
device = (function () {

    //Deklaration der Membervariablen
    var cr = '\r\n',
        files,
        urls = {},
        services = [],
        searchTypes = [],
        servicePaths = [],
        deviceDescPath,
        deviceDesc = {},
        serviceDescs = [],
        logging = { ssdp :[], http :[], device:[], control :[], event :[] },
        config = { UDN : 'uuid:', location : '', port : '' };

    //XML Parser initialisieren
    var xml = new xml2js.Parser({explicitRoot:false, emptyTag:'', attrkey:'@',explicitArray:false});

    //Initialisierung des Moduls
    var init = function (_files) {

        //Speichern der Initialisierungsparameter in Membervariablen
        files = _files;
        deviceDescPath = files.baseDir + files.deviceDesc;

        //Auslesen und Speichern aller UPnP Service Description Pfade
        for(var key in files.serviceDesc)
            servicePaths.push(files.baseDir+'services/'+files.serviceDesc[key]);

        //Paralleles Verarbeiten aller XML Dateien (UPnP Device- und Service Description)
        async.parallel([
            function (callback) {

                //Einlesen, Parsen und Speichern der UPnP Device Description
                getDescXML(deviceDescPath, function (result) {
                    deviceDesc = result;
                    callback();
                });
            },
            function (callback) {

                //Einlesen, Parsen und Speichern aller UPnP Service Descriptions über eine asynchrone forEach Schleife
                var numElems = servicePaths.length;
                async.forEach(servicePaths, function (key) {

                    getDescXML(key, function(result){
                        serviceDescs.push(result);
                        numElems--;

                        //Callback erst zurückgeben, wenn alle Dateien verarbeitet wurden
                        if (numElems == 0) callback();
                    });
               });
            }
        ],
        //Verarbeiten der geparsten XML Daten nach Beendigung des einlesens
        function (results) {

            //Speichern benötigter Daten aus dem Objekt der UPnP Device Description
            config.UDN = deviceDesc.device.UDN.length > 0 ? deviceDesc.device.UDN : 'uuid:'+uuid.v4();
            config.location = deviceDesc.URLBase;
            config.port = parseInt(config.location.slice(config.location.lastIndexOf(':')+1, config.location.length));

            //Sammeln aller benötigten URLs
            getUrls();

            //Sammeln der Daten aller Services
            getServices();

            //Sammeln der Daten aller verfügbaren Such-Typen
            getSearchTypes();

            //Initialisierung von Modulen
            device.log('Initializing Modules','device');
            device.event.init(config);
            device.httpSrv.init(urls, services, config.port);
            device.ssdp.init(searchTypes, config);
        });
    };

    //Funktion zum Erstellen eines Objekts mit allen Services
    var getServices = function (){

        //Objekt aller Services
        var service = deviceDesc.device.serviceList.service;

        //Prüfen, ob mehr als ein Service implementiert ist
        if(service[1] == undefined)
            services.push(service);
        else for (var key in service){
            services.push(service[key]);
        }
    };

    //Funktion zum Erstellen eines Arrays mit allen Such-Typen (Parameter ST)
    var getSearchTypes = function () {

        searchTypes.push('upnp:rootdevice');
        searchTypes.push(config.UDN);
        searchTypes.push(deviceDesc.device.deviceType);

        for (var key in services){
            searchTypes.push(services[key].serviceType);
        }
    };

    //Funktion zum Erstellen eines Objekts mit allen benötigten URLs
    var getUrls =function (){

        urls.device = {
            presPath : files.baseDir + deviceDesc.device.presentationURL,
            presDir : deviceDesc.device.presentationURL,
            deviceDescPath : deviceDescPath,
            wwwRootDir : '/',
            baseDir : files.baseDir
        };
    };

    //Funktion zum Vararbeiten, Einlesen und Parsen einer XML Datei anhand des Dateipfads
    var getDescXML = function (filepath, callback){

        //Einlesen der Datei
        fs.readFile(filepath, function (err, data) {

            //Ausgabe eines Fehlers wenn die Datei nicht gefunden wurde
            if (err) log('Error load XML file: '+filepath ,'device');

            //Verarbeiten der Datei und Parsen der XML Daten
            xml.parseString(data, function (err, result) {

                //Ausgabe eines Fehlers wenn das Parsen nicht erfolgreich war
                if (err) log('Error parse XML file: '+filepath);
                    log('Parsing of' + filepath + ' successfull','device');

                //Rückgabe eines Objekts mit den geparsten XML Daten
                callback(result);
            });
        });
    };

    //Funktion für das globale Logging des Frameworks
    var log = function(message ,type){

        //Speichern eines neuen Log Eintrags für das jeweilige Modul
        logging[type].push(cr+ new Date() +cr + '----------------------------------------------------------------------------------'+cr+message.toString()+cr);

        //Das Array nach 20 Einträgen leeren
        if (logging[type].length == 20)
            logging[type] = [];

        //Ausgabe der Meldung in die Konsole von Node.JS
        console.log('----------------------------------------------------------------------------');
        console.log(message);
    };

    //Funktion um Log Daten abzurufen
    var getLog = function(type){

        //Rückgabe des Arrays in umgekehrter Reihenfolge (Neuster Eintrag vorn)
        var retAry=[];
        for(var x = logging[type].length; x > 0; x--)
            retAry.push(logging[type][x-1]);
        return retAry;
    };

    //Rückgabe von öffentlich zugänglichen Variablen und Funktionen
    return {
        init:init,
        log:log,
        getLog:getLog
    };
})();

//Export des Moduls
module.exports = device;