const { firestoreAdmin } = require('../src/lib/firebase/firebase');

async function debugDB() {
    try {
        console.log('Fetching ALL records from data_records...');
        const snapshot = await firestoreAdmin.collection('data_records').get();

        if (snapshot.empty) {
            console.log('No documents found in data_records collection.');
        } else {
            console.log(`Found ${snapshot.size} documents:`);
            snapshot.forEach(doc => {
                console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2));
            });
        }
    } catch (error) {
        console.error('Error querying DB:', error);
    }
}

debugDB();
