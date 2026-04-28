const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'seva-ai-a93e4'
});

const db = admin.firestore();

const seedVolunteers = async () => {
  const batch = db.batch();
  
  // Base location (Bangalore, India or roughly center of the map)
  const baseLat = 28.6139; // Delhi, change if map centers somewhere else
  const baseLng = 77.2090;

  for (let i = 1; i <= 10; i++) {
    const docRef = db.collection('users').doc(`demo-vol-${i}`);
    
    // Add some random offset to lat/lng (within ~5km)
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lngOffset = (Math.random() - 0.5) * 0.05;

    batch.set(docRef, {
      uid: `demo-vol-${i}`,
      role: 'VOLUNTEER',
      approved: true,
      online: true,
      currentMissionId: null,
      displayName: `Demo Volunteer ${i}`,
      email: `demo.volunteer${i}@seva.ai`,
      location: {
        lat: baseLat + latOffset,
        lng: baseLng + lngOffset
      },
      skills: ['Medical', 'Rescue', 'Logistics'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  console.log('Successfully added 10 demo volunteers to the users collection.');
};

seedVolunteers().catch(console.error);
