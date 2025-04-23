"use strict";

const url = "https://maps.googleapis.com/maps/api";
let mappa;

let commenti = {
  vetCommenti: [],
  index: 0,
};

$(document).ready(function () {
  const token = localStorage.getItem("token");
  if (!token) {
    // Token mancante, reindirizza al login
    console.error("Token mancante, reindirizzamento al login.");
    window.location.href = "login.html";
  } else {
    // Verifica il token con una richiesta al server
    inviaRichiesta("GET", "/api/verifyToken")
      .done(function (data) {
        console.log("Token valido:", data);
      })
      .fail(function (jqXHR) {
        console.error("Token non valido:", jqXHR.responseText);
        window.location.href = "login.html";
      });
  }

  let request = inviaRichiesta("GET", "/api/MAP_KEY");
  request.fail(errore);
  request.done(function (key) {
    if (!key.key) {
      console.error("Chiave API non ricevuta dal server.");
      return;
    }
    console.log("Chiave API ricevuta:", key.key);
    window.MAP_KEY = key.key; // Salva la chiave API in una variabile globale

    // Inizializza la mappa
    let perizieRequest = inviaRichiesta("GET", "/api/perizie");
    perizieRequest.fail(errore);
    perizieRequest.done(function (perizie) {
      popolaMappa(perizie);
      popolaFiltroOperatori(perizie);
    });
  });

  $("#btnCreaUtente").on("click", function () {
    window.location.href = "creaNuovoUtente.html";
  });

  $('#btnLogout').on('click', async function () {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });

  $("#btnDhiudiDettagli").on("click", function () {
    $("#dettagliPerizia").hide();
  })
});

function popolaOperatori(operatori) {
  console.log(operatori);
  $("#filter").children("ul").eq(0).empty();
  let li = $("<li>");
  li.addClass(
    "list-group-item d-flex justify-content-between align-items-center"
  );
  li.css("cursor", "pointer");
  li.text("All");
  li.on("click", function () {
    let request = inviaRichiesta("GET", "/api/perizie");
    request.fail(errore);
    request.done(function (perizie) {
      console.log(perizie);
      popolaMappa(perizie);
    });
    hideFilter();
  });
  $("#filter").children("ul").eq(0).append(li);

  let length = operatori.length;
  if (operatori.length > 15) {
    length = 15;
  }
  for (let index = 0; index < length; index++) {
    const operatore = operatori[index];
    let li = $("<li>");
    li.addClass(
      "list-group-item d-flex justify-content-between align-items-center"
    );
    li.css("cursor", "pointer");
    li.text(operatore.nome);
    li.on("click", function () {
      console.log(operatore._id);
      let request = inviaRichiesta("GET", "/api/perizieUtente", {
        codOperatore: operatore._id,
      });
      request.fail(errore);
      request.done(function (perizie) {
        console.log(perizie);
        popolaMappa(perizie);
      });
      hideFilter();
    });
    let span = $("<span>");
    span.addClass("badge badge-success badge-pill");
    span.text(operatore.nPerizie);
    li.append(span);
    $("#filter").children("ul").eq(0).append(li);
  }
}

