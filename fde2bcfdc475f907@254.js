// https://observablehq.com/@nrabinowitz/h3-tutorial-suitability-analysis@254
import define1 from "./8e036ab682f7de65@7.js";

function _1(md){return(
md`# H3 Tutorial: Suitability Analysis

Suitability analysis is an approach used in the GIS field to identify optimal geographic locations for some specific use - for example, the best place to locate a new store or transit station. While the process is fairly straightforward - different geographic layers are added together with subjectively defined weights to produce a composite layer - combining arbitrary layers can be challenging. H3 simplifies this problem by providing hexagon grid cells as a common, uniform unit of analysis. 
`
)}

function _mapContainer(html){return(
html`<div style='height:600px;' />`
)}

function _h3Resolution(html){return(
html`<input type=range min=7 max=10 step=1 value=9>`
)}

function _4(md){return(
md`The sliders below adjust the weight we give to each layer.`
)}

function _crimeWeight(html){return(
html`<input type=range min=0 max=1 step=any value=1>`
)}

function _schoolWeight(html){return(
html`<input type=range min=0 max=1 step=any value=1>`
)}

function _bartWeight(html){return(
html`<input type=range min=0 max=1 step=any value=1>`
)}

function _travelWeight(html){return(
html`<input type=range min=0 max=1 step=any value=1>`
)}

function _cafesWeight(html){return(
html`<input type=range min=0 max=1 step=any value=1>`
)}

function _10(md){return(
md`## Data Layers

We'll take each of the raw data layers we're bringing in and convert them to hexagon layers. Each layer will be a map of H3 index to some value normalized between zero and 1.
`
)}

function _crimeLayer(crime90days,h3,h3Resolution,normalizeLayer)
{
  const layer = {};
  crime90days.forEach(({lat, lng}) => {
    const h3Index = h3.geoToH3(lat, lng, h3Resolution);
    layer[h3Index] = (layer[h3Index] || 0) + 1;
  });
  return normalizeLayer(layer);
}


function _schoolsLayer(publicSchools,h3,h3Resolution,normalizeLayer)
{
  const layer = {};
  publicSchools.forEach(({lat, lng}) => {
    const h3Index = h3.geoToH3(lat, lng, h3Resolution);
    // Add school hex
    layer[h3Index] = (layer[h3Index] || 0) + 1;
    // add surrounding kRing, with less weight
    h3.hexRing(h3Index, 1).forEach(neighbor => {
      layer[neighbor] = (layer[neighbor] || 0) + 0.5;
    });
  });
  return normalizeLayer(layer);
}


function _bartLayer(normalizeLayer,bufferPointsLinear,bartStations,kmToRadius){return(
normalizeLayer(bufferPointsLinear(bartStations, kmToRadius(1)))
)}

function _travelTimeLayer(sfTravelTimes,geojson2h3,h3Resolution,normalizeLayer)
{
  const layer = {};
  sfTravelTimes.features.forEach(feature => {
    const hexagons = geojson2h3.featureToH3Set(feature, h3Resolution);
    hexagons.forEach(h3Index => {
      // Lower is better, so take the inverse
      layer[h3Index] = (layer[h3Index] || 0) + 1 / feature.properties.travelTime;
    })
  });
  const out = normalizeLayer(layer, true);
  console.log(JSON.stringify(Object.keys(out).map(key => ({key, value: out[key]}))));
  return out;
}


function _cafesLayer(pois,h3,h3Resolution,normalizeLayer)
{
  const layer = {};
  pois.filter(poi => (poi.type === 'Cafes' || poi.type === 'Places to Eat' || poi.type === 'Restaurant')).forEach(({lat, lng}) => {
    const h3Index = h3.geoToH3(lat, lng, h3Resolution);
    layer[h3Index] = (layer[h3Index] || 0) + 1;
  });
  return normalizeLayer(layer);
}


function _16(md){return(
md`## Combining Layers`
)}

function _mapLayers(schoolsLayer,schoolWeight,bartLayer,bartWeight,travelTimeLayer,travelWeight,crimeLayer,crimeWeight,cafesLayer,cafesWeight){return(
[
  {hexagons: schoolsLayer, weight: schoolWeight},
  {hexagons: bartLayer, weight: bartWeight},
  {hexagons: travelTimeLayer, weight: travelWeight},
  // Crime is bad, so we'll subtract it instead of adding
  {hexagons: crimeLayer, weight: -crimeWeight},
  {hexagons: cafesLayer, weight: cafesWeight},
]
)}

function _combinedLayers(mapLayers,normalizeLayer)
{
  const combined = {};
  mapLayers.forEach(({hexagons, weight}) => {
    Object.keys(hexagons).forEach(hex => {
      combined[hex] = (combined[hex] || 0) + hexagons[hex] * weight;
    });
  });
  return normalizeLayer(combined);
}


function _19(md){return(
md`## Utilities`
)}

function _kmToRadius(h3,h3Resolution){return(
function kmToRadius(km) {
  return Math.floor(km / h3.edgeLength(h3Resolution, h3.UNITS.km));
}
)}

function _bufferPointsLinear(h3,h3Resolution,normalizeLayer){return(
function bufferPointsLinear(geojson, radius) {
  const layer = {};
  geojson.features.forEach(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    const stationIndex = h3.geoToH3(lat, lng, h3Resolution);
    // add surrounding multiple surrounding rings, with less weight in each
    const rings = h3.kRingDistances(stationIndex, radius);
    const step = 1 / (radius + 1);
    rings.forEach((ring, distance) => {
      ring.forEach(h3Index => {
        layer[h3Index] = (layer[h3Index] || 0) + 1 - distance * step;
      })
    });
  });
  return normalizeLayer(layer);
}
)}

function _normalizeLayer(){return(
function normalizeLayer(layer, baseAtZero = false) {
  const hexagons = Object.keys(layer);
  // Pass one, get max
  const max = hexagons.reduce((max, hex) => Math.max(max, layer[hex]), -Infinity);
  const min = baseAtZero ? hexagons.reduce((min, hex) => Math.min(min, layer[hex]), Infinity) : 0;
  // Pass two, normalize
  hexagons.forEach(hex => {
    layer[hex] = (layer[hex] - min) / (max - min); 
  });
  return layer;
}
)}

function _23(md){return(
md`## Map Rendering`
)}

function* _map(mapboxgl,mapContainer,config,renderHexes,combinedLayers)
{
  let map = this;
  
  if (!map) {
    map = new mapboxgl.Map({
      container: mapContainer,
      center: [
        config.lng,
        config.lat,
      ],
      zoom: config.zoom,
      style: 'mapbox://styles/mapbox/light-v9'
    });
  }
  
  // Wait until the map loads, then yield the container again.
  yield new Promise(resolve => {
    if (map.loaded()) resolve(map);
    else map.on('load', () => resolve(map));
  });
  
  renderHexes(map, combinedLayers);
}


function _renderHexes(geojson2h3,config){return(
function renderHexes(map, hexagons) {
  
  // Transform the current hexagon map into a GeoJSON object
  const geojson = geojson2h3.h3SetToFeatureCollection(
    Object.keys(hexagons),
    hex => ({value: hexagons[hex]})
  );
  
  const sourceId = 'h3-hexes';
  const layerId = `${sourceId}-layer`;
  let source = map.getSource(sourceId);
  
  // Add the source and layer if we haven't created them yet
  if (!source) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson
    });
    map.addLayer({
      id: layerId,
      source: sourceId,
      type: 'fill',
      interactive: false,
      paint: {
        'fill-outline-color': 'rgba(0,0,0,0)',
      }
    });
    source = map.getSource(sourceId);
  }

  // Update the geojson data
  source.setData(geojson);
  
  // Update the layer paint properties, using the current config values
  map.setPaintProperty(layerId, 'fill-color', {
    property: 'value',
    stops: [
      [0, config.colorScale[0]],
      [0.5, config.colorScale[1]],
      [1, config.colorScale[2]]
    ]
  });
  
  map.setPaintProperty(layerId, 'fill-opacity', config.fillOpacity);
}
)}

function _renderAreas(geojson2h3,config){return(
function renderAreas(map, hexagons) {
  
  // Transform the current hexagon map into a GeoJSON object
  const geojson = geojson2h3.h3SetToFeature(
    Object.keys(hexagons).filter(hex => hexagons[hex] > config.areaThreshold)
  );
  
  const sourceId = 'h3-hex-areas';
  const layerId = `${sourceId}-layer`;
  let source = map.getSource(sourceId);
  
  // Add the source and layer if we haven't created them yet
  if (!source) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson
    });
    map.addLayer({
      id: layerId,
      source: sourceId,
      type: 'line',
      interactive: false,
      paint: {
        'line-width': 3,
        'line-color': config.colorScale[2],
      }
    });
    source = map.getSource(sourceId);
  }

  // Update the geojson data
  source.setData(geojson);
}
)}

function _27(md){return(
md`## Config`
)}

function _config(){return(
{
  lng: -122.2,
  lat: 37.7923539,
  zoom: 11,
  fillOpacity: 0.9,
  colorScale: ['#ffffD9', '#50BAC3', '#1A468A'],
  areaThreshold: 0.75
}
)}

function _29(md){return(
md`## Raw Data`
)}

function _30(md){return(
md`Oakland crime reports, last 90 days. Source: [data.oaklandnet.com](https://data.oaklandnet.com/Public-Safety/90-Day-Crime-Map/kzer-wcj5)`
)}

function _crime90days(d3Fetch){return(
d3Fetch.json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/f5ef0fed8972d04a27727ebb50e065265e2d853f/oakland_crime_90days.json')
)}

function _32(md){return(
md`Oakland public school locations. Source: [data.oaklandnet.com](https://data.oaklandnet.com/Education/OAKLAND-SCHOOLS/d6pc-iyaw)`
)}

function _publicSchools(d3Fetch){return(
d3Fetch.json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/babf7357f15c99a1b2a507a33d332a4a87b7df8d/public_schools.json')
)}

function _34(md){return(
md`BART station locations. Source: [bart.gov](https://www.bart.gov/schedules/developers/geo)`
)}

function _bartStations(d3Fetch){return(
d3Fetch.json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/8f1a3e30113472404feebc288e83688a6d5cf33d/bart.json')
)}

function _36(md){return(
md`Travel times from Oakland to downtown SF by census tract. Source: [movement.uber.com](https://movement.uber.com/explore/san_francisco/travel-times)`
)}

function _sfTravelTimes(d3Fetch){return(
d3Fetch.json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/657a9f3b64fedc718c3882cd4adc645ac0b4cfc5/oakland_travel_times.json')
)}

function _38(md){return(
md`Oakland points of interest. Source: [uber.com/local](https://www.uber.com/local/us+ca+san_francisco/)`
)}

function _pois(d3Fetch){return(
d3Fetch.json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/ded89c2acef426fe3ee59b05096ed1baecf02090/oakland-poi.json')
)}

function _40(md){return(
md`## Dependencies`
)}

async function _mapboxgl(require,mapboxApiToken)
{
  let mapboxgl = await require('mapbox-gl@0.43.0');
  mapboxgl.accessToken = mapboxApiToken;
  return mapboxgl;
}


function _h3(require){return(
require('https://bundle.run/h3-js@3.1.0')
)}

function _geojson2h3(require){return(
require('https://bundle.run/geojson2h3@1.0.1')
)}

function _d3Fetch(require){return(
require('d3-fetch')
)}

function _46(html){return(
html`<link href='https://unpkg.com/mapbox-gl@0.43.0/dist/mapbox-gl.css' rel='stylesheet' />`
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("mapContainer")).define("mapContainer", ["html"], _mapContainer);
  main.variable(observer("viewof h3Resolution")).define("viewof h3Resolution", ["html"], _h3Resolution);
  main.variable(observer("h3Resolution")).define("h3Resolution", ["Generators", "viewof h3Resolution"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _4);
  main.variable(observer("viewof crimeWeight")).define("viewof crimeWeight", ["html"], _crimeWeight);
  main.variable(observer("crimeWeight")).define("crimeWeight", ["Generators", "viewof crimeWeight"], (G, _) => G.input(_));
  main.variable(observer("viewof schoolWeight")).define("viewof schoolWeight", ["html"], _schoolWeight);
  main.variable(observer("schoolWeight")).define("schoolWeight", ["Generators", "viewof schoolWeight"], (G, _) => G.input(_));
  main.variable(observer("viewof bartWeight")).define("viewof bartWeight", ["html"], _bartWeight);
  main.variable(observer("bartWeight")).define("bartWeight", ["Generators", "viewof bartWeight"], (G, _) => G.input(_));
  main.variable(observer("viewof travelWeight")).define("viewof travelWeight", ["html"], _travelWeight);
  main.variable(observer("travelWeight")).define("travelWeight", ["Generators", "viewof travelWeight"], (G, _) => G.input(_));
  main.variable(observer("viewof cafesWeight")).define("viewof cafesWeight", ["html"], _cafesWeight);
  main.variable(observer("cafesWeight")).define("cafesWeight", ["Generators", "viewof cafesWeight"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _10);
  main.variable(observer("crimeLayer")).define("crimeLayer", ["crime90days","h3","h3Resolution","normalizeLayer"], _crimeLayer);
  main.variable(observer("schoolsLayer")).define("schoolsLayer", ["publicSchools","h3","h3Resolution","normalizeLayer"], _schoolsLayer);
  main.variable(observer("bartLayer")).define("bartLayer", ["normalizeLayer","bufferPointsLinear","bartStations","kmToRadius"], _bartLayer);
  main.variable(observer("travelTimeLayer")).define("travelTimeLayer", ["sfTravelTimes","geojson2h3","h3Resolution","normalizeLayer"], _travelTimeLayer);
  main.variable(observer("cafesLayer")).define("cafesLayer", ["pois","h3","h3Resolution","normalizeLayer"], _cafesLayer);
  main.variable(observer()).define(["md"], _16);
  main.variable(observer("mapLayers")).define("mapLayers", ["schoolsLayer","schoolWeight","bartLayer","bartWeight","travelTimeLayer","travelWeight","crimeLayer","crimeWeight","cafesLayer","cafesWeight"], _mapLayers);
  main.variable(observer("combinedLayers")).define("combinedLayers", ["mapLayers","normalizeLayer"], _combinedLayers);
  main.variable(observer()).define(["md"], _19);
  main.variable(observer("kmToRadius")).define("kmToRadius", ["h3","h3Resolution"], _kmToRadius);
  main.variable(observer("bufferPointsLinear")).define("bufferPointsLinear", ["h3","h3Resolution","normalizeLayer"], _bufferPointsLinear);
  main.variable(observer("normalizeLayer")).define("normalizeLayer", _normalizeLayer);
  main.variable(observer()).define(["md"], _23);
  main.variable(observer("map")).define("map", ["mapboxgl","mapContainer","config","renderHexes","combinedLayers"], _map);
  main.variable(observer("renderHexes")).define("renderHexes", ["geojson2h3","config"], _renderHexes);
  main.variable(observer("renderAreas")).define("renderAreas", ["geojson2h3","config"], _renderAreas);
  main.variable(observer()).define(["md"], _27);
  main.variable(observer("config")).define("config", _config);
  main.variable(observer()).define(["md"], _29);
  main.variable(observer()).define(["md"], _30);
  main.variable(observer("crime90days")).define("crime90days", ["d3Fetch"], _crime90days);
  main.variable(observer()).define(["md"], _32);
  main.variable(observer("publicSchools")).define("publicSchools", ["d3Fetch"], _publicSchools);
  main.variable(observer()).define(["md"], _34);
  main.variable(observer("bartStations")).define("bartStations", ["d3Fetch"], _bartStations);
  main.variable(observer()).define(["md"], _36);
  main.variable(observer("sfTravelTimes")).define("sfTravelTimes", ["d3Fetch"], _sfTravelTimes);
  main.variable(observer()).define(["md"], _38);
  main.variable(observer("pois")).define("pois", ["d3Fetch"], _pois);
  main.variable(observer()).define(["md"], _40);
  const child1 = runtime.module(define1);
  main.import("mapboxApiToken", child1);
  main.variable(observer("mapboxgl")).define("mapboxgl", ["require","mapboxApiToken"], _mapboxgl);
  main.variable(observer("h3")).define("h3", ["require"], _h3);
  main.variable(observer("geojson2h3")).define("geojson2h3", ["require"], _geojson2h3);
  main.variable(observer("d3Fetch")).define("d3Fetch", ["require"], _d3Fetch);
  main.variable(observer()).define(["html"], _46);
  return main;
}
