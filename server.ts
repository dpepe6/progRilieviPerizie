"use strict";

// import
import http from "http";
import https from "https";
import fs from "fs";
import express from "express"; // @types/express
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { Double, MongoClient, ObjectId } from "mongodb";
import cors from "cors"; // @types/cors
import fileUpload, { UploadedFile } from "express-fileupload";
import cloudinary, { UploadApiResponse } from "cloudinary";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// config
dotenv.config({ path: ".env" });
const app = express();
const HTTP_PORT = process.env.PORT || 3000; // Cambia 1337 in 3000 o un'altra porta libera
const DBNAME = "rilieviPerizieDB";
const COLLECTIONUTENTI = "utentiRilieviPerizieDB";
const COLLECTIONPERIZIE = "perizieRilieviPerizieDB";
const CONNECTION_STRING = process.env.connectionString;
const ADMIN_ID = "ADMIN";
// cloudinary.v2.config(JSON.parse(process.env.cloudinary as string));
const whiteList = [
  "https://progettoassicurazioni-andreavaira.onrender.com",
  "http://localhost:1337",
  "https://localhost:1338",
  "https://192.168.1.70:1338",
  "https://10.88.205.125:1338",
  "https://cordovaapp",
];
const corsOptions = {
  origin: function (origin: any, callback: any) {
    return callback(null, true);
  },
  credentials: true,
};
const HTTPS_PORT = 1337;
const privateKey = fs.readFileSync("keys/privateKey.pem", "utf8");
const certificate = fs.readFileSync("keys/certificate.crt", "utf8");
const credentials = { key: privateKey, cert: certificate };
const DURATA_TOKEN = 240; // sec

// ***************************** Avvio ****************************************
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, function () {
  init();
  console.log("Server HTTP in ascolto sulla porta " + HTTP_PORT);
});
let httpsServer = https.createServer(credentials, app);
httpsServer.listen(HTTPS_PORT, function () {
  console.log(
    "Server in ascolto sulle porte HTTP:" + HTTP_PORT + ", HTTPS:" + HTTPS_PORT
  );
});
let paginaErrore = "";
function init() {
  fs.readFile("./static/error.html", function (err, data) {
    if (!err) paginaErrore = data.toString();
    else paginaErrore = "<h1>Risorsa non trovata</h1>";
  });
}

/* *********************** (Sezione 2) Middleware ********************* */
// 1. Request log
app.use("/", function (req, res, next) {
  console.log("** " + req.method + " ** : " + req.originalUrl);
  next();
});

// 2 - risorse statiche
app.use("/", express.static("./static"));

// 3 - lettura dei parametri post
app.use("/", express.json({ limit: "20mb" }));
app.use("/", express.urlencoded({ extended: true, limit: "20mb" }));

// 4 - binary upload
app.use(
  "/",
  fileUpload({
    limits: { fileSize: 20 * 1024 * 1024 }, // 20*1024*1024 // 20 M
  })
);

// 5 - log dei parametri
app.use("/", function (req, res, next) {
  if (Object.keys(req.query).length > 0)
    console.log("        Parametri GET: ", req.query);
  if (Object.keys(req.body).length != 0)
    console.log("        Parametri BODY: ", req.body);
  next();
});

// 6. cors
app.use("/", cors(corsOptions));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// 7. gestione login
app.post(
  "/api/login",
  function (req: Request, res: Response, next: NextFunction) {
    console.log("Corpo della richiesta ricevuto:", req.body);

    if (!req.body.username || !req.body.password) {
      return res.status(400).send("Dati mancanti nel corpo della richiesta.");
    }

    let connection = new MongoClient(CONNECTION_STRING as string);
    connection
      .connect()
      .then((client: MongoClient) => {
        const collection = client.db(DBNAME).collection(COLLECTIONUTENTI);
        let regex = new RegExp(`^${req.body.username}$`, "i");
        collection
          .findOne({ username: regex })
          .then((dbUser: any) => {
            if (!dbUser) {
              res.status(401).send("Utente non trovato");
            } else {
              console.log("Utente trovato:", dbUser);
              console.log("ID utente:", dbUser._id.toString()); // Aggiungi un log per verificare
              bcrypt.compare(
                req.body.password,
                dbUser.password,
                (err: Error, ris: Boolean) => {
                  if (err) {
                    console.error("Errore bcrypt:", err);
                    res.status(500).send("Errore bcrypt " + err.message);
                  } else if (!ris) {
                    console.log("Password non corrispondente");
                    res.status(401).send("Password errata");
                  } else {
                    let redPage = "pageOperatore.html";
                    if(dbUser._id == ADMIN_ID) {
                      redPage = "pageAdmin.html";
                    }
                    res.setHeader("redPage", redPage);
                    let token = createToken(dbUser); // Assicurati che dbUser._id sia un ObjectId valido
                    res.setHeader("Authorization", token);
                    res.setHeader(
                      "access-control-expose-headers",
                      "Authorization"
                    );
                    res.send({ ris: "ok" });
                  }
                }
              );
            }
          })
          .catch((err: Error) => {
            console.error("Errore nella query:", err);
            res.status(500).send("Errore nella query " + err.message);
          })
          .finally(() => {
            client.close();
          });
      })
      .catch((err: Error) => {
        console.error("Errore nella connessione al database:", err);
        res.status(503).send("Servizio database non disponibile");
      });
  }
);

function createToken(user: any) {
  let time: any = new Date().getTime() / 1000;
  let now = parseInt(time); // Data attuale espressa in secondi
  let payload = {
    iat: user.iat || now,
    exp: now + DURATA_TOKEN,
    _id: user._id.toString(), // Usa .toString() per ottenere l'ID come stringa
    email: user.email
  };
  let token = jwt.sign(payload, privateKey);
  console.log("Creato nuovo token " + token);
  return token;
}

// 9. Controllo del Token
app.use("/api/verifyToken", function (req: any, res, next) {
  const token = req.headers["authorization"];
  console.log("Token ricevuto:", token);
  if (!token) {
    res.status(403).send("Token mancante");
  } else {
    jwt.verify(token, privateKey, (err: any, payload: any) => {
      if (err) {
        console.error("Errore nella verifica del token:", err);
        res.status(403).send("Token scaduto o corrotto");
      } else {
        console.log("Token verificato con successo:", payload);
        const newToken = createToken(payload);
        res.setHeader("Authorization", newToken);
        res.setHeader("access-control-expose-headers", "Authorization");
        req["payload"] = payload;
        next();
      }
    });
  }
});

app.get("/api/verifyToken", function (req: any, res: Response) {
  const token = req.headers["authorization"];
  console.log("Token ricevuto:", token);
  if (!token) {
    return res.status(403).send("Token mancante");
  }

  jwt.verify(token, privateKey, (err: any, payload: any) => {
    if (err) {
      console.error("Errore nella verifica del token:", err);
      return res.status(403).send("Token scaduto o corrotto");
    }

    console.log("Token verificato con successo:", payload);
    res.send({ success: true, payload });
  });
});

// 10. Apertura della connessione
app.use("/api/", function (req: any, res: any, next: NextFunction) {
  let connection = new MongoClient(CONNECTION_STRING as string);
  connection
    .connect()
    .then((client: any) => {
      req["connessione"] = client;
      next();
    })
    .catch((err: any) => {
      let msg = "Errore di connessione al db";
      res.status(503).send(msg);
    });
});

/* ********************* (Sezione 3) USER ROUTES  ************************** */

app.get("/api/MAP_KEY", (req: Request, res: Response) => {
  res.send({ key: process.env.MAP_KEY }); // Restituisce la chiave API di MapTiler
});

app.get("/api/perizie", (req: any, res: Response, next: NextFunction) => {
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
  collection.find({}).toArray((err: Error, data: any) => {
    if (err) {
      res.status(500);
      res.send("Errore esecuzione query");
    } else {
      res.send(data);
    }
    req["connessione"].close();
  });
});

app.get("/api/perizieUtente", (req: any, res: Response, next: NextFunction) => {
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
  collection
    .find({ codOperatore: req.query.codOperatore })
    .toArray((err: Error, data: any) => {
      if (err) {
        res.status(500);
        res.send("Errore esecuzione query");
      } else {
        res.send(data);
      }
      req["connessione"].close();
    });
});

app.get("/api/perizie/:id", (req: any, res: Response, next: NextFunction) => {
  let _id = req.params.id;
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
  collection.findOne({ _id: _id }, (err: Error, data: any) => {
    if (err) {
      res.status(500).send("Errore esecuzione query");
    } else {
      res.send(data);
    }
    req["connessione"].close();
  });
});

app.put("/api/perizie/:id", (req: any, res: Response, next: NextFunction) => {
  let _id = req.params.id;
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
  collection.updateOne(
    { _id: _id },
    { $set: { descrizione: req.body.descrizione } },
    (err: Error, data: any) => {
      if (err) {
        res.status(500).send("Errore aggiornamento descrizione");
      } else {
        res.send("Descrizione aggiornata con successo");
      }
      req["connessione"].close();
    }
  );
});

app.put("/api/perizie/:id/:idFoto", (req: any, res: Response, next: NextFunction) => {
  let _id = req.params.id;
  let idFoto = req.params.idFoto;
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
  collection.updateOne(
    { _id: _id, "fotografie.idFoto": idFoto },
    { $set: { "fotografie.$.commento": req.body.commento } },
    (err: Error, data: any) => {
      if (err) {
        res.status(500).send("Errore aggiornamento descrizione");
      } else {
        res.send("Descrizione aggiornata con successo");
      }
      req["connessione"].close();
    }
  );
});

app.get("/api/operatore", (req: any, res: Response, next: NextFunction) => {
  let _id = new ObjectId(req.query._id);
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
  collection.find({ _id: _id }).toArray((err: Error, data: any) => {
    if (err) {
      res.status(500);
      res.send("Errore esecuzione query");
    } else {
      res.send(data);
    }
    req["connessione"].close();
  });
});

app.post(
  "/api/aggiornaPerizia",
  (req: any, res: Response, next: NextFunction) => {
    let descrizione = req.body.descrizione;
    let foto = req.body.foto;
    let _id = new ObjectId(req.body.id);

    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);

    collection.updateOne(
      { _id: _id },
      { $set: { descrizione: descrizione, foto: JSON.parse(foto) } },
      (err: Error, data: any) => {
        if (err) {
          res.status(500);
          res.send("Errore esecuzione query");
        } else {
          res.send({ ris: "ok" });
        }
        req["connessione"].close();
      }
    );
  }
);

app.get("/api/operatori", (req: any, res: Response, next: NextFunction) => {
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
  collection.find({}).toArray((err: Error, data: any) => {
    if (err) {
      res.status(500);
      res.send("Errore esecuzione query");
    } else {
      res.send(data);
    }
    req["connessione"].close();
  });
});

app.post("/api/employ", (req: any, res: Response, next: NextFunction) => {
  let nome = req.body.name;
  let mail = req.body.mail;
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash("password", salt, function (err, hash) {
      let record = {
        password: hash,
        nome: nome,
        mail: mail,
        nPerizie: "0",
        '"img"':
          "https://res.cloudinary.com/dfrqbcbln/image/upload/v1672932919/assicurazioni/img_avatar_e9p0bx.png",
      };

      let collection = req["connessione"]
        .db(DBNAME)
        .collection(COLLECTIONUTENTI);
      collection.insertOne(record, (err: Error, data: any) => {
        if (err) {
          res.status(500);
          res.send("Errore esecuzione query");
        } else {
          res.send({ ris: "ok" });
        }
        req["connessione"].close();
      });
    });
  });
});

app.get("/api/operatore1", (req: any, res: Response, next: NextFunction) => {
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
  console.log(req["payload"]._id);
  let _id = new ObjectId(req["payload"]._id);
  collection.find({ _id }).toArray((err: Error, data: any) => {
    if (err) {
      res.status(500);
      res.send("Errore esecuzione query");
    } else {
      res.send(data);
    }
    req["connessione"].close();
  });
});

app.post("/api/updatePwd", (req: any, res: Response, next: NextFunction) => {
  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
  console.log(req["payload"]._id);
  let _id = new ObjectId(req["payload"]._id);
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(req.body.pwd, salt, function (err, hash) {
      collection.updateOne(
        { _id },
        { $set: { password: hash } },
        (err: Error, data: any) => {
          if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
          } else {
            res.send(data);
          }
          req["connessione"].close();
        }
      );
    });
  });
});

app.post(
  "/api/updateOperatore",
  (req: any, res: Response, next: NextFunction) => {
    // cloudinary.v2.uploader.upload(req.body.img, { folder: "assicurazioni" })
    //   .then((result: UploadApiResponse) => { ... })
    //   .catch((err: any) => { ... });
  }
);

app.post("/api/newPhoto", (req: any, res: Response, next: NextFunction) => {
  cloudinary.v2.uploader
    .upload(req.body.img, { folder: "assicurazioni" })
    .then((result: UploadApiResponse) => {
      res.send({ path: result.secure_url });
    })
    .catch((err: any) => {
      res.status(500);
      res.send("Error upload file to Cloudinary. Error: " + err.message);
    });
});

app.post("/api/newReport", (req: any, res: Response, next: NextFunction) => {
  let record = req.body.record;
  record.codOperatore = req["payload"]._id;

  let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);

  collection.insertOne(record, (err: Error, data: any) => {
    if (err) {
      res.status(500);
      res.send("Errore esecuzione query");
    } else {
      res.send({ ris: "ok" });
    }
    req["connessione"].close();
  });
});

/* ********************** (Sezione 4) DEFAULT ROUTE  ************************* */
// Default route
app.use("/", function (req: any, res: any, next: NextFunction) {
  res.status(404);
  if (req.originalUrl.startsWith("/api/")) {
    res.send("Risorsa non trovata");
    req["connessione"].close();
  } else res.send(paginaErrore);
});

// Gestione degli errori
app.use("/", (err: any, req: any, res: any, next: any) => {
  if (req["connessione"]) req["connessione"].close();
  res.status(500);
  res.send("ERRR: " + err.message);
  console.log("SERVER ERROR " + err.stack);
});

bcrypt.genSalt(10, function (err, salt) {
  if (err) {
    console.error("Errore durante la generazione del salt:", err);
    return;
  }
  bcrypt.hash("admin", salt, function (err, hash) {
    if (err) {
      console.error("Errore durante l'hashing della password:", err);
      return;
    }
    console.log("Password hashata:", hash);
  });
});

async function hashPassword() {
  const client = new MongoClient(CONNECTION_STRING as string);
  try {
    await client.connect();
    const db = client.db(DBNAME);
    const collection = db.collection(COLLECTIONUTENTI);

    // Trova l'utente Admin
    const user = await collection.findOne({ username: "admin" });
    if (!user) {
      console.log("Utente Admin non trovato.");
      return;
    }

    // Hasha la password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin", salt);

    // Aggiorna la password nel database
    await collection.updateOne(
      { username: "admin" },
      { $set: { password: hashedPassword } }
    );

    console.log("Password hashata e aggiornata correttamente.");
  } catch (err) {
    console.error("Errore durante l'hashing della password:", err);
  } finally {
    await client.close();
  }
}

hashPassword();
