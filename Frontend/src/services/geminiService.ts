import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ParsedReport {
  needType: string[];
  severity: number;
  affectedCount: number;
  locationDescription: string;
  isLifeThreatening: boolean;
}

export const parseIncidentReport = async (text: string): Promise<ParsedReport> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
          }
        },
        required: ["needType", "severity", "isLifeThreatening"]
      }
    }
  });

  try {
    return JSON.parse(response.text.trim()) as ParsedReport;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      needType: ["General"],
      severity: 3,
      affectedCount: 0,
      locationDescription: "Unknown",
      isLifeThreatening: false
    };
  }
};

export const chatWithAssistant = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: history,
    config: {
      systemInstruction: `You are SevaAI Tactical Assistant, a high-tech mission control AI for disaster relief and NGO management. 
      Your tone is technical, efficient, and supportive. Use tactical language (e.g., "Scanning sector", "Signal locked", "Mission authorized").
      Help users with reporting incidents, managing volunteers, analyzing data, and coordinating relief efforts.
      Keep responses concise and impactful.`,
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};

export const summarizeSituation = async (reports: any[]) => {
  const reportsText = reports.map(r => `[${r.type}] Severity ${r.severity}: ${r.text}`).join('\n');
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the current disaster situation and provide tactical recommendations based on these reports:\n${reportsText}`,
    config: {
      systemInstruction: "You are SevaAI Tactical Oversight. Provide a high-level summary (sitrep) and 3 priority action items. Use tactical, concise language."
    }
  });

  return response.text;
};
