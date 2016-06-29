//Einbinden des Hauptmoduls
var device = require('./../../../jscore/device.js');

//Deklaration des Service als Untermodul des Frameworks
device.ContentDirectory = (function () {

    //Speichern der ausgehenden Argumente aller implementierten Funktionen.
    var args = {
        Browse:{
            Result:'',
            NumberReturned:'',
            TotalMatches:'',
            UpdateID:''
        },
        CreateObject:{
            ObjectID:'',
            Result:''
        },
        CreateReference:{
            NewID:''
        },
        ExportResource:{
            TransferID:''
        },
        GetSearchCapabilities:{
            SearchCaps:''
        },
        GetSortCapabilities:{
            SortCaps:''
        },
        GetSystemUpdateID:{
            Id:''
        },
        GetTransferProgress:{
            TransferStatus:'',
            TransferLength:'',
            TransferTotal:''
        },
        ImportResource:{
            TransferID:''
        },
        Search:{
            Result:'',
            NumberReturned:'',
            TotalMatches:'',
            UpdateID:''
        }
    };

    //Funktion zur Rückgabe der Statusvariablen mit "evented=yes" an das Framework
    var getEventedArgs = function () {

        var eventedArgs = {
            ContainerUpdateIDs : '',
            SystemUpdateID : '',
            TransferIDs : ''
        };

        return eventedArgs;
    };

    //Start der Funktionsimplementierungen
    var Browse = function (ObjectID, BrowseFlag, Filter, StartingIndex, RequestedCount, SortCriteria){

        //Implementierung der Funktionslogik

         //Rückgabe der ausgehenden Argumente
        return args.Browse;
    };

    var CreateObject = function (ContainerID, ObjectID){

        return args.CreateObject;
    };

    var CreateReference = function (ContainerID, ObjectID){

        return args.CreateReference;
    };

    var DeleteResource = function (ObjectID){

    };

    var DestroyObject = function (ObjectID){

    };

    var ExportResource = function (SourceURI, DestinationURI){

        return args.ExportResource;
    };

    var GetSearchCapabilities = function (){

        return args.GetSearchCapabilities;
    };

    var GetSortCapabilities = function (){

        return args.GetSortCapabilities;
    };

    var GetTransferProgress = function (TransferID){

        return args.GetTransferProgress;
    };

    var ImportResource = function (SourceURI, DestinationURI){

        return args.ImportResource;
    };

    var Search = function (ContainerID, SearchCriteria, Filter, StartingIndex, RequestedCount, SortCriteria){

        return args.Search;
    };

    var StopTransferResource = function (){

    };

    var UpdateObject = function (ObjectID, CurrentTagValue, NewTagValue){

    };

    //Rückgabe von öffentlich zugänglichen Variablen und Funktionen
    return {
        getEventedArgs: getEventedArgs,
        Browse : Browse,
        CreateObject : CreateObject,
        CreateReference : CreateReference,
        DeleteResource : DeleteResource,
        DestroyObject : DestroyObject,
        ExportResource : ExportResource,
        GetSearchCapabilities : GetSearchCapabilities,
        GetSortCapabilities : GetSortCapabilities,
        GetTransferProgress : GetTransferProgress,
        ImportResource : ImportResource,
        Search : Search,
        StopTransferResource : StopTransferResource,
        UpdateObject : UpdateObject
    };
})();
