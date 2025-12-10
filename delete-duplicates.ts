import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_KEY_PATH) {
  const keyPath = path.resolve(process.env.FIREBASE_KEY_PATH);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Firebase key file not found at: ${keyPath}`);
  }
  serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
} else {
  throw new Error('Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_KEY_PATH');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();

async function deleteDuplicateConnections(roomId: string) {
  console.log(`\n🧹 Deleting duplicate connections for room: ${roomId}\n`);

  const connectionsRef = db.collection('rooms').doc(roomId).collection('connections');
  const snapshot = await connectionsRef.where('leftAt', '==', null).get();

  console.log(`📊 Found ${snapshot.docs.length} active connections\n`);

  // Group by userId+firebaseUid
  const userConnections = new Map<string, any[]>();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const key = `${data.userId}-${data.firebaseUid}`;
    
    if (!userConnections.has(key)) {
      userConnections.set(key, []);
    }
    userConnections.get(key)!.push({ id: doc.id, data, ref: doc.ref });
  }

  let deleted = 0;
  let kept = 0;

  for (const [key, connections] of userConnections.entries()) {
    if (connections.length > 1) {
      console.log(`🔍 Found ${connections.length} connections for ${key}`);
      
      // Keep the first one, delete the rest
      const toKeep = connections[0];
      const toDelete = connections.slice(1);

      console.log(`  ✅ KEEPING: ${toKeep.id}`);
      kept++;

      for (const conn of toDelete) {
        console.log(`  ❌ DELETING duplicate: ${conn.id}`);
        await conn.ref.delete();
        deleted++;
      }
      console.log('');
    } else {
      kept++;
    }
  }

  console.log(`\n✨ Cleanup complete!`);
  console.log(`  - Deleted: ${deleted} duplicate connections`);
  console.log(`  - Kept: ${kept} unique connections\n`);

  process.exit(0);
}

const roomId = process.argv[2];
if (!roomId) {
  console.error('❌ Usage: ts-node delete-duplicates.ts <roomId>');
  process.exit(1);
}

deleteDuplicateConnections(roomId).catch(console.error);
