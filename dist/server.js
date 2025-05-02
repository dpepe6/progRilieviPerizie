"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express")); // @types/express
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("mongodb");
const cors_1 = __importDefault(require("cors")); // @types/cors
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// config
dotenv_1.default.config({ path: ".env" });
const app = (0, express_1.default)();
const HTTP_PORT = process.env.PORT || 3000; // Cambia 1337 in 3000 o un'altra porta libera
const DBNAME = "rilieviPerizieDB";
const COLLECTIONUTENTI = "utentiRilieviPerizieDB";
const COLLECTIONPERIZIE = "perizieRilieviPerizieDB";
const CONNECTION_STRING = process.env.MONGO_URL;
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
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true,
};
const HTTPS_PORT = 1337;
const privateKey = fs_1.default.readFileSync("keys/privateKey.pem", "utf8");
const certificate = fs_1.default.readFileSync("keys/certificate.crt", "utf8");
const credentials = { key: privateKey, cert: certificate };
const DURATA_TOKEN = 240; // sec
// ***************************** Avvio ****************************************
const httpServer = http_1.default.createServer(app);
httpServer.listen(HTTP_PORT, function () {
    init();
    console.log("Server HTTP in ascolto sulla porta " + HTTP_PORT);
});
let httpsServer = https_1.default.createServer(credentials, app);
httpsServer.listen(HTTPS_PORT, function () {
    console.log("Server in ascolto sulle porte HTTP:" + HTTP_PORT + ", HTTPS:" + HTTPS_PORT);
});
let paginaErrore = "";
function init() {
    fs_1.default.readFile("./static/error.html", function (err, data) {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>";
    });
}
/* *********************** (Sezione 2) Middleware ********************* */
// 1. Request log
app.use("/", function (req, res, next) {
    console.log("** " + req.method + " ** : " + req.originalUrl);
    next();
});
// 2 - risorse statiche
app.use("/", express_1.default.static("./static"));
// 3 - lettura dei parametri post
app.use("/", express_1.default.json({ limit: "20mb" }));
app.use("/", express_1.default.urlencoded({ extended: true, limit: "20mb" }));
// 4 - binary upload
app.use("/", (0, express_fileupload_1.default)({
    limits: { fileSize: 20 * 1024 * 1024 }, // 20*1024*1024 // 20 M
}));
// 5 - log dei parametri
app.use("/", function (req, res, next) {
    if (Object.keys(req.query).length > 0)
        console.log("        Parametri GET: ", req.query);
    if (Object.keys(req.body).length != 0)
        console.log("        Parametri BODY: ", req.body);
    next();
});
// 6. cors
app.use("/", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
// 7. gestione login
app.post("/api/login", function (req, res, next) {
    console.log("Corpo della richiesta ricevuto:", req.body);
    if (!req.body.username || !req.body.password) {
        return res.status(400).send("Dati mancanti nel corpo della richiesta.");
    }
    let connection = new mongodb_1.MongoClient(CONNECTION_STRING, {
        serverApi: {
            version: mongodb_1.ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    connection
        .connect()
        .then((client) => {
        const collection = client.db(DBNAME).collection(COLLECTIONUTENTI);
        let regex = new RegExp(`^${req.body.username}$`, "i");
        collection
            .findOne({ username: regex })
            .then((dbUser) => {
            if (!dbUser) {
                res.status(401).send("Utente non trovato");
            }
            else {
                console.log("Utente trovato:", dbUser);
                console.log("ID utente:", dbUser._id.toString()); // Aggiungi un log per verificare
                bcryptjs_1.default.compare(req.body.password, dbUser.password, (err, ris) => {
                    if (err) {
                        console.error("Errore bcrypt:", err);
                        res.status(500).send("Errore bcrypt " + err.message);
                    }
                    else if (!ris) {
                        console.log("Password non corrispondente");
                        res.status(401).send("Password errata");
                    }
                    else {
                        let redPage = "pageOperatore.html";
                        if (dbUser._id == ADMIN_ID) {
                            redPage = "pageAdmin.html";
                        }
                        res.setHeader("redPage", redPage);
                        let token = createToken(dbUser); // Assicurati che dbUser._id sia un ObjectId valido
                        res.setHeader("Authorization", token);
                        res.setHeader("access-control-expose-headers", "Authorization");
                        res.send({ ris: "ok" });
                    }
                });
            }
        })
            .catch((err) => {
            console.error("Errore nella query:", err);
            res.status(500).send("Errore nella query " + err.message);
        })
            .finally(() => {
            client.close();
        });
    })
        .catch((err) => {
        console.error("Errore nella connessione al database:", err);
        res.status(503).send("Servizio database non disponibile");
    });
});
function createToken(user) {
    let time = new Date().getTime() / 1000;
    let now = parseInt(time); // Data attuale espressa in secondi
    let payload = {
        iat: user.iat || now,
        exp: now + DURATA_TOKEN,
        _id: user._id.toString(),
        email: user.email
    };
    let token = jsonwebtoken_1.default.sign(payload, privateKey);
    console.log("Creato nuovo token " + token);
    return token;
}
// 9. Controllo del Token
app.use("/api/verifyToken", function (req, res, next) {
    const token = req.headers["authorization"];
    console.log("Token ricevuto:", token);
    if (!token) {
        res.status(403).send("Token mancante");
    }
    else {
        jsonwebtoken_1.default.verify(token, privateKey, (err, payload) => {
            if (err) {
                console.error("Errore nella verifica del token:", err);
                res.status(403).send("Token scaduto o corrotto");
            }
            else {
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
app.get("/api/verifyToken", function (req, res) {
    const token = req.headers["authorization"];
    console.log("Token ricevuto:", token);
    if (!token) {
        return res.status(403).send("Token mancante");
    }
    jsonwebtoken_1.default.verify(token, privateKey, (err, payload) => {
        if (err) {
            console.error("Errore nella verifica del token:", err);
            return res.status(403).send("Token scaduto o corrotto");
        }
        console.log("Token verificato con successo:", payload);
        res.send({ success: true, payload });
    });
});
// 10. Apertura della connessione
app.use("/api/", function (req, res, next) {
    let connection = new mongodb_1.MongoClient(CONNECTION_STRING);
    connection
        .connect()
        .then((client) => {
        req["connessione"] = client;
        next();
    })
        .catch((err) => {
        let msg = "Errore di connessione al db";
        res.status(503).send(msg);
    });
});
/* ********************* (Sezione 3) USER ROUTES  ************************** */
app.get("/api/MAP_KEY", (req, res) => {
    res.send({ key: process.env.MAP_KEY }); // Restituisce la chiave API di MapTiler
});
app.get("/api/perizie", (req, res, next) => {
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
    collection.find({}).toArray((err, data) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        }
        else {
            res.send(data);
        }
        req["connessione"].close();
    });
});
app.get("/api/perizieUtente", (req, res, next) => {
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
    collection
        .find({ codOperatore: req.query.codOperatore })
        .toArray((err, data) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        }
        else {
            res.send(data);
        }
        req["connessione"].close();
    });
});
app.get("/api/perizie/:id", (req, res, next) => {
    let _id = req.params.id;
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
    collection.findOne({ _id: _id }, (err, data) => {
        if (err) {
            res.status(500).send("Errore esecuzione query");
        }
        else {
            res.send(data);
        }
        req["connessione"].close();
    });
});
app.put("/api/perizie/:id", (req, res, next) => {
    let _id = req.params.id;
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
    collection.updateOne({ _id: _id }, { $set: { descrizione: req.body.descrizione } }, (err, data) => {
        if (err) {
            res.status(500).send("Errore aggiornamento descrizione");
        }
        else {
            res.send("Descrizione aggiornata con successo");
        }
        req["connessione"].close();
    });
});
app.put("/api/perizie/:id/:idFoto", (req, res, next) => {
    let _id = req.params.id;
    let idFoto = req.params.idFoto;
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
    collection.updateOne({ _id: _id, "fotografie.idFoto": idFoto }, { $set: { "fotografie.$.commento": req.body.commento } }, (err, data) => {
        if (err) {
            res.status(500).send("Errore aggiornamento descrizione");
        }
        else {
            res.send("Descrizione aggiornata con successo");
        }
        req["connessione"].close();
    });
});
app.post("/api/aggiornaPerizia", (req, res, next) => {
    let descrizione = req.body.descrizione;
    let foto = req.body.foto;
    let _id = new mongodb_1.ObjectId(req.body.id);
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
    collection.updateOne({ _id: _id }, { $set: { descrizione: descrizione, foto: JSON.parse(foto) } }, (err, data) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        }
        else {
            res.send({ ris: "ok" });
        }
        req["connessione"].close();
    });
});
app.get("/api/operatori", (req, res, next) => {
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
    collection.find({}).toArray((err, data) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        }
        else {
            res.send(data);
        }
        req["connessione"].close();
    });
});
app.get("/api/idUtenti", (req, res, next) => {
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
    collection.find({}).project({ "_id": 1, "nome": 1 }).toArray((err, data) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        }
        else {
            res.send(data);
        }
        req["connessione"].close();
    });
});
app.get("/api/controlloUsername", (req, res, next) => {
    let username = req.query.username;
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
    collection.find({ username: username }).toArray((err, data) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        }
        else {
            res.send(data);
        }
        req["connessione"].close();
    });
});
app.post("/api/creaNuovoUtente", (req, res, next) => {
    let username = req.body.username;
    let nomeCognome = req.body.nomeCognome;
    let email = req.body.email;
    let _id = req.body.id;
    bcryptjs_1.default.genSalt(10, function (err, salt) {
        bcryptjs_1.default.hash("password", salt, function (err, hash) {
            let record = {
                _id: _id,
                username: username,
                password: hash,
                nome: nomeCognome,
                email: email,
                primoAccesso: 1
            };
            let collection = req["connessione"]
                .db(DBNAME)
                .collection(COLLECTIONUTENTI);
            collection.insertOne(record, (err, data) => {
                if (err) {
                    res.status(500);
                    res.send("Errore esecuzione query");
                }
                else {
                    res.send({ ris: "ok" });
                }
                req["connessione"].close();
            });
        });
    });
});
app.post("/api/updatePwd", (req, res, next) => {
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONUTENTI);
    console.log(req["payload"]._id);
    let _id = new mongodb_1.ObjectId(req["payload"]._id);
    bcryptjs_1.default.genSalt(10, function (err, salt) {
        bcryptjs_1.default.hash(req.body.pwd, salt, function (err, hash) {
            collection.updateOne({ _id }, { $set: { password: hash } }, (err, data) => {
                if (err) {
                    res.status(500);
                    res.send("Errore esecuzione query");
                }
                else {
                    res.send(data);
                }
                req["connessione"].close();
            });
        });
    });
});
app.post("/api/updateOperatore", (req, res, next) => {
    // cloudinary.v2.uploader.upload(req.body.img, { folder: "assicurazioni" })
    //   .then((result: UploadApiResponse) => { ... })
    //   .catch((err: any) => { ... });
});
app.post("/api/newPhoto", (req, res, next) => {
    cloudinary_1.default.v2.uploader
        .upload(req.body.img, { folder: "assicurazioni" })
        .then((result) => {
        res.send({ path: result.secure_url });
    })
        .catch((err) => {
        res.status(500);
        res.send("Error upload file to Cloudinary. Error: " + err.message);
    });
});
app.post("/api/newReport", (req, res, next) => {
    let record = req.body.record;
    record.codOperatore = req["payload"]._id;
    let collection = req["connessione"].db(DBNAME).collection(COLLECTIONPERIZIE);
    collection.insertOne(record, (err, data) => {
        if (err) {
            res.status(500);
            res.send("Errore esecuzione query");
        }
        else {
            res.send({ ris: "ok" });
        }
        req["connessione"].close();
    });
});
/* ********************** (Sezione 4) DEFAULT ROUTE  ************************* */
// Default route
app.use("/", function (req, res, next) {
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) {
        res.send("Risorsa non trovata");
        req["connessione"].close();
    }
    else
        res.send(paginaErrore);
});
// Gestione degli errori
app.use("/", (err, req, res, next) => {
    if (req["connessione"])
        req["connessione"].close();
    res.status(500);
    res.send("ERRR: " + err.message);
    console.log("SERVER ERROR " + err.stack);
});
bcryptjs_1.default.genSalt(10, function (err, salt) {
    if (err) {
        console.error("Errore durante la generazione del salt:", err);
        return;
    }
    bcryptjs_1.default.hash("admin", salt, function (err, hash) {
        if (err) {
            console.error("Errore durante l'hashing della password:", err);
            return;
        }
        console.log("Password hashata:", hash);
    });
});
function hashPassword() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new mongodb_1.MongoClient(CONNECTION_STRING);
        try {
            yield client.connect();
            const db = client.db(DBNAME);
            const collection = db.collection(COLLECTIONUTENTI);
            // Trova l'utente Admin
            const user = yield collection.findOne({ username: "admin" });
            if (!user) {
                console.log("Utente Admin non trovato.");
                return;
            }
            // Hasha la password
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash("admin", salt);
            // Aggiorna la password nel database
            yield collection.updateOne({ username: "admin" }, { $set: { password: hashedPassword } });
            console.log("Password hashata e aggiornata correttamente.");
        }
        catch (err) {
            console.error("Errore durante l'hashing della password:", err);
        }
        finally {
            yield client.close();
        }
    });
}
hashPassword();
