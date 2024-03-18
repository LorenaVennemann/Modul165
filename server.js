const express = require('express');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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
        const db = client.db('meinedatenbank');
        return new GridFSBucket(db);
    } catch (err) {
        console.error('Fehler beim Abrufen von GridFS:', err);
    }
}

const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    const pfad = __dirname

    console.log(pfad)
    res.sendFile(__dirname+'/index.html')
})


// Abrufen aller Bilder
app.get('/images', async (req, res) => {
    try {
        const gridfs = await getGridFS();
        const files = await gridfs.find().toArray();

        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'Keine Bilder gefunden.' });
        }
        console.log(files)
        const imageUrls = files.map(file => `/images/${file.filename}`);
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
        const gridfs = await getGridFS();
        await gridfs.delete(id);

        res.status(200).json({ message: 'Bild erfolgreich gelöscht.' });
    } catch (err) {
        console.error('Fehler beim Löschen des Bildes:', err);
        res.status(500).json({ message: 'Interner Serverfehler beim Löschen des Bildes.' });
    }
});

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const existingObjectId = '507f191e810c19729de860ea'; // Beispielwert
        const objectIdAsHex = new ObjectId(existingObjectId).toString();
        console.log('ObjectID als Hexadezimal-String:', objectIdAsHex);
        const gridfs = await getGridFS();
        const fileStream = fs.createReadStream(req.file.path);
        const uploadStream = gridfs.openUploadStream(req.file.originalname, [objectIdAsHex]);
        console.log("id vom object:", uploadStream.id)
        fileStream.on('error', (err) => {
            console.error('Fehler beim Lesen der Datei:', err);
            res.status(500).json({ message: 'Interner Serverfehler beim Hochladen der Datei.' });
        });

        uploadStream.on('error', (err) => {
            console.error('Fehler beim Hochladen der Datei:', err);
            res.status(500).json({ message: 'Interner Serverfehler beim Hochladen der Datei.' });
        });

        uploadStream.on('finish', (info) => {
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