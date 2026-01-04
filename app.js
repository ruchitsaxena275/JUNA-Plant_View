const map = L.map("map").setView([28.15, 73.13], 12);

// Base map (optional – will fail offline but OK)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// Utility loader
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

// Boundary
loadGeoJSON("data/Boundary.geojson", {
  style: { color: "black", weight: 2 }
}, "Boundary");

// Roads
loadGeoJSON("data/Road.geojson", {
  style: { color: "gray", weight: 1 }
}, "Road");

// SCB points
loadGeoJSON("data/SCB.geojson", {
  pointToLayer: (f, latlng) =>
    L.circleMarker(latlng, {
      radius: 5,
      color: "red",
      fillOpacity: 0.8
    }),
  onEachFeature: (f, l) =>
    l.bindPopup(`<b>SCB:</b> ${f.properties.Name || "NA"}`)
}, "SCB");

// Tracker points
loadGeoJSON("data/tracker_points.geojson", {
  pointToLayer: (f, latlng) =>
    L.circleMarker(latlng, {
      radius: 3,
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
}, "Trackers");

// Load all ITC string files
for (let i = 1; i <= 20; i++) {
  loadGeoJSON(`data/ITC-${i}_strings.geojson`, {
    style: { color: "orange", weight: 1 }
  }, `ITC-${i} Strings`);
}
