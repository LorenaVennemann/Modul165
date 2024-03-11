const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');

// Verbinde dich mit MongoDB (ersetze dies mit deinen Verbindungsdetails)
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function main() {
    try {
        await client.connect();
        console.log('Mit MongoDB verbunden');

        const db = client.db('meinedatenbank');
        const gridfs = new GridFSBucket(db);

        async function ladeBildInGridFSHoch(bildPfad) {
            const bildStream = fs.createReadStream(bildPfad);
            const uploadStream = gridfs.openUploadStream('Download.webp');
            bildStream.pipe(uploadStream);
            return new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });
        }
        const bildPfad = 'C:/Work/alleordner/TBZ/Modul165/Download.webp'; 
        const hochgeladeneBildId = await ladeBildInGridFSHoch(bildPfad);
        console.log(`Bild mit ID ${hochgeladeneBildId} in GridFS hochgeladen.`);

    } catch (err) {
        console.error('Fehler beim Ausführen des Codes:', err);
    } finally {
        await client.close();
    }
}

main();
