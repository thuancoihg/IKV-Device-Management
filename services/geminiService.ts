
import { GoogleGenAI } from "@google/genai";
import { Device } from "../types";

export const geminiService = {
  analyzeInventory: async (devices: Device[]) => {
    // Guideline: Always use process.env.API_KEY directly and create instance inside the call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    if (!process.env.API_KEY) return "AI Insights requires an API Key. Please configure it in your environment.";
    if (devices.length === 0) return "No data to analyze yet.";

    const deviceSummary = devices.map(d => 
      `${d.type} (${d.manufacturer} ${d.model}) - Serial: ${d.serialNumber}, Warranty: ${d.warrantyExpiry}`
    ).join('\n');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As an IT Asset Manager, analyze this device inventory and provide 3-4 concise professional insights regarding maintenance, lifecycle management, or risks. Focus on upcoming warranty expirations or brand diversity. List them as bullet points. 
        
        Inventory:
        ${deviceSummary}`,
        config: {
          temperature: 0.7,
        }
      });

      // Guideline: Access .text property directly, not as a method
      return response.text || "Could not generate insights at this time.";
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return "AI Analysis failed. Check your API key or internet connection.";
    }
  }
};
