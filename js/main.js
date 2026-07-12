var map = L.map("map", {
  minZoom: 3,
  maxZoom: 8,
  zoomControl: true
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

var worldPopLayer = L.tileLayer("tiles/worldpop/{z}/{x}/{y}.png", {
    opacity: 0.65,
    maxZoom: 8,
    minZoom: 3
});

function getScore(p) {
  if (!p) return null;

  const key = Object.keys(p).find(k => {
    const s = String(k).toLowerCase();
    return s.includes("aggreg") && s.includes("2018");
  });

  if (!key) return null;

  const n = Number(p[key]);
  return Number.isFinite(n) ? n : null;
}

function getName(p) {
  return p.name ?? p.NAME ?? p.NAME_EN ?? p.admin ?? p.nam_en ?? "Unknown";
}

function getColor(score) {
  if (score === null) return "#eeeeee";

  return score > 84   ? "#7a003c" :
         score > 81.3 ? "#c4005a" :
         score > 77.7 ? "#f03b87" :
         score > 68.2 ? "#f6a6c9" :
                        "#f2e6ef";
}

function style(feature) {
  const score = getScore(feature.properties || {});

  return {
    fillColor: getColor(score),
    weight: 1,
    color: "#333",
    fillOpacity: 0.85
  };
}

var geojson;
let selectedCountries = [];
let selectedLayers = [];

const selectedCountriesDiv = document.getElementById("selectedCountries");
const averageResultDiv = document.getElementById("averageResult");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const nearestCountriesDiv = document.getElementById("nearestCountries");

function highlightFeature(e) {
  e.target.setStyle({
    weight: 2,
    color: "#000",
    fillOpacity: 1
  });
  e.target.bringToFront();
}

function resetHighlight(e) {
  if (geojson) geojson.resetStyle(e.target);
}

function getBinIndex(score) {
  if (score === null || score === undefined || score === "") return null;
  score = Number(score);

  if (score <= 68.2) return 0;
  if (score <= 77.7) return 1;
  if (score <= 81.3) return 2;
  if (score <= 84) return 3;
  return 4;
}

function highlightLegend(binIndex) {
  document.querySelectorAll(".legend .legend-row").forEach(row => {
    row.classList.remove("active");
  });

  if (binIndex === null) return;

  const row = document.querySelector(`.legend .legend-row[data-bin="${binIndex}"]`);
  if (row) row.classList.add("active");
}

function selectCountry(name, score, layer) {
  if (score === null) return;

  if (selectedCountries.length === 2) {
    clearSelection();
  }

  selectedCountries.push({ name, score });
  selectedLayers.push(layer);

  layer.setStyle({
    weight: 3,
    color: "#000",
    fillOpacity: 1
  });

  updateSelectionPanel();
}

function updateSelectionPanel() {
  if (selectedCountries.length === 0) {
    selectedCountriesDiv.innerHTML = "No country selected yet.";
    averageResultDiv.innerHTML = "";
    return;
  }

  selectedCountriesDiv.innerHTML = selectedCountries
    .map(c => `${c.name}: ${c.score.toFixed(2)}`)
    .join("<br>");

  if (selectedCountries.length === 2) {
    const avg = (selectedCountries[0].score + selectedCountries[1].score) / 2;
    averageResultDiv.innerHTML = "Average Score: " + avg.toFixed(2);
  } else {
    averageResultDiv.innerHTML = "";
  }
}

function clearSelection() {
  selectedLayers.forEach(layer => {
    geojson.resetStyle(layer);
  });

  selectedCountries = [];
  selectedLayers = [];

  nearestCountriesDiv.innerHTML = "Click a country to list the three nearest countries.";
  updateSelectionPanel();
}

if (clearSelectionBtn) {
  clearSelectionBtn.addEventListener("click", clearSelection);
}

function findNearestCountriesToLayer(selectedLayer, selectedName) {
  if (!geojson) return;

  const selectedCenter = selectedLayer.getBounds().getCenter();
  let distances = [];

  geojson.eachLayer(function (layer) {
    const p = layer.feature.properties || {};
    const name = getName(p);

    if (name === selectedName) return;

    const center = layer.getBounds().getCenter();
    const distance = selectedCenter.distanceTo(center) / 1000;

    distances.push({ name, distance });
  });

  distances.sort((a, b) => a.distance - b.distance);

  nearestCountriesDiv.innerHTML =
    "<b>Nearest countries to " + selectedName + ":</b><br>" +
    distances
      .slice(0, 3)
      .map((c, i) => `${i + 1}. ${c.name} – ${c.distance.toFixed(1)} km`)
      .join("<br>");
}

function onEachFeature(feature, layer) {
  const p = feature.properties || {};
  const name = getName(p);
  const score = getScore(p);

  layer.bindPopup(
    "<b>" + name + "</b><br>" +
    "SDG 4 (Girls, 2018): " +
    (score === null ? "No data" : score.toFixed(2))
  );

  layer.on("click", function () {
    const bin = getBinIndex(score);
    highlightLegend(bin);

    selectCountry(name, score, layer);
    findNearestCountriesToLayer(layer, name);
  });

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}

fetch("data/sdg4_girls_literacy_2018.geojson")
  .then(response => response.json())
  .then(data => {
    geojson = L.geoJson(data, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    map.fitBounds(geojson.getBounds());
    worldPopLayer.addTo(map);
    map.setMaxBounds(geojson.getBounds());
    map.options.maxBoundsViscosity = 1.0;
  });

var legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
  var div = L.DomUtil.create("div", "legend");

  div.innerHTML = `
    <h4>SDG 4 (Girls, 2018)</h4>

    <div class="legend-row" data-bin="0">
      <i style="background:${getColor(50)}"></i> 41.9 – 68.2
    </div>

    <div class="legend-row" data-bin="1">
      <i style="background:${getColor(70)}"></i> 68.2 – 77.7
    </div>

    <div class="legend-row" data-bin="2">
      <i style="background:${getColor(79)}"></i> 77.7 – 81.3
    </div>

    <div class="legend-row" data-bin="3">
      <i style="background:${getColor(82)}"></i> 81.3 – 84
    </div>

    <div class="legend-row" data-bin="4">
      <i style="background:${getColor(90)}"></i> 84+
    </div>

    <div style="font-size:12px; line-height:1.4; color:#444; margin-top:10px;">
      <b>Data source:</b> United Nations SDG 4 Dataset (2018)<br>
      <b>Basemap:</b> OpenStreetMap<br>
      <b>Author:</b> Janeda Baysal
    </div>
  `;

  return div;
};

legend.addTo(map);

var title = L.control({ position: "topleft" });

title.onAdd = function () {
  var div = L.DomUtil.create("div", "map-title");
  div.innerHTML = "SDG 4 – Girls’ Literacy Achievement in Europe (2018)";
  return div;
};

title.addTo(map);

L.control.scale({
  position: "bottomleft",
  metric: true,
  imperial: false
}).addTo(map);


// ======================================
// COUNTRY SEARCH
// ======================================

var searchControl = L.Control.geocoder({
  defaultMarkGeocode: false,
  placeholder: "Search a country...",
  position: "topright"
})
  .on("markgeocode", function (e) {
    if (!geojson) return;

    const searchedName = e.geocode.name.toLowerCase();
    let matchedLayer = null;

    geojson.eachLayer(function (layer) {
      const countryName = getName(
        layer.feature.properties || {}
      ).toLowerCase();

      if (
        searchedName.includes(countryName) ||
        countryName.includes(searchedName)
      ) {
        matchedLayer = layer;
      }
    });

    if (matchedLayer) {
      map.fitBounds(matchedLayer.getBounds(), {
        padding: [40, 40],
        maxZoom: 6
      });

      matchedLayer.openPopup();
    } else if (e.geocode.bbox) {
      map.fitBounds(e.geocode.bbox);
    }
  })
  .addTo(map);


// ======================================
// HOME / RESET VIEW BUTTON
// ======================================

var HomeControl = L.Control.extend({
  options: {
    position: "topleft"
  },

  onAdd: function () {
    var container = L.DomUtil.create(
      "button",
      "leaflet-bar home-button"
    );

    container.innerHTML = "⌂";
    container.title = "Reset map view";
    container.type = "button";

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    container.addEventListener("click", function () {
      if (!geojson) return;

      map.fitBounds(geojson.getBounds());

      clearSelection();

      nearestCountriesDiv.innerHTML =
        "Click a country to list the three nearest countries.";

      document
        .querySelectorAll(".legend .legend-row")
        .forEach(row => row.classList.remove("active"));

      map.closePopup();
    });

    return container;
  }
});

map.addControl(new HomeControl());
