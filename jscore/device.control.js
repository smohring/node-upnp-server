//Einbinden des Hauptmoduls
var device = require('./device.js');

//Einbinden benötigter Node.JS Modules und Erweiterungen
var os = require('os');

//Deklaration des Moduls
device.control = (function () {

    //Deklaration der Membervariablen
    var cr = '\r\n',
        t= '\t',
        service;

    //Funktion zur Verarbeitung einer Steuerungsanfrage
    var getResponse = function (_req, _service) {

        //Speichern des aufrufenden Service
        service = _service;

        //Extrahieren der gesendeten Argumente
        var args = parseRequest (_req);

        //Aufruf der Funktion des Service, Abfangen von Fehlern mittels try-catch
        try {
            //Prüfen ob Argumente mitgesendet wurden
            if (args)
                return buildResponse(eval ('device.'+service.serviceId+'.'+service.functionName+'('+args.toString()+');'));
            else return buildResponse(eval ('device.'+service.serviceId+'.'+service.functionName+'();'));

        }catch(err){

            device.log('Requested Function not implemented' ,'control');
            return false;
        }
    };

    //Funktion zum Parsen einer SOAP Anfrage
    var parseRequest = function (_req){

        //Start- und Endposition der Liste mit Funktionsname und Argumenten
        var startPos = _req.search('<u:')+'<u:'.length;
        var list = _req.slice(startPos, _req.length);
        var xmlnsStartPos = list.search(' xmlns:u="');
        var xmlnsEndPos = list.search(' xmlns:u="')+' xmlns:u="'.length;

        //Auslesen des Namens der angeforderten Funktion
        service.functionName = list.slice(0, xmlnsStartPos);

        //Prüfen ob Argumente für den Funktionsaufruf enthalten sind
        var endPos = list.search('</u:');
        if(endPos == -1){
            endPos = list.search('" />');
            return false;
        }

        //Start- und Endposition der Liste aller Argumente Ermitteln
        var serviceTypeEndPos = list.search('">');
        var argListStart = serviceTypeEndPos+'">'.length;
        var argsList = list.slice(argListStart, endPos);
        var argNameStart = argsList.search('<')+'<'.length;
        var argNameEnd = argsList.search('>');
        var argValStart = argNameEnd+1;
        var argValEnd = argsList.search('</');

        var argNames = [];
        var argValues = [];

        //Alle Argumente und Namen speichern, bis keine weiteren gefunden werden
        while (argsList.search('<') != -1){

            //Speichern der Argumente und deren Werte in Arrays
            argNames.push(argsList.slice(argNameStart,argNameEnd));
            argValues.push(argsList.slice(argValStart,argValEnd));

            argsList = argsList.slice(argValEnd+2+argsList.slice(argNameStart,argNameEnd).length+1,argsList.length);
            argNameStart = argsList.search('<')+'<'.length;
            argNameEnd = argsList.search('>');
            argValStart = argNameEnd+1;
            argValEnd = argsList.search('</');
        }

        //Rückgabe der Werte der Argumente
        return argValues;
    };

    //Funktion zum Generieren einer SOAP Antwort
    var buildResponse = function (args){

        //Generieren des XML Strings der Antwort
        var body =
            '<?xml version="1.0" encoding="utf-8"?>'
            +cr+ '<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">'
            +cr+t+'<s:Body>'
            +cr+t+t+'<u:' + service.functionName +' xmlns:u="' + service.serviceType;

        //Sofern Argumente zurückgegeben werden, diese in die XML Struktur eingearbeiten
        if (args){
            body +='">'+cr;

            Object.getOwnPropertyNames(args).forEach(function(key) {
                body += t+t+t+ '<' + key + '>' + args[key] + '</' + key +'>' +cr;
            });

            body += t+t+'</u:' + service.functionName +'>'
        } else body +='" />';

            body+=cr+t+'</s:Body>'
                 +cr+'</s:Envelope>';

        //Generieren des SOAP Headers
        var header = {
              'content-length' : body.length.toString(),
              'content-type' : 'text/xml; charset="utf-8"',
              'Date' : new Date(),
              'SERVER' : os.type() + ', ' + os.release() + ' UPnP/1.0 UPnP-Device-Host/1.0'
        };

        //Rückgabe des Header und Body Objekts
        return { header:header, body:body };
    };

    //Rückgabe von öffentlich zugänglichen Variablen und Funktionen
    return {
        getResponse:getResponse
    };
})();