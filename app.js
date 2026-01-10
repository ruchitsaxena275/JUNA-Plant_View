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
    .then(r => r.json())
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
      pointToLayer: (_, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: "red",
          fillOpacity: 0.9
        }),
      onEachFeature: (f, l) =>
        l.bindPopup(`<b>SCB:</b> ${f.properties.Name}`)
    }).addTo(map);
  });

// ================= ITC NUMBERS =================
fetch("data/Power_station_numbers.geojson")
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (_, latlng) =>
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
          className: "itc-label"
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
      pointToLayer: (_, latlng) =>
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
          <b>String 1:</b> ${f.properties.string_1}<br>
          <b>String 2:</b> ${f.properties.string_2}<br>
          <b>String 3:</b> ${f.properties.string_3}<br>
          <b>String 4:</b> ${f.properties.string_4}
        `);
      }
    }).addTo(map);
  });

// ================= ITC STRINGS =================
for (let i = 1; i <= 20; i++) {
  loadGeoJSON(`data/ITC-${i}_strings.geojson`, {
    style: { weight: 1 }
  }, `ITC-${i} Strings`);
}

// ================= STRING SEARCH =================
function searchString() {
  const itc = itcSelect.value;
  const inv = invSelect.value;
  const scb = scbSelect.value;
  const s = stringSelect.value;

  const target = `ITC${itc}-INV${inv}-SCB${scb}-S${s}`;
  let found = false;

  trackerLayer.eachLayer(l => {
    const p = l.feature.properties;
    if ([p.string_1, p.string_2, p.string_3, p.string_4].includes(target)) {
      map.setView(l.getLatLng(), 19);
      l.openPopup();
      found = true;
    }
  });

  if (!found) alert("❌ String not found:\n" + target);
}

// ================= SCB SEARCH =================
function searchSCB() {
  const itc = itcSelectScb.value;
  const inv = invSelectScb.value;
  const scb = pad2(scbSelectOnly.value);

  const target = `SCB ${itc}.${inv}.${scb}`;
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

// ================= LOCATE ME (ONLY ON CLICK) =================
let locateMarker = null;

document.getElementById("locateBtn").addEventListener("click", () => {

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
    () => alert("Location not available"),
    { enableHighAccuracy: true }
  );
});
