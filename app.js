// ================= MAP =================
const map = L.map("map").setView([28.15, 73.13], 12);

// Base map (online)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// ================= UTILITY =================
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

fetch("scb.geojson")
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

// ================= GPS / LIVE LOCATION =================
map.locate({ setView: false });

map.on("locationfound", e => {
  L.circleMarker(e.latlng, {
    radius: 7,
    color: "green",
    fillOpacity: 0.8
  })
    .bindPopup("📍 You are here")
    .addTo(map);
});

map.on("locationerror", () => {
  console.warn("Location access denied");
});

