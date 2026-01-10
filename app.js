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
      L.geoJSON(data, options).addTo(map);
      console.log(label + " loaded");
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
      onEachFeature: (f, l) =>
        l.bindPopup(`
          <b>Tracker ID:</b> ${f.properties.tracker_id}<br>
          <b>ITC:</b> ${f.properties.Layer}<br>
          <b>Robo IDs:</b> ${f.properties.robo_ids}<br>
          <b>String 1:</b> ${f.properties.string_1 || ""}<br>
          <b>String 2:</b> ${f.properties.string_2 || ""}<br>
          <b>String 3:</b> ${f.properties.string_3 || ""}<br>
          <b>String 4:</b> ${f.properties.string_4 || ""}
        `)
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
    style: {
      color: itcColors[i % itcColors.length],
      weight: 1
    }
  }, `ITC-${i} Strings`);
}

// ================= SEARCH UI INIT =================
document.addEventListener("DOMContentLoaded", () => {

  function fill(id, prefix, start, end) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    for (let i = start; i <= end; i++) {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = prefix + i;
      el.appendChild(o);
    }
  }

  fill("itcSelect", "ITC-", 1, 20);
  fill("invSelect", "INV-", 1, 4);
  fill("scbSelect", "SCB-", 1, 18);
  fill("stringSelect", "S", 1, 19);

  fill("itcSelectScb", "ITC-", 1, 20);
  fill("invSelectScb", "INV-", 1, 4);
  fill("scbSelectOnly", "SCB-", 1, 18);
});

// ================= STRING SEARCH =================
function searchString() {
  const target =
    `ITC${itcSelect.value}-INV${invSelect.value}-SCB${scbSelect.value}-S${stringSelect.value}`;

  let found = false;

  trackerLayer.eachLayer(l => {
    const p = l.feature.properties;
    if ([p.string_1, p.string_2, p.string_3, p.string_4].includes(target)) {
      const center = l.getLatLng();
      map.setView(center, 19);
      l.openPopup();
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

  scbLayer.eachLayer(l => {
    if (l.feature.properties.Name === target) {
      map.setView(l.getLatLng(), 19);
      l.openPopup();
      found = true;
    }
  });

  if (!found) alert("❌ SCB not found:\n" + target);
}

// ================= LOCATE ME BUTTON (FIXED) =================
let locateMarker = null;

document.getElementById("locateBtn").addEventListener("click", () => {

  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];

      if (locateMarker) map.removeLayer(locateMarker);

      locateMarker = L.circleMarker(latlng, {
        radius: 8,
        color: "green",
        fillColor: "green",
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup("📍 You are here")
        .openPopup();

      map.setView(latlng, 17);
    },
    () => alert("Unable to get location"),
    { enableHighAccuracy: true }
  );
});
