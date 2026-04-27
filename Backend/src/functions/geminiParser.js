const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { GoogleGenAI, Type } = require('@google/genai');
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub'); // auto-bundled via firebase-functions

const db = admin.firestore();
const pubsub = new PubSub();

// AI client — key stored in Secret Manager in production
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    needType: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Categories: FOOD, WATER, MEDICAL, RESCUE, SHELTER, EDUCATION'
    },
    severity: { type: Type.INTEGER, description: '1 (low) to 5 (critical)' },
    affectedCount: { type: Type.INTEGER, description: 'Estimated people affected' },
    locationDescription: { type: Type.STRING, description: 'Specific location from the text' },
    isLifeThreatening: { type: Type.BOOLEAN },
    language: { type: Type.STRING, description: 'Detected language code e.g. hi, en, mr' },
    summary: { type: Type.STRING, description: 'One-sentence summary in English' },
  },
  required: ['needType', 'severity', 'isLifeThreatening', 'summary'],
};

/**
 * Parse an incident report using Gemini 1.5 Flash with structured output.
 * Supports multilingual input (Hindi, Marathi, Tamil, etc.)
 */
async function parseWithGemini(text) {
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [
      {
        role: 'user',
        parts: [{
          text: `You are an AI disaster relief analyst. Parse this field report and extract structured data.
The report may be in Hindi, English, Marathi, Tamil, or another Indian language. Always respond in English JSON.

Report: "${text}"`
        }]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: REPORT_SCHEMA,
      systemInstruction: 'Extract precise, factual data. Do not hallucinate. If a field is unknown, use a sensible default.'
    }
  });

  return JSON.parse(response.text.trim());
}

/**
 * Calculate initial urgency score using the Urgency Decay Engine formula:
 * U = S × (1 + T/12) × Z + R + W
 * At creation: T=0, R=0, W defaults to 0.5
 */
function calculateInitialScore(severity, zoneDensity = 1.5, weatherBonus = 0.5) {
  return Math.min(10, parseFloat((severity * 1.0 * zoneDensity + weatherBonus).toFixed(1)));
}

/**
 * Firebase Cloud Function — triggered on every new report document.
 */
const onReportCreated = onDocumentCreated('reports/{reportId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const reportId = event.params.reportId;

  // Skip if already AI-processed to prevent re-runs
  if (data.aiProcessed) return;

  const rawText = data.text || data.description || data.type || 'Unknown incident';

  try {
    console.log(`[GeminiParser] Processing report ${reportId}...`);

    const parsed = await parseWithGemini(rawText);
    const urgencyScore = calculateInitialScore(parsed.severity || 3);

    // Update the report document with AI-enriched data
    await db.doc(`reports/${reportId}`).update({
      needType: parsed.needType || ['GENERAL'],
      severity: parsed.severity || 3,
      affectedCount: parsed.affectedCount || 0,
      locationDescription: parsed.locationDescription || data.location || 'Unknown',
      isLifeThreatening: parsed.isLifeThreatening || false,
      detectedLanguage: parsed.language || 'en',
      summary: parsed.summary || rawText,
      urgencyScore,
      aiProcessed: true,
      aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Publish to Pub/Sub to trigger Swarm Assembler
    const message = Buffer.from(JSON.stringify({
      reportId,
      urgencyScore,
      needType: parsed.needType,
      isLifeThreatening: parsed.isLifeThreatening,
    }));

    await pubsub.topic('new-report').publishMessage({ data: message });

    // If CRITICAL, also publish to alert topic for FCM
    if (urgencyScore >= 8.0) {
      await pubsub.topic('critical-alert').publishMessage({
        data: Buffer.from(JSON.stringify({
          reportId,
          urgencyScore,
          summary: parsed.summary,
          location: data.location || parsed.locationDescription,
        }))
      });
    }

    console.log(`[GeminiParser] Report ${reportId} processed. Score: ${urgencyScore}`);
  } catch (err) {
    console.error(`[GeminiParser] Failed for report ${reportId}:`, err);
    // Write a fallback score so the report isn't stuck
    await db.doc(`reports/${reportId}`).update({
      urgencyScore: 3.0,
      aiProcessed: true,
      aiError: err.message,
    });
  }
});

module.exports = { onReportCreated };
