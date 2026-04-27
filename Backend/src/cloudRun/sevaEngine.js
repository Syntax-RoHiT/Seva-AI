const express = require('express');
const admin = require('firebase-admin');
const { vertexAIReason } = require('./services/vertexAIService');
const { getWeatherRisk } = require('./services/weatherService');
const { hungarian } = require('./services/hungarianService');

admin.initializeApp();
const db = admin.firestore();
const app = express();
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'seva-engine', timestamp: new Date().toISOString() });
});

// ─── POST /process-report ─────────────────────────────────────────────────────
/**
 * Called by Firestore Cloud Function trigger after basic parsing.
 * Uses Gemma 4 31B for deep contextual reasoning and agentic function calling.
 */
app.post('/process-report', async (req, res) => {
  const { reportId } = req.body;
  if (!reportId) return res.status(400).json({ error: 'reportId required' });

  try {
    const docSnap = await db.doc(`reports/${reportId}`).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Report not found' });

    const data = docSnap.data();

    // Step 1: Get weather risk for location (agentic function call)
    let weatherBonus = 0.5;
    let weatherContext = 'Weather data unavailable';
    if (data.location?.lat && data.location?.lng) {
      const weather = await getWeatherRisk(data.location.lat, data.location.lng);
      weatherBonus = weather.bonus;
      weatherContext = weather.description;
    }

    // Step 2: Deep reasoning with Gemma 4 31B
    const reasoning = await vertexAIReason({
      report: data,
      weatherContext,
      instruction: `Analyze this disaster report from India.
Context: ${weatherContext}
Report: ${data.summary || data.text}
Location: ${data.locationDescription || 'Unknown'}
Severity: ${data.severity}/5, Need Types: ${(data.needType || []).join(', ')}

Reason through: Is this life-threatening? What is the population vulnerability? 
Are there compounding factors (weather + elderly population = higher risk)?
Output ONLY valid JSON with: { "adjustedSeverity": 1-5, "riskReasoning": "...", "compoundFactors": ["..."], "recommendedAction": "...", "urgencyMultiplier": 0.5-2.0 }`
    });

    // Step 3: Apply Urgency Decay Formula with adjusted factors
    const S = reasoning.adjustedSeverity || data.severity || 3;
    const Z = 1.5; // urban default
    const R = data.repeatBonus || 0;
    const W = weatherBonus;
    const multiplier = reasoning.urgencyMultiplier || 1.0;
    const urgencyScore = Math.min(10, parseFloat(
      (S * 1.0 * Z * multiplier + R + W).toFixed(1)
    ));

    // Step 4: Update Firestore with enriched data
    await db.doc(`reports/${reportId}`).update({
      urgencyScore,
      adjustedSeverity: reasoning.adjustedSeverity,
      riskReasoning: reasoning.riskReasoning,
      compoundFactors: reasoning.compoundFactors || [],
      recommendedAction: reasoning.recommendedAction,
      weatherBonus,
      weatherContext,
      sevaEngineProcessed: true,
      sevaEngineProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[SEVAEngine] Report ${reportId} reasoned. Score: ${urgencyScore}`);
    res.json({ reportId, urgencyScore, reasoning });

  } catch (err) {
    console.error('[SEVAEngine] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /swarm-cycle ────────────────────────────────────────────────────────
/**
 * Runs the Swarm Assembler on demand.
 * Called by the admin dashboard "Swarm Assembler" button via Cloud Run.
 */
app.post('/swarm-cycle', async (req, res) => {
  try {
    // Fetch available volunteers and open reports
    const [volSnap, repSnap] = await Promise.all([
      db.collection('volunteers').where('online', '==', true).where('currentMissionId', '==', null).get(),
      db.collection('reports').where('status', '==', 'PENDING').orderBy('urgencyScore', 'desc').limit(30).get(),
    ]);

    const volunteers = volSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const reports    = repSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (volunteers.length === 0 || reports.length === 0) {
      return res.json({ matched: 0, message: 'No volunteers or reports available' });
    }

    // Build cost matrix and run Hungarian
    const { getDistanceMatrix } = require('./services/distanceMatrixService');
    const costMatrix = await getDistanceMatrix(volunteers, reports);
    const assignment = hungarian(costMatrix);

    // Write missions
    const batch = db.batch();
    let matched = 0;
    assignment.forEach((reportIdx, volunteerIdx) => {
      if (reportIdx < 0 || reportIdx >= reports.length) return;
      const v = volunteers[volunteerIdx];
      const r = reports[reportIdx];
      const mRef = db.collection('missions').doc();
      batch.set(mRef, {
        reportId: r.id, volunteerId: v.id, volunteerName: v.name,
        urgencyScore: r.urgencyScore, severity: r.severity,
        type: (r.needType || ['GENERAL'])[0],
        location: r.location || null,
        algorithm: 'HUNGARIAN_V2_CLOUD_RUN',
        status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.update(db.doc(`reports/${r.id}`), { status: 'PROCESSING', assignedVolunteerId: v.id });
      batch.update(db.doc(`volunteers/${v.id}`), { currentMissionId: mRef.id });
      matched++;
    });
    await batch.commit();
    res.json({ matched, volunteers: volunteers.length, reports: reports.length });

  } catch (err) {
    console.error('[SEVAEngine] Swarm cycle error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`[SEVAEngine] Running on port ${PORT}`));
module.exports = app;
