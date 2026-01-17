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
      onEachFeature: (f, l) => {
        l.bindPopup(`<b>SCB:</b> ${f.properties.Name || "NA"}`);

        // ✅ STORE TARGET LOCATION (ADDED)
        l.on("click", () => {
          window.lastSelectedLatLng = l.getLatLng();
        });
      }
    }).addTo(map);

    new L.Control.Search({
      layer: scbLayer,
      propertyName: "Name",
      marker: false,
      moveToLocation: latlng => map.setView(latlng, 18)
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

        // ✅ STORE TARGET LOCATION (ONLY LINE ADDED)
        l.on("click", () => {
          window.lastSelectedLatLng = l.getLatLng();
        });
      }
    }).addTo(map);

    new L.Control.Search({
      layer: trackerLayer,
      propertyName: "string_1",
      marker: false,
      moveToLocation: latlng => map.setView(latlng, 18)
    }).addTo(map);
  });

// ================= GPS + DIRECTION =================
let userMarker = null;
let arrowMarker = null;
let directionLine = null;
let currentTarget = null;

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

navigator.geolocation.watchPosition(pos => {
  const latlng = [pos.coords.latitude, pos.coords.longitude];

  if (!userMarker) {
    userMarker = L.circleMarker(latlng, {
      radius: 7,
      color: "green",
      fillOpacity: 0.9
    }).addTo(map).bindPopup("📍 You are here");
  } else {
    userMarker.setLatLng(latlng);
  }

  if (window.lastSelectedLatLng) {
    currentTarget = window.lastSelectedLatLng;

    if (directionLine) map.removeLayer(directionLine);
    if (arrowMarker) map.removeLayer(arrowMarker);

    const dist = getDistance(
      latlng[0], latlng[1],
      currentTarget.lat, currentTarget.lng
    ).toFixed(1);

    const bearing = getBearing(
      latlng[0], latlng[1],
      currentTarget.lat, currentTarget.lng
    );

    directionLine = L.polyline([latlng, currentTarget], {
      color: "red",
      dashArray: "6,6"
    }).addTo(map);

    arrowMarker = L.marker(latlng, {
      icon: L.divIcon({
        html: `<div style="font-size:28px;color:red;transform:rotate(${bearing}deg)">➤</div>`
      })
    }).addTo(map).bindPopup(`➡️ Distance: <b>${dist} m</b>`);
  }
});
