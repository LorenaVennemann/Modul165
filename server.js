const express = require('express');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

const uri = 'mongodb://172.17.0.2:27017';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(express.json()); // Parse JSON-encoded request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Verbindung zur Datenbank einmalig herstellen
async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Verbunden mit der Datenbank');
    } catch (err) {
        console.error('Fehler beim Verbinden mit der Datenbank:', err);
    }
}

// Middleware für GridFS
async function getGridFS() {
    try {
        const db = client.db('Transfere');
        return new GridFSBucket(db, { bucketName: 'images' });
    } catch (err) {
        console.error('Fehler beim Abrufen von GridFS:', err);
    }
}

const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    const pfad = __dirname

    console.log(pfad)
    res.sendFile(__dirname+'/register.html')
})

app.get('/login', (req, res) => {
    res.sendFile(__dirname+"/Login.html")
})

// Registrierungsroute
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Benutzername und Passwort erforderlich' });
    }

    try {
        const db = client.db('Transfere');
        const collection = db.collection('users');
        const existingUser = await collection.findOne({username: username });

        if (existingUser) {
            return res.status(400).json({ message: 'Benutzername bereits vergeben' });
        }

        // Neuen Benutzer in die Datenbank einfügen
        await collection.insertOne({username: username,password: password });

        // Alle Benutzerdaten abrufen und anzeigen
        const allUsers = await collection.find().toArray();
        console.log('Alle Benutzerdaten:', allUsers);

        res.status(201).json({ message: 'Benutzer erfolgreich registriert', user: { username, password } });
    } catch (err) {
        console.error('Fehler beim Registrieren:', err);
        res.status(500).json({ message: 'Interner Serverfehler beim Registrieren' });
    }
});


// Loginroute
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Benutzername und Passwort erforderlich' });
    }

    try {
        const db = client.db('Transfere');
        const collection = db.collection('users');
        console.log(username, password)
        const user = await collection.findOne({ username: username,password: password });
        console.log(user)
        if (!user) {
            return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
        }

        res.status(200).json({ message: 'Erfolgreich eingeloggt', user });
    } catch (err) {
        console.error('Fehler beim Einloggen:', err);
        res.status(500).json({ message: 'Interner Serverfehler beim Einloggen' });
    }
});

// Abrufen aller Bilder
app.get('/images', async (req, res) => {
    try {
        const gridfs = await getGridFS();
        const files = await gridfs.find().toArray();

        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'Keine Bilder gefunden.' });
        }

        const imageUrls = files.map((file) => ({
            "url": `/images/${file.filename}`,
            "id": file._id
        }));
        res.json(imageUrls);
    } catch (err) {
        console.error('Fehler beim Abrufen der Bilder:', err);
        res.status(500).json({ message: 'Interner Serverfehler beim Abrufen der Bilder.' });
    }
});

// Abrufen eines spezifischen Bildes
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
app.delete('/images/:id', async (req, res) => {
    try {
        const id = new ObjectId(req.params.id);
        const gridfs = await getGridFS();
        await gridfs.delete(id);

        res.status(200).json({ message: 'Bild erfolgreich gelöscht.' });
    } catch (err) {
        console.error('Fehler beim Löschen des Bildes:', err);
        res.status(500).json({ message: 'Interner Serverfehler beim Löschen des Bildes.' });
    }
});

// Hochladen eines Bildes
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const gridfs = await getGridFS();
        const fileStream = fs.createReadStream(req.file.path);
        const uploadStream = gridfs.openUploadStream(req.file.originalname);
        fileStream.on('error', (err) => {
            console.error('Fehler beim Lesen der Datei:', err);
            res.status(500).json({ message: 'Interner Serverfehler beim Hochladen der Datei.' });
        });

        uploadStream.on('error', (err) => {
            console.error('Fehler beim Hochladen der Datei:', err);
            res.status(500).json({ message: 'Interner Serverfehler beim Hochladen der Datei.' });
        });

        uploadStream.on('finish', () => {
            console.log('Datei erfolgreich hochgeladen');
            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.error('Fehler beim Löschen der temporären Datei:', err);
                }
            });
            res.status(200).json({ message: 'Datei erfolgreich hochgeladen.' });
        });

        fileStream.pipe(uploadStream);
    } catch (err) {
        console.error('Fehler beim Hochladen der Datei:', err);
        res.status(500).json({ message: 'Interner Serverfehler beim Hochladen der Datei.' });
    }
});

// Server starten
app.listen(port, async () => {
    await connectToDatabase();
    console.log(`App listening at http://localhost:${port}`);
});
