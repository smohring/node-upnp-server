//Einbinden des Hauptmoduls
var device = require('./../../../jscore/device.js');

//Deklaration des Service als Untermodul des Frameworks
device.ConnectionManager = (function () {

    //Speichern der ausgehenden Argumente aller implementierten Funktionen
    //Werte werden von den jeweiligen Funktionen gesetzt, diese dienen zum Testen.
    var args = {
         GetCurrentConnectionIDs : {
            ConnectionIDs : '0'
         },
         GetCurrentConnectionInfo : {
             RcsID : -1,
             AVTransportID : -1,
             ProtocolInfo : 'http-get:*:*:*',
             PeerConnectionManager : '/',
             PeerConnectionID : -1,
             Direction : 'Output',
             Status : 'TestStatus'
         },
         GetProtocolInfo : {
             Source : 'TestStatusVariable',
             Sink : 'TestStatusVariable'
         }
    };

    //Funktion zur Rückgabe der Statusvariablen mit "evented=yes" an das Framework
    var getEventedArgs = function () {

        var eventedArgs = {
            SourceProtocolInfo : args.GetProtocolInfo.Source,
            SinkProtocolInfo : args.GetProtocolInfo.Sink,
            CurrentConnectionIDs : args.GetCurrentConnectionIDs.ConnectionIDs
        };

        return eventedArgs;
    };

    //Start der Funktionsimplementierungen
    var GetCurrentConnectionIDs = function (){

        //Implementierung der Funktionslogik

        /*
        Beispiel: Senden einer Unicast Ereignismeldung bei Änderung von Statusvariablen
        var subscriber = device.event.getSubscribers();
        if(subscriber){
            Object.getOwnPropertyNames(subscriber).forEach(function(key) {
                if(subscriber[key].serviceId == 'ConnectionManager')
                    device.event.sendUnicast(key, getEventedArgs());
            });
        }

        Beispiel: Senden einer Multicast Ereignismeldung
        //device.event.sendMulticast('ConnectionManager', 'upnp:/warning', getEventedArgs());
        */

        //Rückgabe der ausgehenden Argumente
        return args.GetCurrentConnectionIDs;
    };

    var GetCurrentConnectionInfo = function (ConnectionId){

        return args.GetCurrentConnectionInfo;
    };

    var GetProtocolInfo = function (){

        return args.GetProtocolInfo;
    };

    //Rückgabe von öffentlich zugänglichen Variablen und Funktionen
    return {
        getEventedArgs: getEventedArgs,
        GetCurrentConnectionIDs:GetCurrentConnectionIDs,
        GetCurrentConnectionInfo:GetCurrentConnectionInfo,
        GetProtocolInfo:GetProtocolInfo
    };
})();
