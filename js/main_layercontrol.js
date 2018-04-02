//function to instantiate the Leaflet map
function createMap(){
    //DELETE THIS???
    var expressed = 'PCIPCTCHG';
    
    //sets map boundary - needs tweaking
    var myBounds = [[41, -89.7],[43.9, -86.7]];
    
    //create the map
    var map = L.map('mapid', {
        maxZoom: 18,
        minZoom: 10,
        maxBounds: myBounds
    }).setView([41.92, -87.735], 12);
   
    var streets = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1Ijoiam1qZmlzaGVyIiwiYSI6ImNqYXVlNDg3cDVhNmoyd21oZ296ZXpwdWMifQ.OGprR1AOquImP-bemM-f2g'
    }).addTo(map);
    
    var imagery = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        id: 'mapbox.streets-satellite',
        accessToken: 'pk.eyJ1Ijoiam1qZmlzaGVyIiwiYSI6ImNqYXVlNDg3cDVhNmoyd21oZ296ZXpwdWMifQ.OGprR1AOquImP-bemM-f2g'
    });
    
    var baseMaps = {
        "Streets": streets,
        "Imagery": imagery
    };
    
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.json, "data/cook_county.topojson") //async load tracts
        .defer(d3.json, "data/CTA_4326.topojson") //async load L lines
        .defer(d3.json, "data/CTA_stations_4326.topojson") //async L stations
        .await(callback);
        
    function callback (error, tractsTopo, linesTopo, stationsTopo) {
        
        //grab the features from the topojsons
        var tracts = topojson.feature(tractsTopo, tractsTopo.objects.cook_county).features;
        var lines = topojson.feature(linesTopo, linesTopo.objects.CTA_4326).features;
        var stations = topojson.feature(stationsTopo, stationsTopo.objects.CTA_stations_4326).features;
        
        //call function to add tracts information to add-able layers
        var tractLayers = addTracts(map, expressed, tracts);
        
        //call function to get MTA stuff on map
        var linesAndStations = addMTA(map,lines,stations);
        
        var groupedOverlays = {
          "Tract Data": tractLayers,
          "MTA Layers": linesAndStations
        };
        
        //set options for groupedLayers control
        var options = {
            exclusiveGroups: ["Tract Data"],
            collapsed: false
        }
        
        //control which layers are displayed source: http://leafletjs.com/reference-1.3.0.html#control
        //L.control.layers(baseMaps, groupedOverlays).addTo(map);
        //probably need this!: https://github.com/ismyrnow/leaflet-groupedlayercontrol
        L.control.groupedLayers(baseMaps,groupedOverlays,options).addTo(map);
    };
    
};

function addMTA(map,lines,stations){
    
    var layerDict = {
        'MTA "L" Routes': null,
        'MTA "L" Stations': null
    };
    
    var routes = L.geoJSON(lines,{
        style: function(feature){return routeStyle(feature)}
    }).addTo(map);
    
    var geojsonMarkerOptions = {
        radius: 3,
        fillColor: "white",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
    
    var stationPoints = L.geoJSON(stations, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, geojsonMarkerOptions);
        },
        onEachFeature: stationName
    }).addTo(map);
    
    layerDict['MTA "L" Routes'] = routes;
    layerDict['MTA "L" Stations'] = stationPoints;
    
    return layerDict;
};

function stationName(feature,layer){
    
    var popupContent = feature.properties['LONGNAME'];
    
    layer.bindTooltip(popupContent, {
        offset: [0,-7],
        direction: 'top',
        className: 'popupStation'});
}

function routeStyle(feature){
    var routeColor = feature.properties['LEGEND'];
    
    if (routeColor === 'RD'){
        var color = 'red' 
    }else if(routeColor ==='BL'){
        var color = 'blue'
    }else if(routeColor ==='BR'){
        var color = 'brown'
    }else if(routeColor ==='GR'){
        var color = 'green'
    }else if(routeColor ==='ML'){
        var color = 'black'
    }else if(routeColor ==='OR'){
        var color = 'orange'
    }else if(routeColor ==='PK'){
        var color = 'pink'
    }else if(routeColor ==='PR'){
        var color = 'purple'
    }else{
        var color = 'yellow'
    };
    
    //define style
    var myStyle = {
        "color": color,
        "weight": 3,
        "opacity": .8
    };
    
    return myStyle;
};

function addTracts(map, expressed, tracts) { //source: http://bl.ocks.org/Caged/5779481
    
    var options = ['UERPCTCHG','PCIPCTCHG','POVPCTCHG','POPPCTCHG','BLKPCTCHG',
                   'ASNPCTCHG','HSPPCTCHG','WHTPCTCHG','HSPCTCHG','PHSPCTCHG','ORRPCTCHG'];
    
    var overlayMaps = {
        'UERPCTCHG': null,
        'PCIPCTCHG': null,
        'POVPCTCHG': null,
        'POPPCTCHG': null,
        'BLKPCTCHG': null,
        'ASNPCTCHG': null,
        'HSPPCTCHG': null,
        'WHTPCTCHG': null,
        'HSPCTCHG': null,
        'PHSPCTCHG': null,
        'ORRPCTCHG': null};
    
    for (var i = 0; i < options.length; i++){
        var expressed = String(options[i]);
        var colorScale = makeColorScale(expressed,tracts);
        var layer = L.geoJson(tracts, {
            style: function(feature){return setStyle(feature, colorScale, expressed)},
            onEachFeature: onEachFeature
        })
        overlayMaps[expressed] = layer;
    }
    
    return overlayMaps;
};

function onEachFeature(feature, layer) {
    
    var lookUp = ['2016_POP','2010_POP','2016_BLACK','2010_BLACK','2016_ASIAN',
                  '2010_ASIAN','2016_HISP','2010_HISP','2016_WHITE','2010_WHITE',
                  '2016_HS','2010_HS','2016_POSTH','2010_POSTH','2016_PCTHM',
                  '2010_PCTHM','2016_OWNER','2010_OWNER','2016_RENT','2010_RENT'];
    
    var fields = ['2016 Population: ','2010 Population: ','2016 Black Pop: ','2010 Black Pop: ',
                  '2016 Asian Pop: ','2010 Asian Pop: ','2016 Hispanic Pop: ','2010 Hispanic Pop: ',
                  '2016 White Pop: ','2010 White Pop: ','2016 High School or Less Pop: ',
                  '2010 High School or Less Pop: ','2016 At Least Some College Pop: ',
                  '2010 At Least Some College Pop: ','2016 Percent Homeless: ','2010 Percent Homeless: ',
                  '2016 Home Owner Pop: ','2010 Home Owner Pop: ',
                  '2016 Home Renter Pop: ','2010 Home Renter Pop: '];
    
    var popupContent = '';
    
    for (var i=0; i < lookUp.length; i++){
        var stat = String(feature.properties[lookUp[i]]);
        popupContent += fields[i];
        popupContent += stat;
        popupContent += '<br>';
    }
    
    layer.bindPopup(popupContent, {
        maxHeight: 180,
        minWidth: 300,
        className: 'popup'});
};

function setStyle(feature, colorscale, expressed){
    //find the feature's fill color based on scale and make sure it's not undefined
    var check = feature.properties[expressed];
    if (check == 'UNDEF'){
        var fillColor = "#CCC"
    }else{
        var fillColor = colorscale(feature.properties[expressed]);
    }
    //define style
    var myStyle = {
        "color": fillColor,
        "fillOpacity": 0.5,
        "weight": .1
    };

    return myStyle;
}

function makeColorScale(expressed,tracts){
    
    var colorClasses = ['#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641'];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<tracts.length; i++){
        var check = tracts[i].properties[expressed];
        if (check !== 'UNDEF') {
            var val = parseFloat(check);
            domainArray.push(val);
        }
    };
    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};

$(document).ready(createMap);