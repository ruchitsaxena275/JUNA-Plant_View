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
      l.on("click", () => {
    window.lastSelectedLatLng = l.getLatLng();
  });
}
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
  <b>ITC:</b> ${f.properties.Layer}<br>
  <b>Robo IDs:</b> ${f.properties.robo_ids}<br>
  <b>String 1:</b> ${f.properties.string_1 || ""}<br>
  <b>String 2:</b> ${f.properties.string_2 || ""}<br>
  <b>String 3:</b> ${f.properties.string_3 || ""}<br>
  <b>String 4:</b> ${f.properties.string_4 || ""}<br><br>

  <button onclick="navigateTo(${l.getLatLng().lat}, ${l.getLatLng().lng})">
    ➡️ Navigate
  </button>
`);
      }
      l.on("click", () => {
  window.lastSelectedLatLng = l.getLatLng();
});
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

  updateDirection([lat, lng]);
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
// ================= DIRECTION NAVIGATION (ADD AT END) =================

// Globals
let directionLine = null;
let arrowMarker = null;

// Helpers
function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

// Distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bearing (direction)
function getBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Draw arrow + distance
function updateDirection(userLatLng) {
  if (!window.lastSelectedLatLng) return;

  const target = window.lastSelectedLatLng;

  if (directionLine) map.removeLayer(directionLine);
  if (arrowMarker) map.removeLayer(arrowMarker);

  const dist = getDistance(
    userLatLng[0], userLatLng[1],
    target.lat, target.lng
  ).toFixed(1);

  const bearing = getBearing(
    userLatLng[0], userLatLng[1],
    target.lat, target.lng
  );

  directionLine = L.polyline([userLatLng, target], {
    color: "red",
    dashArray: "6,6",
    weight: 3
  }).addTo(map);

  arrowMarker = L.marker(userLatLng, {
    icon: L.divIcon({
      className: "",
      html: `<div style="
        font-size:28px;
        color:red;
        transform:rotate(${bearing}deg);
      ">➤</div>`
    })
  }).addTo(map)
    .bindPopup(`➡️ Distance: <b>${dist} m</b>`);
}
// ================= NAVIGATE BUTTON HANDLER =================
function navigateTo(lat, lng) {
  window.lastSelectedLatLng = L.latLng(lat, lng);

  // Optional: zoom slightly if needed
  map.setView([lat, lng], Math.max(map.getZoom(), 18));
}









