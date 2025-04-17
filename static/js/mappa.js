"use strict";

const LATSEDECENTRALE = 44.648498;
const LONGSEDECENTRALE = 7.659901;

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
    center: [LONGSEDECENTRALE, LATSEDECENTRALE], // Centro sulla sede centrale
    zoom: 13,
  });

  // Aggiungi il segnaposto per la sede centrale
  new maplibregl.Marker({ color: "blue" })
    .setLngLat([LONGSEDECENTRALE, LATSEDECENTRALE])
    .setPopup(new maplibregl.Popup().setHTML("<h3>Sede Centrale</h3>"))
    .addTo(map);

  // Aggiungi i segnaposti per le perizie
  for (const perizia of perizie) {
    let marker = new maplibregl.Marker()
      .setLngLat([perizia.coordinate.lng, perizia.coordinate.lat])
      .addTo(map);

    // Aggiungi un popup al segnaposto
    let popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
      <h3>Dettagli Perizia</h3>
      <p><b>Data:</b> ${ricavaDataOraFormat(perizia.dataOra, true, false)}</p>
      <p><b>Ora:</b> ${ricavaDataOraFormat(perizia.dataOra, false, true)}</p>
      <p id="descPerizia${perizia._id}"><b>Descrizione:</b> ${perizia.descrizione}</p>
      <button class="btn btn-primary btn-sm" onclick="visualizzaDettagli('${
        perizia._id
      }')">Visualizza dettagli</button>
    `);

    marker.setPopup(popup);
  }
}

function ricavaDataOraFormat(dataOra, estraiData, estraiOra){
  let dataOraFormat = "";
  let dataOraJS = new Date(dataOra);

  if(estraiData) {
    let giorno = String(dataOraJS.getDate()).padStart(2, '0');
    let mese = String(dataOraJS.getMonth() + 1).padStart(2, '0');
    let anno = dataOraJS.getFullYear();
    dataOraFormat += `${giorno}/${mese}/${anno}`;
  }
  if(estraiOra) {
    let ore = String(dataOraJS.getHours()).padStart(2, '0');
    let minuti = String(dataOraJS.getMinutes()).padStart(2, '0');
    dataOraFormat += `${estraiData?" ":""}${ore}:${minuti}`;
  }

  return dataOraFormat;
}


// Funzione per visualizzare i dettagli della perizia
function visualizzaDettagli(periziaId) {
  let request = inviaRichiesta("GET", `/api/perizie/${periziaId}`);
  request.done(function (perizia) {
    $("#data").text(ricavaDataOraFormat(perizia.dataOra, true, false));
    $("#ora").text(ricavaDataOraFormat(perizia.dataOra, false, true));
    $("#descrizionePerizia").val(perizia.descrizione);
    $("#commentoFoto").val(perizia.fotografie[0]?.commento || "");
    $("#dettagliPerizia").data("periziaId", periziaId);

    // Ottieni l'indirizzo dalle coordinate
    getIndirizzo(perizia.coordinate, function (indirizzo) {
      $("#indirizzo").text(indirizzo || "Indirizzo non disponibile");
    });

    // Mostra le foto
    let fotoContainer = $("#fotoContainer");
    fotoContainer.empty();
    let iFoto = 1;
    
    for (const foto of perizia.fotografie) {
      fotoContainer.append(
        `<p><b>Foto ${iFoto}:</b></p>`
      );
      fotoContainer.append(
        `<img src="${foto.url}" alt="Foto perizia" class="img-thumbnail" style="margin: 5px;">`
      );
      fotoContainer.append(
        `<textarea id="commentoFoto${foto.idFoto}" class="form-control commentiFoto" rows="4">${foto.commento}</textarea>`
      );
      iFoto++;
    }

    // Mostra la sezione dei dettagli con animazione
    $("#dettagliPerizia").fadeIn(500);
  });
}

// Funzione per ottenere l'indirizzo dalle coordinate
function getIndirizzo(coordinate, callback) {
  let url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinate.lat}&lon=${coordinate.lng}`;
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
  $(`#descPerizia${periziaId}`).html(`<b>Descrizione:</b> ${nuovaDescrizione}`);

  inviaRichiesta("PUT", `/api/perizie/${periziaId}`, {
    descrizione: nuovaDescrizione,
  });
});

// Salva il commento della foto
$(document).on("click", "#salvaCommento", function () {
  let periziaId = $("#dettagliPerizia").data("periziaId");
  let commentiFoto = $(".commentiFoto");
  for (const commento of commentiFoto) {
    let idFoto = $(commento).prop("id").replace("commentoFoto", "");
    inviaRichiesta("PUT", `/api/perizie/${periziaId}/${idFoto}`, {
      commento: $(commento).val()
    });
  }
});

// Popola il filtro per operatori
function popolaFiltroOperatori(perizie) {
  let operatori = [...new Set(perizie.map((p) => p.idUtente))]; // Estrai codici operatori unici
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
        : perizie.filter((p) => p.idUtente === operatoreSelezionato);

    // Ripopola la mappa con le perizie filtrate
    popolaMappa(perizieFiltrate);
    select.val(operatoreSelezionato);
  });
}
