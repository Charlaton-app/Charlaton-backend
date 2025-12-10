/**
 * Script to clean old connections without firebaseUid from a specific room
 * Usage: npm run clean-connections <roomId>
 * Or: node -r ts-node/register clean-connections.ts <roomId>
 */

// Use the existing db configuration
const { db } = require('./dist/config/db');

async function cleanConnectionsForRoom(roomId) {
  console.log(`\n🧹 Cleaning connections for room: ${roomId}\n`);

  const connectionsRef = db.collection('rooms').doc(roomId).collection('connections');
  const snapshot = await connectionsRef.get();

  console.log(`📊 Found ${snapshot.size} total connections\n`);

  let deletedCount = 0;
  let keptCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const hasFirebaseUid = !!data.firebaseUid;
    
    console.log(`Connection ${doc.id}:`);
    console.log(`  - userId: ${data.userId}`);
    console.log(`  - firebaseUid: ${data.firebaseUid || 'NOT SET'}`);
    console.log(`  - leftAt: ${data.leftAt || 'null (active)'}`);
    
    // Delete connections without firebaseUid
    if (!hasFirebaseUid) {
      console.log(`  ❌ DELETING (no firebaseUid)\n`);
      await doc.ref.delete();
      deletedCount++;
    } else {
      console.log(`  ✅ KEEPING (has firebaseUid)\n`);
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
  console.error('Usage: node clean-connections.js <roomId>');
  process.exit(1);
}

cleanConnectionsForRoom(roomId).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
