// ======================================
// 1. CREATE MAP
// ======================================

var map = L.map("map", {
  minZoom: 3,
  maxZoom: 8,
  zoomControl: true
});


// ======================================
// 2. BASEMAP
// ======================================

var openStreetMap = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors",
    minZoom: 3,
    maxZoom: 8
  }
).addTo(map);


// ======================================
// 3. WORLDPOP RASTER LAYER
// ======================================

var worldPopLayer = L.tileLayer(
  "tiles/worldpop/{z}/{x}/{y}.png",
  {
    attribution: "WorldPop Population Data (2018)",
    opacity: 0.65,
    minZoom: 3,
    maxZoom: 8
  }
);


// ======================================
// 4. HELPER FUNCTIONS
// ======================================

function getScore(properties) {
  if (!properties) return null;

  const key = Object.keys(properties).find(function (fieldName) {
    const normalizedName = String(fieldName).toLowerCase();

    return (
      normalizedName.includes("aggreg") &&
      normalizedName.includes("2018")
    );
  });

  if (!key) return null;

  const value = Number(properties[key]);

  return Number.isFinite(value) ? value : null;
}

function getName(properties) {
  return (
    properties.name ??
    properties.NAME ??
    properties.NAME_EN ??
    properties.admin ??
    properties.nam_en ??
    "Unknown"
  );
}


// ======================================
// 5. CHOROPLETH COLORS AND STYLE
// ======================================

function getColor(score) {
  if (score === null) return "#eeeeee";

  return score > 84
    ? "#7a003c"
    : score > 81.3
    ? "#c4005a"
    : score > 77.7
    ? "#f03b87"
    : score > 68.2
    ? "#f6a6c9"
    : "#f2e6ef";
}

function countryStyle(feature) {
  const score = getScore(feature.properties || {});

  return {
    fillColor: getColor(score),
    weight: 1,
    color: "#333333",
    fillOpacity: 0.85
  };
}


// ======================================
// 6. GLOBAL VARIABLES
// ======================================

var geojson;
var layerControl;

let selectedCountries = [];
let selectedLayers = [];

const selectedCountriesDiv =
  document.getElementById("selectedCountries");

const averageResultDiv =
  document.getElementById("averageResult");

const clearSelectionBtn =
  document.getElementById("clearSelectionBtn");

const nearestCountriesDiv =
  document.getElementById("nearestCountries");


// ======================================
// 7. HOVER EFFECT
// ======================================

function highlightFeature(event) {
  const layer = event.target;

  layer.setStyle({
    weight: 2,
    color: "#000000",
    fillOpacity: 1
  });

  layer.bringToFront();
}

function resetHighlight(event) {
  if (!geojson) return;

  const layer = event.target;
  const isSelected = selectedLayers.includes(layer);

  if (isSelected) {
    layer.setStyle({
      weight: 3,
      color: "#000000",
      fillOpacity: 1
    });

    layer.bringToFront();
  } else {
    geojson.resetStyle(layer);
  }
}


// ======================================
// 8. LEGEND FUNCTIONS
// ======================================

function getBinIndex(score) {
  if (
    score === null ||
    score === undefined ||
    score === ""
  ) {
    return null;
  }

  const numericScore = Number(score);

  if (numericScore <= 68.2) return 0;
  if (numericScore <= 77.7) return 1;
  if (numericScore <= 81.3) return 2;
  if (numericScore <= 84) return 3;

  return 4;
}

function highlightLegend(binIndex) {
  document
    .querySelectorAll(".legend .legend-row")
    .forEach(function (row) {
      row.classList.remove("active");
    });

  if (binIndex === null) return;

  const activeRow = document.querySelector(
    `.legend .legend-row[data-bin="${binIndex}"]`
  );

  if (activeRow) {
    activeRow.classList.add("active");
  }
}

function clearLegendHighlight() {
  document
    .querySelectorAll(".legend .legend-row")
    .forEach(function (row) {
      row.classList.remove("active");
    });
}


// ======================================
// 9. COUNTRY SELECTION AND AVERAGE
// ======================================

function selectCountry(name, score, layer) {
  if (score === null) return;

  const alreadySelected = selectedLayers.includes(layer);

  if (alreadySelected) return;

  if (selectedCountries.length === 2) {
    clearSelection();
  }

  selectedCountries.push({
    name: name,
    score: score
  });

  selectedLayers.push(layer);

  layer.setStyle({
    weight: 3,
    color: "#000000",
    fillOpacity: 1
  });

  layer.bringToFront();

  updateSelectionPanel();
}

function updateSelectionPanel() {
  if (selectedCountries.length === 0) {
    selectedCountriesDiv.innerHTML =
      "No country selected yet.";

    averageResultDiv.innerHTML = "";

    return;
  }

  selectedCountriesDiv.innerHTML =
    selectedCountries
      .map(function (country) {
        return (
          country.name +
          ": " +
          country.score.toFixed(2)
        );
      })
      .join("<br>");

  if (selectedCountries.length === 2) {
    const average =
      (
        selectedCountries[0].score +
        selectedCountries[1].score
      ) / 2;

    averageResultDiv.innerHTML =
      "Average Score: " +
      average.toFixed(2);
  } else {
    averageResultDiv.innerHTML = "";
  }
}

function clearSelection() {
  if (geojson) {
    selectedLayers.forEach(function (layer) {
      geojson.resetStyle(layer);
    });
  }

  selectedCountries = [];
  selectedLayers = [];

  updateSelectionPanel();

  nearestCountriesDiv.innerHTML =
    "Click a country to list the three nearest countries.";

  clearLegendHighlight();

  map.closePopup();
}

if (clearSelectionBtn) {
  clearSelectionBtn.addEventListener(
    "click",
    clearSelection
  );
}


// ======================================
// 10. FIND THREE NEAREST COUNTRIES
// ======================================

function findNearestCountriesToLayer(
  selectedLayer,
  selectedName
) {
  if (!geojson) return;

  const selectedCenter =
    selectedLayer.getBounds().getCenter();

  const distances = [];

  geojson.eachLayer(function (layer) {
    const properties =
      layer.feature.properties || {};

    const countryName =
      getName(properties);

    if (countryName === selectedName) return;

    const countryCenter =
      layer.getBounds().getCenter();

    const distanceKm =
      selectedCenter.distanceTo(countryCenter) / 1000;

    distances.push({
      name: countryName,
      distance: distanceKm
    });
  });

  distances.sort(function (a, b) {
    return a.distance - b.distance;
  });

  const nearestThree =
    distances.slice(0, 3);

  nearestCountriesDiv.innerHTML =
    "<b>Nearest countries to " +
    selectedName +
    ":</b><br>" +
    nearestThree
      .map(function (country, index) {
        return (
          (index + 1) +
          ". " +
          country.name +
          " – " +
          country.distance.toFixed(1) +
          " km"
        );
      })
      .join("<br>");
}


// ======================================
// 11. COUNTRY EVENTS
// ======================================

function onEachFeature(feature, layer) {
  const properties =
    feature.properties || {};

  const countryName =
    getName(properties);

  const score =
    getScore(properties);

  layer.bindPopup(
    "<b>" +
      countryName +
      "</b><br>" +
      "SDG 4 (Girls, 2018): " +
      (
        score === null
          ? "No data"
          : score.toFixed(2)
      )
  );

  layer.on("click", function (event) {
    L.DomEvent.stopPropagation(event);

    const binIndex =
      getBinIndex(score);

    highlightLegend(binIndex);

    selectCountry(
      countryName,
      score,
      layer
    );

    findNearestCountriesToLayer(
      layer,
      countryName
    );
  });

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}


// ======================================
// 12. LOAD GEOJSON
// ======================================

fetch("data/sdg4_girls_literacy_2018.geojson")
  .then(function (response) {
    if (!response.ok) {
      throw new Error(
        "GeoJSON could not be loaded."
      );
    }

    return response.json();
  })
  .then(function (data) {
    geojson = L.geoJson(data, {
      style: countryStyle,
      onEachFeature: onEachFeature
    }).addTo(map);

    map.fitBounds(
      geojson.getBounds()
    );

    map.setMaxBounds(
      geojson.getBounds()
    );

    map.options.maxBoundsViscosity = 1.0;

    const baseMaps = {
      OpenStreetMap: openStreetMap
    };

    const overlayMaps = {
      "SDG 4 Girls' Literacy": geojson,
      "WorldPop Population Density": worldPopLayer
    };

    layerControl = L.control.layers(
      baseMaps,
      overlayMaps,
      {
        position: "topright",
        collapsed: true
      }
    ).addTo(map);
  })
  .catch(function (error) {
    console.error(error);

    alert(
      "The GeoJSON file could not be loaded."
    );
  });


// ======================================
// 13. LEGEND
// ======================================

var legend = L.control({
  position: "bottomright"
});

legend.onAdd = function () {
  const div = L.DomUtil.create(
    "div",
    "legend"
  );

  div.innerHTML = `
    <h4>SDG 4 (Girls, 2018)</h4>

    <div class="legend-row" data-bin="0">
      <i style="background:${getColor(50)}"></i>
      41.9 – 68.2
    </div>

    <div class="legend-row" data-bin="1">
      <i style="background:${getColor(70)}"></i>
      68.2 – 77.7
    </div>

    <div class="legend-row" data-bin="2">
      <i style="background:${getColor(79)}"></i>
      77.7 – 81.3
    </div>

    <div class="legend-row" data-bin="3">
      <i style="background:${getColor(82)}"></i>
      81.3 – 84
    </div>

    <div class="legend-row" data-bin="4">
      <i style="background:${getColor(90)}"></i>
      84+
    </div>

    <div
      style="
        font-size:12px;
        line-height:1.4;
        color:#444;
        margin-top:10px;
      "
    >
      <b>Vector data:</b>
      United Nations SDG 4 Dataset (2018)
      <br>

      <b>Raster data:</b>
      WorldPop Population Data (2018)
      <br>

      <b>Basemap:</b>
      OpenStreetMap
      <br>

      <b>Author:</b>
      Janeda Baysal
    </div>
  `;

  return div;
};

legend.addTo(map);


// ======================================
// 14. MAP TITLE
// ======================================

var title = L.control({
  position: "topleft"
});

title.onAdd = function () {
  const div = L.DomUtil.create(
    "div",
    "map-title"
  );

  div.innerHTML =
    "SDG 4 – Girls’ Literacy Achievement in Europe (2018)";

  return div;
};

title.addTo(map);


// ======================================
// 15. SCALE BAR
// ======================================

L.control.scale({
  position: "bottomleft",
  metric: true,
  imperial: false
}).addTo(map);


// ======================================
// 16. COUNTRY SEARCH
// ======================================

var searchControl =
  L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Search a country...",
    position: "topright"
  })
    .on(
      "markgeocode",
      function (event) {
        if (!geojson) return;

        const searchedName =
          event.geocode.name.toLowerCase();

        let matchedLayer = null;

        geojson.eachLayer(function (layer) {
          const countryName =
            getName(
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
          map.fitBounds(
            matchedLayer.getBounds(),
            {
              padding: [40, 40],
              maxZoom: 6
            }
          );

          matchedLayer.openPopup();
        } else if (event.geocode.bbox) {
          map.fitBounds(
            event.geocode.bbox
          );
        }
      }
    )
    .addTo(map);


// ======================================
// 17. HOME / RESET VIEW BUTTON
// ======================================

var HomeControl = L.Control.extend({
  options: {
    position: "topleft"
  },

  onAdd: function () {
    const container =
      L.DomUtil.create(
        "button",
        "leaflet-bar home-button"
      );

    container.innerHTML = "⌂";
    container.title =
      "Reset map view";

    container.type =
      "button";

    L.DomEvent.disableClickPropagation(
      container
    );

    L.DomEvent.disableScrollPropagation(
      container
    );

    container.addEventListener(
      "click",
      function () {
        if (!geojson) return;

        map.fitBounds(
          geojson.getBounds()
        );

        clearSelection();
      }
    );

    return container;
  }
});

map.addControl(
  new HomeControl()
);
