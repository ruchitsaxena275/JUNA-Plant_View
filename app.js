// ================= MAP =================
const map = L.map("map").setView([28.15, 73.13], 12);

// ================= MOBILE ZOOM STABILITY FIX =================
let userInteracted = false;

// Detect user interaction (pinch / drag / zoom)
map.on("zoomstart dragstart touchstart", () => {
  userInteracted = true;
});

// Prevent mobile snap-back zoom
map.options.zoomSnap = 0;
map.options.zoomDelta = 0.25;
map.options.inertia = false;

// Fix mobile resize zoom jump
setTimeout(() => {
  map.invalidateSize();
}, 500);

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

    new L.Control.Search({
      layer: scbLayer,
      propertyName: "Name",
      marker: false,
      moveToLocation: latlng => map.setView(latlng, 18)
    }).addTo(map);
  });

// ================= POWER STATION / ITC NUMBERS =================
fetch("data/Power_station_numbers.geojson")
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: "#000",
          weight: 1,
          fillColor: "#FFD700",
          fillOpacity: 1
        }),
      onEachFeature: (f, l) =>
        l.bindTooltip(f.properties.Name, {
          permanent: true,
          direction: "center",
          className: "itc-label"
        })
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

    new L.Control.Search({
      layer: trackerLayer,
      propertyName: "string_1",
      marker: false,
      moveToLocation: latlng => map.setView(latlng, 18)
    }).addTo(map);
  });

// ================= ITC STRINGS =================
const itcColors = [
  "#ff7f0e", "#2ca02c", "#9467bd", "#1f77b4",
  "#d62728", "#8c564b", "#e377c2", "#7f7f7f",
  "#bcbd22", "#17becf"
];

for (let i = 1; i <= 20; i++) {
  loadGeoJSON(`data/ITC-${i}_strings.geojson`, {
    style: { color: itcColors[i % itcColors.length], weight: 1 }
  }, `ITC-${i} Strings`);
}

// ================= GPS (NO AUTO ZOOM) =================
let liveLocationMarker = L.circleMarker([0, 0], {
  radius: 7,
  color: "green",
  fillColor: "green",
  fillOpacity: 0.9
}).addTo(map);

function onLocationSuccess(position) {
  const latlng = [
    position.coords.latitude,
    position.coords.longitude
  ];

  liveLocationMarker
    .setLatLng(latlng)
    .bindPopup(`📍 You are here`);
}

function onLocationError(err) {
  console.warn("GPS error:", err.message);
}

if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    onLocationSuccess,
    onLocationError,
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

// ================= SEARCH UI LOGIC =================
document.addEventListener("DOMContentLoaded", () => {

  function fillSelect(id, prefix, start, end) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = "";
    for (let i = start; i <= end; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = prefix + i;
      sel.appendChild(opt);
    }
  }

  fillSelect("itcSelect", "ITC-", 1, 20);
  fillSelect("invSelect", "INV-", 1, 4);
  fillSelect("scbSelect", "SCB-", 1, 18);
  fillSelect("stringSelect", "S", 1, 19);

  fillSelect("itcSelectScb", "ITC-", 1, 20);
  fillSelect("invSelectScb", "INV-", 1, 4);
  fillSelect("scbSelectOnly", "SCB-", 1, 18);
});

// ================= STRING SEARCH =================
function searchString() {
  const target =
    `ITC${itcSelect.value}-INV${invSelect.value}-SCB${scbSelect.value}-S${stringSelect.value}`;

  let found = false;

  trackerLayer.eachLayer(layer => {
    const p = layer.feature.properties;
    if ([p.string_1, p.string_2, p.string_3, p.string_4].includes(target)) {
      const center = layer.getLatLng();
      if (!userInteracted) {
        map.flyTo(center, 19, { animate: true, duration: 0.6 });
      }
      layer.openPopup();
      found = true;
    }
  });

  if (!found) alert("❌ String not found:\n" + target);
}

// ================= SCB SEARCH =================
function searchSCB() {
  const target =
    `SCB ${itcSelectScb.value}.${invSelectScb.value}.${pad2(scbSelectOnly.value)}`;

  let found = false;

  scbLayer.eachLayer(layer => {
    if (layer.feature.properties.Name === target) {
      const center = layer.getLatLng();
      if (!userInteracted) {
        map.flyTo(center, 19, { animate: true, duration: 0.6 });
      }
      layer.openPopup();
      found = true;
    }
  });

  if (!found) alert("❌ SCB not found:\n" + target);
}
