"use strict";

$(document).ready(function () {
  let _username = $("#usr");
  let _password = $("#pwd");
  let _lblErrore = $("#lblErrore");

  _lblErrore.hide();

  $("#btnLogin").on("click", controllaLogin);

  // il submit deve partire anche senza click
  // con il solo tasto INVIO
  $(document).on("keydown", function (event) {
    if (event.keyCode == 13) controllaLogin();
  });

  function controllaLogin() {
    _username.removeClass("is-invalid");
    _username.removeClass("icona-rossa");
    _password.removeClass("is-invalid");
    _password.removeClass("icona-rossa");

    _lblErrore.hide();

    if(_username.val() != "" && _password.val() != "") {
      console.log("Dati inviati:", {
        username: _username.val(),
        password: _password.val(),
      });


      let request = inviaRichiesta("POST", "/api/login", {
        username: _username.val(),
        password: _password.val(),
      });

      request.fail(function (jqXHR, test_status, str_error) {
        if (jqXHR.status == 401) {
          // unauthorized
          _lblErrore.show();
        } else errore(jqXHR, test_status, str_error);
      });

      request.done(function (data, test_status, jqXHR) {
        const token = jqXHR.getResponseHeader("Authorization");
        if (token) {
          localStorage.setItem("token", token); // Salva il token
          console.log("Token salvato:", token);

          // Reindirizza alla pagina successiva
          window.location.href = "userArea.html";
        } else {
          console.error("Token non ricevuto dal server.");
          _lblErrore.show();
        }
      });
    } else {
      if (_username.val() == "") {
        _username.addClass("is-invalid");
        _username.addClass("icona-rossa");
      }
      if (_password.val() == "") {
        _password.addClass("is-invalid");
        _password.addClass("icona-rossa");
      }
    }

    _lblErrore.children("button").on("click", function () {
      _lblErrore.hide();
    });
  }
});


function inviaRichiesta(method, url, parameters = {}) {
  let token = localStorage.getItem("token"); // Recupera il token dal localStorage
  return $.ajax({
    type: method,
    url: url,
    data: JSON.stringify(parameters), // Assicurati che i dati siano in formato JSON
    contentType: "application/json", // Specifica il tipo di contenuto
    dataType: "json",
    headers: {
      Authorization: token, // Aggiungi il token nell'intestazione
    },
  });
}
