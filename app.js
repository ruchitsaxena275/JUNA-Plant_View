// ================= MAP =================
const map = L.map("map").setView([28.15, 73.13], 12);

// Base map (online)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// ================= UTILITY =================
function pad2(num) {
  return num.toString().padStart(2, "0");
}
function loadGeoJSON(path, options, label) {
  fetch(path)
    .then(r => {
      if (!r.ok) throw new Error(path + " not found");
      return r.json();
    })
    .then(data => {
      const layer = L.geoJSON(data, options).addTo(map);
      console.log(label + " loaded");
      return layer;
    })
    .catch(err => console.error(label + " error:", err));
}

// ================= BOUNDARY =================
loadGeoJSON("data/Boundary.geojson", {
  style: { color: "black", weight: 2 }
}, "Boundary");

// ================= ROADS =================
loadGeoJSON("data/Road.geojson", {
  style: { color: "#666", weight: 1 }
}, "Road");

// ================= SCB =================
let scbLayer;

fetch("data/SCB.geojson")
  .then(r => r.json())
  .then(data => {
    scbLayer = L.geoJSON(data, {
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: "red",
          fillOpacity: 0.9
        }),
      onEachFeature: (f, l) =>
        l.bindPopup(`<b>SCB:</b> ${f.properties.Name || "NA"}`)
    }).addTo(map);

    // SCB search
    new L.Control.Search({
      layer: scbLayer,
      propertyName: "Name",
      marker: false,
      moveToLocation: (latlng) => map.setView(latlng, 18)
    }).addTo(map);
  });

// ================= POWER STATION / ITC NUMBERS =================
fetch("data/Power_station_numbers.geojson")
  .then(r => {
    if (!r.ok) throw new Error("Power_station_numbers.geojson not found");
    return r.json();
  })
  .then(data => {
    const itcNumberLayer = L.geoJSON(data, {
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: "#000",
          weight: 1,
          fillColor: "#FFD700",
          fillOpacity: 1
        }),
      onEachFeature: (f, l) => {
        // THIS IS THE IMPORTANT LINE
        l.bindTooltip(f.properties.Name, {
          permanent: true,
          direction: "center",
          className: "itc-label"
        });
      }
    }).addTo(map);

    console.log("ITC number layer loaded:", data.features.length);
  })
  .catch(err => console.error("ITC number layer error:", err));

// ================= TRACKERS =================
let trackerLayer;

fetch("data/tracker_points.geojson")
  .then(r => r.json())
  .then(data => {
    trackerLayer = L.geoJSON(data, {
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 4,
          color: "blue",
          fillOpacity: 0.9
        }),
      onEachFeature: (f, l) => {
        l.bindPopup(`
          <b>Tracker ID:</b> ${f.properties.tracker_id}<br>
          <b>Node ID:</b> ${f.properties.node_id}<br>
          <b>ITC:</b> ${f.properties.Layer}<br>
          <b>Robo IDs:</b> ${f.properties.robo_ids}<br>
          <b>String 1:</b> ${f.properties.string_1 || ""}<br>
          <b>String 2:</b> ${f.properties.string_2 || ""}<br>
          <b>String 3:</b> ${f.properties.string_3 || ""}<br>
          <b>String 4:</b> ${f.properties.string_4 || ""}
        `);
      }
    }).addTo(map);

    // String search
    new L.Control.Search({
      layer: trackerLayer,
      propertyName: "string_1",
      marker: false,
      moveToLocation: (latlng) => map.setView(latlng, 18)
    }).addTo(map);
  });

// ================= ITC STRINGS =================
const itcColors = [
  "#ff7f0e", "#2ca02c", "#9467bd", "#1f77b4",
  "#d62728", "#8c564b", "#e377c2", "#7f7f7f",
  "#bcbd22", "#17becf"
];

for (let i = 1; i <= 20; i++) {
  const color = itcColors[i % itcColors.length];

  loadGeoJSON(`data/ITC-${i}_strings.geojson`, {
    style: {
      color: color,
      weight: 1
    }
  }, `ITC-${i} Strings`);
}

// ================= GPS / REAL-TIME LOCATION (HIGH ACCURACY) =================

// Single marker for live location
let liveLocationMarker = L.circleMarker([0, 0], {
  radius: 7,
  color: "green",
  fillColor: "green",
  fillOpacity: 0.9
}).addTo(map);

// Success callback
function onLocationSuccess(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  console.log("GPS:", lat, lng, "Accuracy:", accuracy, "m");

  const latlng = [lat, lng];

  liveLocationMarker
    .setLatLng(latlng)
    .bindPopup(`📍 You are here<br>Accuracy: ${accuracy.toFixed(1)} m`);

  // ❌ NO auto zoom / NO auto centering
}


// Error callback
function onLocationError(err) {
  console.warn("GPS error:", err.message);
}

// Start high-accuracy GPS tracking
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    onLocationSuccess,
    onLocationError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
} else {
  console.warn("Geolocation not supported by browser");
}

// ================= SEARCH UI LOGIC (FIXED) =================
document.addEventListener("DOMContentLoaded", () => {

  // Utility to fill dropdowns
  function fillSelect(id, prefix, start, end) {
    const sel = document.getElementById(id);
    if (!sel) return;

    sel.innerHTML = ""; // safety clear

    for (let i = start; i <= end; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = prefix + i;
      sel.appendChild(opt);
    }
  }

  /* ---------- STRING SEARCH DROPDOWNS ---------- */
  fillSelect("itcSelect", "ITC-", 1, 20);
  fillSelect("invSelect", "INV-", 1, 4);
  fillSelect("scbSelect", "SCB-", 1, 18);
  fillSelect("stringSelect", "S", 1, 19);

  /* ---------- SCB SEARCH DROPDOWNS ---------- */
  fillSelect("itcSelectScb", "ITC-", 1, 20);
  fillSelect("invSelectScb", "INV-", 1, 4);
  fillSelect("scbSelectOnly", "SCB-", 1, 18);
});


// ================= STRING SEARCH =================
function searchString() {
  const itc = document.getElementById("itcSelect").value;
  const inv = document.getElementById("invSelect").value;
  const scb = document.getElementById("scbSelect").value;
  const str = document.getElementById("stringSelect").value;

  const target = `ITC${itc}-INV${inv}-SCB${scb}-S${str}`;
  let found = false;

  trackerLayer.eachLayer(layer => {
    const f = layer.feature;
    if (!f || !f.properties) return;

    const p = f.properties;

    if (
      p.string_1 === target ||
      p.string_2 === target ||
      p.string_3 === target ||
      p.string_4 === target
    ) {
      let center;

      // ✅ SAFE geometry handling
      if (layer.getLatLng) {
        center = layer.getLatLng(); // Point
      } else if (layer.getBounds) {
        center = layer.getBounds().getCenter(); // Polygon / Buffer
      } else {
        return;
      }

      map.setView(center, 19);
      layer.openPopup();
      found = true;
    }
  });

  if (!found) {
    alert("❌ String not found:\n" + target);
  }
}


// ================= SCB SEARCH =================
function searchSCB() {
  const itc = document.getElementById("itcSelectScb").value;
  const inv = document.getElementById("invSelectScb").value;
  const scb = document.getElementById("scbSelectOnly").value;

  const target = `SCB ${itc}.${inv}.${pad2(scb)}`;
  let found = false;

  scbLayer.eachLayer(layer => {
    const f = layer.feature;
    if (!f || !f.properties) return;

    if (f.properties.Name === target) {
      const center = layer.getLatLng
        ? layer.getLatLng()
        : layer.getBounds().getCenter();

      map.setView(center, 19);
      layer.openPopup();
      found = true;
    }
  });

  if (!found) {
    alert("❌ SCB not found:\n" + target);
  }
}
// ================= ROBO SEARCH =================
function searchRobo() {
  const input = document.getElementById("roboSearchInput");
  if (!input) return;

  const targetRobo = input.value.trim();
  if (!targetRobo) {
    alert("Please enter Robo ID");
    return;
  }

  let found = false;
  let bounds = [];

  trackerLayer.eachLayer(layer => {
    const f = layer.feature;
    if (!f || !f.properties) return;

    const roboStr = f.properties.robo_ids;
    if (!roboStr) {
      // reset color
      layer.setStyle({ color: "blue", fillColor: "blue" });
      return;
    }

    // Convert "2005,2006" → ["2005","2006"]
    const roboList = roboStr.split(",").map(r => r.trim());

    if (roboList.includes(targetRobo)) {
      // ✅ Highlight match
      layer.setStyle({
        color: "orange",
        fillColor: "orange"
      });

      // collect bounds
      if (layer.getLatLng) {
        bounds.push(layer.getLatLng());
      } else if (layer.getBounds) {
        bounds.push(layer.getBounds().getCenter());
      }

      found = true;
    } else {
      // reset non-matching
      layer.setStyle({ color: "blue", fillColor: "blue" });
    }
  });

  if (found && bounds.length > 0) {
    const group = L.featureGroup(
      bounds.map(latlng => L.marker(latlng))
    );
    map.fitBounds(group.getBounds(), { padding: [40, 40] });
  }

  if (!found) {
    alert("❌ Robo ID not found: " + targetRobo);
  }
}
// remove Leaflet prefix
map.attributionControl.setPrefix(false);

// add your copyright
map.attributionControl.addAttribution(
  "© 2026 <b>Ruchit Saxena</b> | All Rights Reserved | Solar Farm"
);

function searchTracker(){

var trackerID = document.getElementById("trackerSearchInput").value.trim();
var found = false;

trackerLayer.eachLayer(function(layer){

if(layer.feature.properties.tracker_id == trackerID){

var center = layer.getLatLng ? layer.getLatLng() : layer.getBounds().getCenter();

map.setView(center, 19);

layer.setStyle({
color: "yellow",
weight: 5
});

layer.openPopup();

found = true;

}

});

if(!found){
alert("❌ Tracker ID not found: " + trackerID);
}

}

function searchNode(){

var nodeID = document.getElementById("nodeSearchInput").value.trim().toUpperCase();
var found = false;

trackerLayer.eachLayer(function(layer){

var layerNode = layer.feature.properties.node_id;

if(layerNode && layerNode.toUpperCase() === nodeID){

var center = layer.getLatLng ? layer.getLatLng() : layer.getBounds().getCenter();

map.setView(center, 19);

layer.setStyle({
color: "red",
weight: 5
});

layer.openPopup();

found = true;

}

});

if(!found){
alert("❌ Node ID not found: " + nodeID);
}

}
  
/* ================= ROBOT CLEANING DATA ================= */

let cleaningData = [];

fetch("data/robot_cleaning.json")
.then(r => r.json())
.then(data => {
cleaningData = data;
populateGatewayDropdown();
})
.catch(err => console.error("Cleaning data error:", err));

function populateGatewayDropdown(){

const sel = document.getElementById("gatewaySelect");
if(!sel) return;

let gateways = [...new Set(cleaningData.map(d => d.Gateway_Adjusted))];

sel.innerHTML = "";

gateways.forEach(g => {

let opt = document.createElement("option");
opt.value = g;
opt.textContent = "Gateway " + g;

sel.appendChild(opt);

});

}

document.addEventListener("DOMContentLoaded", () => {

const gatewaySel = document.getElementById("gatewaySelect");
if(!gatewaySel) return;

gatewaySel.addEventListener("change", function(){

const selectedGateways =
[...this.selectedOptions].map(o => o.value);

const robotSel = document.getElementById("robotSelect");

robotSel.innerHTML = "";

let robots = cleaningData
.filter(d => selectedGateways.includes(String(d.Gateway_Adjusted)))
.map(d => d.Robo_ID);

robots = [...new Set(robots)];

robots.forEach(r => {

let opt = document.createElement("option");
opt.value = r;
opt.textContent = "Robot " + r;
opt.selected = true;

robotSel.appendChild(opt);

});

});

});

function generateCleaningReport(){

let robots = [...document.getElementById("robotSelect").selectedOptions]
.map(o => o.value);

let filtered = cleaningData.filter(d => {

if(robots.length) return robots.includes(String(d.Robo_ID));

});

let totalDC = 0;

filtered.forEach(r => {
totalDC += Number(r["DC capacity clean"] || 0);
});

document.getElementById("cleanResult").innerHTML = `
<b>Total Records:</b> ${filtered.length}<br>
<b>Total DC Cleaned:</b> ${totalDC.toFixed(2)} MWp
`;

}

function downloadCleaningExcel(){

let robots = [...document.getElementById("robotSelect").selectedOptions]
.map(o => o.value);

let filtered = cleaningData.filter(d => {

if(robots.length) return robots.includes(String(d.Robo_ID));

});

if(filtered.length === 0){
alert("No data to export");
return;
}

let worksheet = XLSX.utils.json_to_sheet(filtered);
let workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaning Data");

XLSX.writeFile(workbook, "robot_cleaning_report.xlsx");

}


















