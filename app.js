// ================= MAP =================
const map = L.map("map").setView([28.15, 73.13], 12);

// Base map
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

    console.log("SCB layer loaded");
  });

// ================= ITC NUMBERS =================
fetch("data/Power_station_numbers.geojson")
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: "#000",
          fillColor: "#FFD700",
          fillOpacity: 1
        }),
      onEachFeature: (f, l) => {
        l.bindTooltip(f.properties.Name, {
          permanent: true,
          direction: "center",
          className: "pb-label"
        });
      }
    }).addTo(map);
  });

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
          <b>ITC:</b> ${f.properties.Layer}<br>
          <b>Robo IDs:</b> ${f.properties.robo_ids}<br>
          <b>String 1:</b> ${f.properties.string_1 || ""}<br>
          <b>String 2:</b> ${f.properties.string_2 || ""}<br>
          <b>String 3:</b> ${f.properties.string_3 || ""}<br>
          <b>String 4:</b> ${f.properties.string_4 || ""}
        `);
      }
    }).addTo(map);

    console.log("Tracker points loaded");
  });

// ================= ITC STRINGS =================
const itcColors = [
  "#ff7f0e","#2ca02c","#9467bd","#1f77b4",
  "#d62728","#8c564b","#e377c2","#7f7f7f",
  "#bcbd22","#17becf"
];

for (let i = 1; i <= 20; i++) {
  loadGeoJSON(`data/ITC-${i}_strings.geojson`, {
    style: {
      color: itcColors[i % itcColors.length],
      weight: 1
    }
  }, `ITC-${i} Strings`);
}

// =================================================
// ================= FIX 3 (ROUTING CORE) ===========
// =================================================

let currentLocation = null;
let routeLine = null;

// Live GPS marker
const liveMarker = L.circleMarker([0, 0], {
  radius: 7,
  color: "green",
  fillOpacity: 0.9
}).addTo(map);

// GPS watcher
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    pos => {
      currentLocation = L.latLng(
        pos.coords.latitude,
        pos.coords.longitude
      );

      liveMarker
        .setLatLng(currentLocation)
        .bindPopup(`📍 You are here<br>Accuracy: ${pos.coords.accuracy.toFixed(1)} m`);
    },
    err => console.warn("GPS error:", err.message),
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}

// ROUTE FUNCTION (FIX-3)
function drawRouteToTarget(targetLatLng) {
  if (!currentLocation) {
    alert("📡 Waiting for GPS location...");
    return;
  }

  if (routeLine) {
    map.removeLayer(routeLine);
  }

  routeLine = L.polyline(
    [currentLocation, targetLatLng],
    {
      color: "red",
      weight: 5,
      dashArray: "8,6"
    }
  ).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
}

// ================= STRING SEARCH =================
function searchString() {
  const itc = document.getElementById("string-itc").value;
  const inv = document.getElementById("string-inv").value;
  const scb = document.getElementById("string-scb").value;
  const s   = document.getElementById("string-s").value;

  const target = `${itc}-${inv}-${scb}-${s}`;
  let found = null;

  trackerLayer.eachLayer(l => {
    const p = l.feature?.properties;
    if (!p) return;

    if ([p.string_1,p.string_2,p.string_3,p.string_4].includes(target)) {
      found = l;
    }
  });

  if (!found) {
    alert("❌ String not found:\n" + target);
    return;
  }

  const targetLatLng = found.getLatLng();
  found.openPopup();
  map.setView(targetLatLng, 19);

  drawRouteToTarget(targetLatLng);
}

// ================= SCB SEARCH =================
function searchSCB() {
  const itc = document.getElementById("scb-itc").value.replace("ITC-","");
  const inv = document.getElementById("scb-inv").value.replace("INV-","");
  let scb   = document.getElementById("scb-scb").value.replace("SCB-","");

  scb = pad2(scb);
  const target = `SCB ${itc}.${inv}.${scb}`;

  let found = null;

  scbLayer.eachLayer(l => {
    if (l.feature?.properties?.Name === target) {
      found = l;
    }
  });

  if (!found) {
    alert("❌ SCB not found:\n" + target);
    return;
  }

  const targetLatLng = found.getLatLng();
  found.openPopup();
  map.setView(targetLatLng, 19);

  drawRouteToTarget(targetLatLng);
}
