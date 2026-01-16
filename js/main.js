// ======================================
// SDG 4 – Girls’ Literacy (from CLEAN GeoJSON)
// ======================================

// 1) Create map
var map = L.map("map", {
  minZoom: 3,
  maxZoom: 8,
  zoomControl: true
});

// 2) Basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// ---------- Helpers (use YOUR real fields) ----------
function getScore(p) {
  if (!p) return null;

  // keys içinde "aggregated" ve "2018" geçen ilk alanı yakala
  const key = Object.keys(p).find(k => {
    const s = String(k).toLowerCase();
    return s.includes("aggreg") && s.includes("2018");
  });

  if (!key) return null;

  const n = Number(p[key]);
  return Number.isFinite(n) ? n : null;
}


function getName(p) {
  // keep multiple options just in case
  return p.name ?? p.NAME ?? p.NAME_EN ?? p.admin ?? p.nam_en ?? "Unknown";
}

// 3) Color scale
function getColor(score) {
  if (score === null) return "#eeeeee";

  return score > 84   ? "#7a003c" :
         score > 81.3 ? "#c4005a" :
         score > 77.7 ? "#f03b87" :
         score > 68.2 ? "#f6a6c9" :
                        "#f2e6ef";
}

// 4) Style
function style(feature) {
  var p = feature.properties || {};
  var score = getScore(p);

  return {
    fillColor: getColor(score),
    weight: 1,
    color: "#333",
    fillOpacity: 0.85
  };
}

var geojson;

// 5) Hover
function highlightFeature(e) {
  var layer = e.target;
  layer.setStyle({
    weight: 2,
    color: "#000",
    fillOpacity: 1
  });
  layer.bringToFront();
}

function resetHighlight(e) {
  if (geojson) geojson.resetStyle(e.target);
}

// 6) Popup + Labels
function onEachFeature(feature, layer) {
  var p = feature.properties || {};
  var name = getName(p);
  var score = getScore(p);

  layer.bindPopup(
    "<b>" + name + "</b><br>" +
    "SDG 4 (Girls, 2018): " +
    (score === null ? "No data" : score.toFixed(2))
  );

  // country name label (always visible)
  layer.bindTooltip(name, {
    permanent: true,
    direction: "center",
    className: "country-label"
  });
  // 🔹 LEGEND’i ülkeye tıklayınca güncelle
  layer.on("click", function () {
    const bin = getBinIndex(score);
    highlightLegend(bin);
  });

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}

// 7) Load CLEAN GeoJSON (already Europe only)
fetch("data/sdg4_girls_literacy_2018.geojson")
  .then(r => r.json())
  .then(data => {
    geojson = L.geoJson(data, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    // zoom to your cleaned layer
    map.fitBounds(geojson.getBounds());

    // lock map to that extent
    map.setMaxBounds(geojson.getBounds());
    map.options.maxBoundsViscosity = 1.0;
  });

// 8) Legend
function getBinIndex(score) {
  if (score === null || score === undefined || score === "") return null;
  score = Number(score);

  if (score <= 68.2) return 0;
  if (score <= 77.7) return 1;
  if (score <= 81.3) return 2;
  if (score <= 84)   return 3;
  return 4;
}

function highlightLegend(binIndex) {
  document.querySelectorAll(".legend .legend-row").forEach(r => r.classList.remove("active"));
  if (binIndex === null) return;

  const row = document.querySelector(`.legend .legend-row[data-bin="${binIndex}"]`);
  if (row) row.classList.add("active");
}

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
  `;

  return div;
};


legend.addTo(map);

// 9) Title
var title = L.control({ position: "topleft" });

title.onAdd = function () {
  var div = L.DomUtil.create("div", "map-title");
  div.innerHTML = "SDG 4 – Girls’ Literacy Achievement in Europe (2018)";
  return div;
};

title.addTo(map);

// Close welcome modal
const modal = document.getElementById("welcomeModal");
const closeBtn = document.getElementById("closeModalBtn");

if (closeBtn && modal) {
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });
}
