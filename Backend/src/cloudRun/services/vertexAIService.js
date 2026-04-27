const { VertexAI } = require('@google-cloud/vertexai');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'seva-ai-prod';
const LOCATION   = 'us-central1';
const MODEL      = 'gemma-3-27b-it'; // Gemma 4 31B when GA on Vertex

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// ─── Function Declarations (Agentic Tool Calling) ─────────────────────────────

const TOOL_DECLARATIONS = [
  {
    name: 'get_weather_risk',
    description: 'Gets current weather conditions and risk level for a GPS coordinate. Use this to factor in flood, heat, or storm risks when assessing disaster severity.',
    parameters: {
      type: 'object',
      properties: {
        latitude:  { type: 'number', description: 'Latitude' },
        longitude: { type: 'number', description: 'Longitude' },
      },
      required: ['latitude', 'longitude'],
    },
  },
  {
    name: 'check_population_density',
    description: 'Returns population density and vulnerability index for a given area. Used to adjust urgency scoring.',
    parameters: {
      type: 'object',
      properties: {
        latitude:  { type: 'number' },
        longitude: { type: 'number' },
        radiusKm:  { type: 'number', description: 'Search radius in km', default: 1 },
      },
      required: ['latitude', 'longitude'],
    },
  },
];

// ─── Tool Response Handlers ──────────────────────────────────────────────────

const { getWeatherRisk } = require('./weatherService');

async function handleToolCall(toolName, args) {
  if (toolName === 'get_weather_risk') {
    const result = await getWeatherRisk(args.latitude, args.longitude);
    return JSON.stringify(result);
  }
  if (toolName === 'check_population_density') {
    // Simplified — in production this calls a Census API
    return JSON.stringify({
      densityPerKm2: 8500,
      vulnerabilityIndex: 0.7,
      elderlyPercent: 12,
      description: 'Dense urban area with moderate vulnerability'
    });
  }
  return JSON.stringify({ error: 'Unknown tool' });
}

// ─── Main Reasoning Function ──────────────────────────────────────────────────

/**
 * Sends a disaster report to Gemma 4 31B for deep agentic reasoning.
 * The model can call tools (weather, population density) before responding.
 *
 * @param {{ report: object, weatherContext: string, instruction: string }} params
 * @returns {Promise<{ adjustedSeverity: number, riskReasoning: string, urgencyMultiplier: number, ... }>}
 */
async function vertexAIReason({ report, weatherContext, instruction }) {
  const model = vertexAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
    systemInstruction: {
      parts: [{
        text: `You are the SEVA Engine — an expert disaster relief AI for India.
You reason through disaster reports to assess true severity accounting for:
- Weather conditions (floods compound medical needs)
- Population vulnerability (elderly/children = higher risk)
- Compound factors (e.g., flood + medical + remote location = CRITICAL)
Always call available tools to get real data before making decisions.
Output only valid JSON as instructed.`
      }]
    },
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });

  const chat = model.startChat();

  // Initial message with the report
  let response = await chat.sendMessage([{ text: instruction }]);
  let candidate = response.response.candidates?.[0];

  // Agentic loop — handle tool calls until model produces final text
  let maxIterations = 3;
  while (candidate?.content?.parts?.some(p => p.functionCall) && maxIterations-- > 0) {
    const toolCalls = candidate.content.parts.filter(p => p.functionCall);
    const toolResponses = await Promise.all(
      toolCalls.map(async (part) => {
        const result = await handleToolCall(part.functionCall.name, part.functionCall.args || {});
        return {
          functionResponse: {
            name: part.functionCall.name,
            response: { content: result },
          },
        };
      })
    );

    // Send tool results back to model
    response = await chat.sendMessage(toolResponses);
    candidate = response.response.candidates?.[0];
  }

  // Extract final JSON response
  const text = candidate?.content?.parts?.find(p => p.text)?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  try {
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {
      adjustedSeverity: report.severity || 3,
      riskReasoning: 'Unable to parse reasoning response',
      compoundFactors: [],
      recommendedAction: 'Manual review required',
      urgencyMultiplier: 1.0,
    };
  } catch {
    return {
      adjustedSeverity: report.severity || 3,
      riskReasoning: text.substring(0, 500),
      compoundFactors: [],
      recommendedAction: 'Manual review required',
      urgencyMultiplier: 1.0,
    };
  }
}

module.exports = { vertexAIReason };
