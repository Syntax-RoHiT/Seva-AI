import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file.");
  }
  if (!genAI) genAI = new GoogleGenAI({ apiKey: key });
  return genAI;
};

export interface ParsedReport {
  needType: string[];
  severity: number;
  affectedCount: number;
  locationDescription: string;
  isLifeThreatening: boolean;
  summary: string;
}

/**
 * Parses a text-based report into structured data.
 */
export const parseIncidentReport = async (text: string): Promise<ParsedReport> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: `Analyze this disaster relief report and extract structured data: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needType: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Types of aid needed (e.g., Medical, Food, Rescue, Water, Shelter, Power)"
          },
          severity: {
            type: Type.INTEGER,
            description: "Severity score from 1 to 5"
          },
          affectedCount: {
            type: Type.INTEGER,
            description: "Estimated number of people affected"
          },
          locationDescription: {
            type: Type.STRING,
            description: "Specific location details mentioned"
          },
          isLifeThreatening: {
            type: Type.BOOLEAN,
            description: "Whether the situation is immediately life-threatening"
          },
          summary: {
            type: Type.STRING,
            description: "A 1-sentence summary of the incident"
          }
        },
        required: ["needType", "severity", "isLifeThreatening", "summary"]
      }
    }
  });

  try {
    const text = response.text || "";
    return JSON.parse(text) as ParsedReport;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      needType: ["General"],
      severity: 3,
      affectedCount: 0,
      locationDescription: "Unknown",
      isLifeThreatening: false,
      summary: "Incident report received."
    };
  }
};

/**
 * Parses an image-based report (OCR + Context) into structured data.
 */
export const parseImageReport = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<ParsedReport> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image.split(",")[1] || base64Image,
              mimeType: mimeType
            }
          },
          { text: "Extract structured data from this field report or survey form. Identify the type of need, severity, location, and population affected. If handwritten, use your best OCR capabilities." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needType: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          severity: {
            type: Type.INTEGER
          },
          affectedCount: {
            type: Type.INTEGER
          },
          locationDescription: {
            type: Type.STRING
          },
          isLifeThreatening: {
            type: Type.BOOLEAN
          },
          summary: {
            type: Type.STRING
          }
        },
        required: ["needType", "severity", "isLifeThreatening", "summary"]
      }
    }
  });

  try {
    const text = response.text || "";
    return JSON.parse(text) as ParsedReport;
  } catch (error) {
    console.error("Failed to parse image report", error);
    return {
      needType: ["General"],
      severity: 3,
      affectedCount: 0,
      locationDescription: "Extracted from image",
      isLifeThreatening: false,
      summary: "Image report processed."
    };
  }
};

export const chatWithAssistant = async (message: string, history: any[] = []) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-1.5-flash",
    history: history,
    config: {
      systemInstruction: `You are SevaAI Tactical Assistant, a high-tech mission control AI for disaster relief. 
      Tone: Technical, efficient, supportive. Use tactical jargon. 
      Help NGO admins and volunteers with logistics, data analysis, and task matching.`,
    }
  });

  const response = await chat.sendMessage(message);
  return response.text;
};

export const summarizeSituation = async (reports: any[]) => {
  const reportsText = reports.map(r => `[${r.type}] Severity ${r.severity}: ${r.summary}`).join('\n');
  
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: `Summarize the current situation and provide 3 tactical priority actions:\n${reportsText}`,
    config: {
      systemInstruction: "You are SevaAI Tactical Oversight. Provide a high-level sitrep. Be concise."
    }
  });

  return response.text;
};

