const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const admin = require('firebase-admin');

const db = admin.firestore();

// ─── Haversine Distance ───────────────────────────────────────────────────────

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2) ** 2;
  const sinLng = Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(
    Math.sqrt(sinLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng),
    Math.sqrt(1 - sinLat - Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng)
  );
  return R * c;
}

// ─── Cost Matrix ──────────────────────────────────────────────────────────────

function computeCost(volunteer, report) {
  const vLoc = volunteer.location;
  const rLoc = report.location;

  const distKm = (vLoc && rLoc && rLoc.lat != null)
    ? haversineKm(vLoc, rLoc)
    : 100; // large penalty for missing GPS

  const required = report.needType || [];
  const has = volunteer.skills || [];
  const matchRatio = required.length === 0
    ? 1
    : has.filter(s => required.includes(s)).length / required.length;
  const skillPenalty = (1 - matchRatio) * 20;

  return (distKm * 0.7) + (skillPenalty * 0.3);
}

// ─── Hungarian Algorithm ──────────────────────────────────────────────────────

function hungarian(C) {
  const n = C.length;
  if (n === 0) return [];
  const m = C[0].length;
  const size = Math.max(n, m);

  // Pad to square with large sentinel
  const mat = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i < n && j < m ? C[i][j] : 1e9))
  );

  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);

  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minVal = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = -1;

      for (let j = 1; j <= size; j++) {
        if (!used[j]) {
          const cur = mat[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minVal[j]) { minVal[j] = cur; way[j] = j0; }
          if (minVal[j] < delta) { delta = minVal[j]; j1 = j; }
        }
      }

      for (let j = 0; j <= size; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else { minVal[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }

  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= size; j++) {
    if (p[j] >= 1 && p[j] <= n && j <= m) assignment[p[j] - 1] = j - 1;
  }
  return assignment;
}

// ─── Main Function ────────────────────────────────────────────────────────────

const swarmAssemblerTrigger = onMessagePublished('new-report', async (event) => {
  const payload = JSON.parse(
    Buffer.from(event.data.message.data, 'base64').toString()
  );
  console.log(`[SwarmAssembler] Triggered for report ${payload.reportId}`);

  // Fetch all available volunteers (online and unassigned)
  const volunteersSnap = await db.collection('volunteers')
    .where('online', '==', true)
    .where('currentMissionId', '==', null)
    .get();

  if (volunteersSnap.empty) {
    console.log('[SwarmAssembler] No available volunteers. Logging resource gap.');
    await db.doc(`reports/${payload.reportId}`).update({
      resourceGap: true,
      resourceGapAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  // Fetch top 20 highest-urgency open reports
  const reportsSnap = await db.collection('reports')
    .where('status', '==', 'PENDING')
    .orderBy('urgencyScore', 'desc')
    .limit(20)
    .get();

  if (reportsSnap.empty) return;

  const volunteers = volunteersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const reports = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Build cost matrix and run Hungarian
  const costMatrix = volunteers.map(v => reports.map(r => computeCost(v, r)));
  const assignment = hungarian(costMatrix);

  // Write missions from optimal assignments
  const batch = db.batch();
  const missionUpdates = [];

  assignment.forEach((reportIdx, volunteerIdx) => {
    if (reportIdx === -1 || reportIdx >= reports.length) return;
    const volunteer = volunteers[volunteerIdx];
    const report = reports[reportIdx];
    const cost = computeCost(volunteer, report);

    const missionRef = db.collection('missions').doc();
    batch.set(missionRef, {
      reportId: report.id,
      volunteerId: volunteer.id,
      volunteerName: volunteer.name || 'Unknown',
      location: report.location || null,
      type: (report.needType || ['GENERAL'])[0],
      severity: report.severity || 3,
      urgencyScore: report.urgencyScore || 0,
      matchCostKm: parseFloat(cost.toFixed(2)),
      algorithm: 'HUNGARIAN_V2',
      status: 'PENDING',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark report as PROCESSING
    batch.update(db.doc(`reports/${report.id}`), {
      status: 'PROCESSING',
      assignedVolunteerId: volunteer.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark volunteer as assigned
    batch.update(db.doc(`volunteers/${volunteer.id}`), {
      currentMissionId: missionRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    missionUpdates.push({ reportId: report.id, volunteerId: volunteer.id, cost });
  });

  await batch.commit();
  console.log(`[SwarmAssembler] Created ${missionUpdates.length} optimal missions.`);
});

module.exports = { swarmAssemblerTrigger };
