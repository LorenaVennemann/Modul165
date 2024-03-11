const { MongoClient, ObjectId } = require('mongodb');

// Verbinde dich mit MongoDB (ersetze dies mit deinen Verbindungsdetails)
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function main() {
    try {
        await client.connect();
        console.log('Mit MongoDB verbunden');

        const db = client.db('meinedatenbank');
        const collection = db.collection('fs.files');

        // Finde das Dokument in der fs.files-Sammlung mit der entsprechenden ID
        const uploadedFile = await collection.findOne({ _id: new ObjectId('65ef0275b19bf8c52c70922e') });
        
        if (uploadedFile) {
            console.log('Das hochgeladene Bild wurde gefunden:');
            console.log(uploadedFile);
        } else {
            console.log('Das hochgeladene Bild wurde nicht gefunden.');
        }

    } catch (err) {
        console.error('Fehler beim Ausführen des Codes:', err);
    } finally {
        await client.close();
    }
}

main();
