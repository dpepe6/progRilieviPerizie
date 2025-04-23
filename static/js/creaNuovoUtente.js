"use strict";

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

  let _username = $("#username");
  let _nomeCognome = $("#nomeCognome"); 
  let _email = $("#email");
  let _lblErroreUsername = $("#lblErroreUsername");
  let _lblErroreNomeCognome = $("#lblErroreNomeCognome");
  let _lblErroreEmail = $("#lblErroreEmail");  

  _lblErroreUsername.hide();
  _lblErroreNomeCognome.hide();
  _lblErroreEmail.hide();

  $("#btnCreateUser").on("click", function (event) {
    //window.location.href = "login.html";
    _lblErroreUsername.hide();
    _lblErroreNomeCognome.hide();
    _lblErroreEmail.hide();

    _username.removeClass("is-invalid");
    _username.removeClass("icona-rossa");
    _nomeCognome.removeClass("is-invalid");
    _nomeCognome.removeClass("icona-rossa");
    _email.removeClass("is-invalid");
    _email.removeClass("icona-rossa");

    if(controllaUsername(_username.val()) && controllaNomeCognome(_nomeCognome.val()) && controllaEmail(_email.val())) {
      console.log("Dati inviati:", {
        username: _username.val(),
        nomeCognome: _nomeCognome.val(),
        email: _email.val()
      });
      
      inviaRichiesta("GET", "/api/idUtenti")
      .done(function (data) {
        console.log("utenti:", data);
        let idUtente = `USER${data.length}`;
        let request = inviaRichiesta("POST", "/api/creaNuovoUtente", {
          id: idUtente,
          username: _username.val(),
          nomeCognome: _nomeCognome.val(),
          email: _email.val()
        });
      })
      .fail(errore);
    } else
    {
      if (!controllaUsername(_username.val())) {
        _username.addClass("is-invalid");
        _username.addClass("icona-rossa");
        _lblErroreUsername.show();
      }
      if (!controllaNomeCognome(_nomeCognome.val())) {
        _nomeCognome.addClass("is-invalid");
        _nomeCognome.addClass("icona-rossa");
        _lblErroreNomeCognome.show();
      }
      if (!controllaEmail(_email.val())) {
        _email.addClass("is-invalid");
        _email.addClass("icona-rossa");
        _lblErroreEmail.show();
      }
    }
  });
  $("#closelblErroreUsername").on("click", function () {
    _lblErroreUsername.hide();
  });
  $("#closelblErroreNomeCognome").on("click", function () {
    _lblErroreNomeCognome.hide();
  });
  $("#closelblErroreEmail").on("click", function () {
    _lblErroreEmail.hide();
  });

  function controllaUsername(username){
    if (username == "" || username.length < 4) {
      return false;
    }
    return true;
  }

  function controllaNomeCognome(nomeCognome){
    if (nomeCognome == "" || nomeCognome.length < 4) {
      return false;
    }
    return true;
  }

  function controllaEmail(email){
    if (email == "" || email.length < 5 || !/\S+@\S+\.\S+/.test(email)) {
      return false;
    }
    return true;
  }
});