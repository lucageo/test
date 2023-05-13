// https://observablehq.com/@nrabinowitz/mapbox-token@7
function _1(md){return(
md`# Mapbox Token
Mapbox tokens are supposed to be rotated periodically when in public use. This notebook stores the current token to facilitate rotation across notebooks.
`
)}

function _mapboxApiToken(){return(
'pk.eyJ1IjoibnJhYmlub3dpdHoiLCJhIjoiY2tmeWFhNW1nMWtmdTM0czkzYTV1c2M1ZCJ9.vTv6YYavFPRiCQJxfMfTsg'
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("mapboxApiToken")).define("mapboxApiToken", _mapboxApiToken);
  return main;
}
