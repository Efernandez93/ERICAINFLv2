
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GroundingSource, ScheduleResponse } from "../types";

// Helper to safely get the API Key from various environments without crashing
const getSafeApiKey = (): string | undefined => {
  try {
    // 1. Try standard Vite/Vercel Frontend key
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  try {
    // 2. Try process.env (Standard Node/CRA/Webpack)
    // We check typeof process first to avoid "ReferenceError: process is not defined" in browsers
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {}

  return undefined;
};

// Log status on load (safely)
const currentKey = getSafeApiKey();
console.log(`[DEBUG] API Key status: ${currentKey ? 'Present' : 'Missing'}`);

export const getNFLSchedule = async (week?: string): Promise<{ data: ScheduleResponse | null; rawText: string; error?: string }> => {
  const apiKey = getSafeApiKey();
  
  if (!apiKey) {
      return { 
          data: null, 
          rawText: "", 
          error: "API Key is missing. Please add VITE_API_KEY or API_KEY to your Vercel Environment Variables." 
      };
  }

  // Initialize AI client inside the function to prevent top-level crashes
  const ai = new GoogleGenAI({ apiKey });

  const today = new Date().toDateString();
  const weekQuery = week ? `NFL ${week}` : `the CURRENT or UPCOMING week's NFL schedule relative to today: ${today}`;
  
  const prompt = `
    You are ERIC (Expert Real-time Intelligent Capper), an elite NFL scheduler assistant.
    Find the schedule for ${weekQuery}.
    
    Task:
    1. Use Google Search to find the schedule for the requested week.
    2. Return a JSON object containing the week number/label and the list of games.
    
    JSON Structure:
    {
      "week": "Week 12",
      "games": [
        { "homeTeam": "Chiefs", "awayTeam": "Raiders", "time": "1:00 PM ET", "date": "Sunday, Nov 26", "id": "kc-lv-2023" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let parsedData: ScheduleResponse | null = null;

    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse schedule JSON", e);
      }
    }

    return { data: parsedData, rawText: text };
  } catch (error: any) {
    console.error("Schedule Fetch Error:", error);
    let errorMessage = "Failed to load schedule.";
    
    if (error.message?.includes("API_KEY") || error.toString().includes("API key")) {
        errorMessage = "API Key is missing or invalid.";
    } else if (error.message?.includes("403")) {
        errorMessage = "API Key not authorized (Check quotas or billing).";
    }

    return { data: null, rawText: "", error: errorMessage };
  }
};

export const analyzeMatchup = async (
  teamA: string,
  teamB: string
): Promise<{ data: AnalysisResult | null; sources: GroundingSource[]; rawText: string }> => {
  
  const apiKey = getSafeApiKey();
  if (!apiKey) {
      throw new Error("API Key is missing. Please check your environment variables (VITE_API_KEY or API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey });

  const today = new Date().toDateString();

  const prompt = `
    You are ERIC (Expert Real-time Intelligent Capper), an elite professional sports bettor and analyst.
    Today is ${today}.
    Analyze the upcoming NFL matchup between ${teamA} and ${teamB}.

    CRITICAL INSTRUCTIONS FOR DATA ACCURACY:
    1. **DO NOT GUESS STATS.** You must use Google Search to find the actual data.
    2. **PRIORITIZE THESE SOURCES:** ESPN, Pro-Football-Reference, NFL.com, CBS Sports.
    3. **VERIFY ACTIVE ROSTER:** Ensure players analyzed are not on IR (Injured Reserve) or Ruled Out.

    Task:
    1. Search for "[${teamA} vs ${teamB}] injury report" and "depth chart" to confirm active starters.
    2. Search for "NFL defense rankings vs position 2024" to get accurate defensive stats.
    3. FOR EACH KEY STARTER (QB, Top RB, Top WR):
       - Search explicitly for: "[Player Name] game log 2024 ESPN" or "[Player Name] last 5 games stats".
       - Extract the MOST RECENT 5 games played relative to ${today}.
       - If a player was injured/out, skip those games and find games they actually played in.

    Output Requirements:
    - Format the output strictly as a JSON object wrapped in a markdown code block.
    
    JSON Structure:
    {
      "matchup": "${teamA} vs ${teamB}",
      "summary": "Brief executive summary of the defensive matchups and key advantages.",
      "defenseStats": [
        { "position": "TE", "rank": "32nd", "avgAllowed": "65 yds/g", "description": "Team Name defense vs TEs" }
      ],
      "rosters": {
        "teamA": {
            "teamName": "${teamA}",
            "players": [
                { 
                  "name": "Player Name", 
                  "position": "Pos", 
                  "avgStats": "Season Avg String",
                  "last5Games": [
                     { "opponent": "vs KC", "date": "Oct 12", "stats": { "Rec": 5, "Yds": 62, "TD": 0 } },
                     { "opponent": "@ DEN", "date": "Oct 05", "stats": { "Rec": 3, "Yds": 45, "TD": 1 } }
                  ],
                  "suggestedLegs": [
                      {
                        "id": "leg-1",
                        "player": "Player Name",
                        "team": "${teamA}",
                        "position": "Pos",
                        "propType": "e.g. Receiving Yards",
                        "line": 50.5,
                        "confidence": 75,
                        "reasoning": "Avg is 60, Defense ranks 20th",
                        "playerAvg": 60.0,
                        "defenseAllowedVsPos": "55.0"
                      }
                  ]
                }
            ]
        },
        "teamB": {
            "teamName": "${teamB}",
            "players": [] 
        }
      },
      "legs": [
        {
          "id": "unique-id-main-1", 
          "player": "Player Name",
          "team": "Team Name",
          "position": "Pos",
          "propType": "e.g. Receiving Yards",
          "line": 50.5,
          "confidence": 85,
          "reasoning": "Detailed reason why...",
          "playerAvg": 62.0,
          "defenseAllowedVsPos": "70.5"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    // Extract Grounding Metadata
    const sources: GroundingSource[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
          });
        }
      });
    }

    // Parse JSON
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let parsedData: AnalysisResult | null = null;

    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedData = JSON.parse(jsonMatch[1]);
        
        // Ensure IDs exist for main legs
        if (parsedData && parsedData.legs) {
            parsedData.legs = parsedData.legs.map((leg, i) => ({
                ...leg,
                id: leg.id || `leg-${Date.now()}-${i}`
            }));
        }

        // Ensure IDs exist for roster suggested legs
        if (parsedData && parsedData.rosters) {
            ['teamA', 'teamB'].forEach((key) => {
                const teamKey = key as keyof typeof parsedData.rosters;
                const team = parsedData.rosters![teamKey];
                if (team && team.players) {
                    team.players.forEach((player) => {
                        if (player.suggestedLegs) {
                            player.suggestedLegs = player.suggestedLegs.map((leg, i) => ({
                                ...leg,
                                id: leg.id || `roster-leg-${Date.now()}-${player.name.replace(/\s/g, '')}-${i}`
                            }));
                        }
                    });
                }
            });
        }

      } catch (e) {
        console.error("Failed to parse extracted JSON", e);
      }
    }

    return {
      data: parsedData,
      sources,
      rawText: text,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
