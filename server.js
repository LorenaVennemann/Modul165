const express = require("express");
const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");
const http = require("http");
const fs = require("fs");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const uri = "mongodb://172.17.0.2:27017";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
app.use(express.json()); // Parse JSON-encoded request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
let userconnections = {};

// Verbindung zur Datenbank einmalig herstellen
async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Verbunden mit der Datenbank");
  } catch (err) {
    console.error("Fehler beim Verbinden mit der Datenbank:", err);
  }
}

// Middleware für GridFS
async function getGridFS() {
  try {
    const db = client.db("Transfere");
    return new GridFSBucket(db, { bucketName: "images" });
  } catch (err) {
    console.error("Fehler beim Abrufen von GridFS:", err);
  }
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, "public")));

async function login(username, password) {
  const db = client.db("Transfere");
  const collection = db.collection("users");
  return await collection.findOne({ username: username, password: password });
}

async function getUser(username) {
  const db = client.db("Transfere");
  const collection = db.collection("users");
  return await collection.findOne({ username: username });
}

function sendReload(name) {
  try {
    let toRemove = [];
    userconnections[name].forEach((connection, index) => {
      try {
        connection.emit("reload", "reload");
      } catch (error) {
        // Füge den Index zur Liste der zu entfernenden Indizes hinzu
        toRemove.push(index);
      }
    });

    // Entferne die Elemente in umgekehrter Reihenfolge, um die Indizes korrekt zu halten
    for (let i = toRemove.length - 1; i >= 0; i--) {
      userconnections[username].splice(toRemove[i], 1);
    }
  } catch {}
}

app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/Login.html");
});
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/public/register.html");
});
// Registrierungsroute
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Benutzername und Passwort erforderlich" });
  }

  try {
    const db = client.db("Transfere");
    const collection = db.collection("users");
    const existingUser = await collection.findOne({ username: username });

    if (existingUser) {
      return res.status(400).json({ message: "Benutzername bereits vergeben" });
    }

    // Neuen Benutzer in die Datenbank einfügen
    await collection.insertOne({
      username: username,
      password: password,
      fichiers: [],
    });

    // Alle Benutzerdaten abrufen und anzeigen
    const allUsers = await collection.find().toArray();
    console.log("Alle Benutzerdaten:", allUsers);

    res
      .status(201)
      .json({
        message: "Benutzer erfolgreich registriert",
        user: { username, password },
      });
  } catch (err) {
    console.error("Fehler beim Registrieren:", err);
    res
      .status(500)
      .json({ message: "Interner Serverfehler beim Registrieren" });
  }
});

// Loginroute
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Benutzername und Passwort erforderlich" });
  }

  try {
    const db = client.db("Transfere");
    const collection = db.collection("users");
    const user = await collection.findOne({
      username: username,
      password: password,
    });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Ungültige Anmeldeinformationen" });
    }

    res.status(200).json({ message: "Erfolgreich eingeloggt", user });
  } catch (err) {
    console.error("Fehler beim Einloggen:", err);
    res.status(500).json({ message: "Interner Serverfehler beim Einloggen" });
  }
});


io.on("connection", (socket) => {
let globalUsername;
  console.log(`Neuer Client verbunden: ${socket.id}`);

  socket.on("login", async (data) => {
    const { username, password } = data;
    if (!username || !password) {
      socket.emit("login", "failed");
    }
    const user = await login(username, password);
    if (!user) {
      socket.emit("login", "failed");
    }
    globalUsername = username
    if (!userconnections[username]) userconnections[username] = [];
    userconnections[username].push(socket);
  });

  socket.on("newTextField", async (data) => {
    const db = client.db("Transfere");
    const collection = db.collection("images");
    const result = await collection.insertOne({
        text: ""
    });
    const user = await getUser(globalUsername)
    console.log("user",user, globalUsername)
    await updateFichiers(user,result.insertedId.toString() )
})

});

// Abrufen aller Bilder
app.post("/images", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(username, password, req.body);
    if (!username || !password) {
      res.status(400).json({ message: "logout" });
      return;
    }
    const user = await login(username, password);
    if (!user) res.status(400).json({ message: "logout" });
    const ids = user.fichiers.map((id) => {
      return new ObjectId(id);
    });

    const gridfs = await getGridFS();
    const files = await gridfs.find({ _id: { $in: ids } }).toArray();

    const db = client.db("Transfere");
    const collection = db.collection("images");
    const textFields = await collection.find({ _id: { $in: ids } }).toArray();
    textFields.forEach((textField) => files.push(textField))

    if (!files || files.length === 0) {
      return res.status(404).json({ message: "Keine Bilder gefunden." });
    }

    const imageUrls = files.map((file) => ({
      url: `/images/${file.filename}`,
      id: file._id,
    }));
    res.json(imageUrls);
  } catch (err) {
    console.error("Fehler beim Abrufen der Bilder:", err);
    res
      .status(500)
      .json({ message: "Interner Serverfehler beim Abrufen der Bilder." });
  }
});

//Abrufen eines spezifischen Bildes
app.get('/images/:filename', async (req, res) => {
    try {
        const gridfs = await getGridFS();
        const filename = req.params.filename;
        const file = await gridfs.find({ filename }).toArray();

        if (!file || file.length === 0) {
            return res.status(404).json({ message: 'Bild nicht gefunden.' });
        }

        res.set('Content-Type', 'image/webp');
        const downloadStream = gridfs.openDownloadStreamByName(filename);
        downloadStream.pipe(res);
    } catch (err) {
        console.error('Fehler beim Abrufen des Bildes:', err);
        res.status(500).json({ message: 'Interner Serverfehler beim Abrufen des Bildes.' });
    }
});

// Löschen eines Bildes
app.delete("/images/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const gridfs = await getGridFS();
    await gridfs.delete(id);

    res.status(200).json({ message: "Bild erfolgreich gelöscht." });
  } catch (err) {
    console.error("Fehler beim Löschen des Bildes:", err);
    res
      .status(500)
      .json({ message: "Interner Serverfehler beim Löschen des Bildes." });
  }
});

// Abrufen eines spezifischen Bildes
app.get("/images/:filename", async (req, res) => {
  try {
    const gridfs = await getGridFS();
    const filename = req.params.filename;
    const file = await gridfs.find({ filename }).toArray();
    console.log(file);
    if (!file || file.length === 0) {
      return res.status(404).json({ message: "Bild nicht gefunden." });
    }

    res.set("Content-Type", "image/webp");
    const downloadStream = gridfs.openDownloadStreamByName(filename);
    downloadStream.pipe(res);
  } catch (err) {
    console.error("Fehler beim Abrufen des Bildes:", err);
    res
      .status(500)
      .json({ message: "Interner Serverfehler beim Abrufen des Bildes." });
  }
});

// Hochladen eines Bildes
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const gridfs = await getGridFS();
    const json = JSON.parse(req.body.json);

    const { username, password, time } = json;
    const user = await login(username, password);
    if (!user) {
      return res.status(401).json({ message: "Login fehlgeschlagen" });
    } else {
      sendReload(username);
    }

    const uploadStream = gridfs.openUploadStream(req.file.originalname);
    uploadStream.end(req.file.buffer);

    uploadStream.on("error", (err) => {
      console.error("Fehler beim Hochladen der Datei:", err);
      res
        .status(500)
        .json({ message: "Interner Serverfehler beim Hochladen der Datei." });
    });

    uploadStream.on("finish", async () => {
      const newDocumnetId = await uploadStream.id.toString();
      console.log("iftie", time)
      if (time) deleteOnTime(newDocumnetId, time);
      await updateFichiers(user, newDocumnetId);
      console.log("Datei erfolgreich hochgeladen");
      res.status(200).json({ message: "Datei erfolgreich hochgeladen." });
    });
  } catch (err) {
    console.error("Fehler beim Hochladen der Datei:", err);
    res
      .status(500)
      .json({ message: "Interner Serverfehler beim Hochladen der Datei." });
  }
});

// Teilen eines Bildes
app.post("/image/share", async (req, res) => {
  try {
    const { username, id } = req.body;
    console.log("id username", username, id);
    if ((!username, !id)) res.status(200);
    const user = await getUser(username);
    if (!user) res.send("200");
    await updateFichiers(user, id);

    res.status(200);
  } catch (err) {
    console.error("Fehler beim Teilen des Bildes:", err);
    res
      .status(500)
      .json({ message: "Interner Serverfehler beim Teilen des Bildes." });
  }
});

async function updateFichiers(user, id) {
  console.log("update function ", user, id, user.username);
  const fichiers = user.fichiers;
  fichiers.push(id);
  const db = client.db("Transfere");
  const collection = db.collection("users");
  await collection.updateOne(
    { username: user.username },
    {
      $set: { fichiers: fichiers },
      $currentDate: { lastModified: true },
    }
  );
}

async function deleteOnTime(id, time) {
    console.log("deleteOnTime", id, time)
  setTimeout(async () => {
    const objectId = new ObjectId(id);
    const gridfs = await getGridFS();
    await gridfs.delete(objectId);
  }, time);
}

// Server starten
server.listen(3000, async () => {
  await connectToDatabase();
  console.log("Server läuft auf Port 3000");
});
