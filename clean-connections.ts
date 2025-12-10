/**
 * Script to clean old connections without firebaseUid from a specific room
 * Usage: npx ts-node clean-connections.ts <roomId>
 */

import { db } from './src/config/db';

async function cleanConnectionsForRoom(roomId: string) {
  console.log(`\n🧹 Cleaning connections for room: ${roomId}\n`);

  const connectionsRef = db.collection('rooms').doc(roomId).collection('connections');
  const snapshot = await connectionsRef.get();

  console.log(`📊 Found ${snapshot.size} total connections\n`);

  let deletedCount = 0;
  let keptCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const hasFirebaseUid = !!data.firebaseUid;
    const userId = String(data.userId);
    
    // Check if userId exists as a user document
    let userDocExists = false;
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      userDocExists = userDoc.exists;
    } catch (err) {
      console.error(`  ⚠️ Error checking user doc for ${userId}:`, err);
    }
    
    console.log(`Connection ${doc.id}:`);
    console.log(`  - userId: ${userId}`);
    console.log(`  - firebaseUid: ${data.firebaseUid || 'NOT SET'}`);
    console.log(`  - userDoc exists: ${userDocExists ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  - leftAt: ${data.leftAt || 'null (active)'}`);
    
    // Delete connections without firebaseUid OR where userId doesn't map to a real user doc
    if (!hasFirebaseUid || !userDocExists) {
      const reason = !hasFirebaseUid ? 'no firebaseUid' : 'userId not found in users collection';
      console.log(`  ❌ DELETING (${reason})\n`);
      await doc.ref.delete();
      deletedCount++;
    } else {
      console.log(`  ✅ KEEPING (has firebaseUid AND userId exists)\n`);
      keptCount++;
    }
  }

  console.log(`\n✨ Cleanup complete!`);
  console.log(`  - Deleted: ${deletedCount} connections`);
  console.log(`  - Kept: ${keptCount} connections`);
  console.log(`\nNow ask both users to refresh their browsers and rejoin the room.\n`);
  
  process.exit(0);
}

// Get roomId from command line
const roomId = process.argv[2];

if (!roomId) {
  console.error('❌ Error: Please provide a roomId');
  console.error('Usage: npx ts-node clean-connections.ts <roomId>');
  process.exit(1);
}

cleanConnectionsForRoom(roomId).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
