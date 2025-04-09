"use strict";

function popolaMappa(perizie) {
  if (typeof maplibregl === "undefined") {
    console.error("MapLibre GL JS non è stato caricato correttamente.");
    return;
  }

  if (!MAP_KEY) {
    console.error("Chiave API non definita.");
    return;
  }

  // Inizializza la mappa
  let map = new maplibregl.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/streets/style.json?key=${MAP_KEY}`,
    center: [7.85, 44.69], // Centro sulla sede centrale
    zoom: 13,
  });

  // Aggiungi il segnaposto per la sede centrale
  new maplibregl.Marker({ color: "blue" })
    .setLngLat([7.85, 44.69])
    .setPopup(new maplibregl.Popup().setHTML("<h3>Sede Centrale</h3>"))
    .addTo(map);

  // Aggiungi i segnaposti per le perizie
  for (const perizia of perizie) {
    let marker = new maplibregl.Marker()
      .setLngLat([perizia.coordinate.longitude, perizia.coordinate.latitude])
      .addTo(map);

    // Aggiungi un popup al segnaposto
    let popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
      <h3>Dettagli Perizia</h3>
      <p><b>Descrizione:</b> ${perizia.descrizione}</p>
      <p><b>Commento:</b> ${perizia.foto[0]?.commento || "Nessun commento"}</p>
      <button class="btn btn-primary btn-sm" onclick="visualizzaDettagli('${
        perizia._id
      }')">Visualizza dettagli</button>
    `);
    marker.setPopup(popup);
  }
  popolaFiltroOperatori(perizie);
}

// Funzione per visualizzare i dettagli della perizia
function visualizzaDettagli(periziaId) {
  let request = inviaRichiesta("GET", `/api/perizie/${periziaId}`);
  request.done(function (perizia) {
    $("#dataOra").text(perizia["data-ora"]);
    $("#descrizionePerizia").val(perizia.descrizione);
    $("#commentoFoto").val(perizia.foto[0]?.commento || "");
    $("#dettagliPerizia").data("periziaId", periziaId);

    // Ottieni l'indirizzo dalle coordinate
    getIndirizzo(perizia.coordinate, function (indirizzo) {
      $("#indirizzo").text(indirizzo || "Indirizzo non disponibile");
    });

    // Mostra le foto
    let fotoContainer = $("#fotoContainer");
    fotoContainer.empty();
    for (const foto of perizia.foto) {
      fotoContainer.append(
        `<img src="${foto.img}" alt="Foto perizia" class="img-thumbnail" style="margin: 5px;">`
      );
    }

    // Mostra la sezione dei dettagli con animazione
    $("#dettagliPerizia").fadeIn(500);
  });
}

// Funzione per ottenere l'indirizzo dalle coordinate
function getIndirizzo(coordinate, callback) {
  let url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinate.latitude}&lon=${coordinate.longitude}`;
  $.getJSON(url, function (data) {
    if (data && data.display_name) {
      callback(data.display_name);
    } else {
      callback(null);
    }
  });
}

// Salva la descrizione della perizia
$(document).on("click", "#salvaDescrizione", function () {
  let nuovaDescrizione = $("#descrizionePerizia").val();
  let periziaId = $("#dettagliPerizia").data("periziaId");

  let request = inviaRichiesta("PUT", `/api/perizie/${periziaId}`, {
    descrizione: nuovaDescrizione,
  });

  request.done(function () {
    alert("Descrizione aggiornata con successo!");
  });
});

// Salva il commento della foto
$(document).on("click", "#salvaCommento", function () {
  let nuovoCommento = $("#commentoFoto").val();
  let periziaId = $("#dettagliPerizia").data("periziaId");

  let request = inviaRichiesta("PUT", `/api/perizie/${periziaId}`, {
    commento: nuovoCommento,
  });

  request.done(function () {
    alert("Commento aggiornato con successo!");
  });
});

function disegnaPercorso(perizia, map) {
  // Esempio di disegno di un percorso (simulato)
  let coordinates = [
    [10.0, 45.0], // Punto di partenza (esempio)
    [perizia.coordinate.longitude, perizia.coordinate.latitude], // Destinazione
  ];

  map.addSource("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coordinates,
      },
    },
  });

  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#3b9ddd",
      "line-width": 5,
    },
  });

  console.log("Percorso disegnato:", coordinates);
}

// Popola il filtro per operatori
function popolaFiltroOperatori(perizie) {
  let operatori = [...new Set(perizie.map((p) => p.codOperatore))]; // Estrai codici operatori unici
  let select = $("#operatoreSelect");
  select.empty();
  select.append(`<option value="all">Tutti</option>`);

  for (const operatore of operatori) {
    select.append(`<option value="${operatore}">${operatore}</option>`);
  }

  // Aggiungi evento per filtrare le perizie
  select.on("change", function () {
    let operatoreSelezionato = $(this).val();
    let perizieFiltrate =
      operatoreSelezionato === "all"
        ? perizie
        : perizie.filter((p) => p.codOperatore === operatoreSelezionato);

    // Ripopola la mappa con le perizie filtrate
    popolaMappa(perizieFiltrate);
    select.val(operatoreSelezionato);
  });
}
