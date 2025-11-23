
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GroundingSource, ScheduleResponse, TeamRoster } from "../types";

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

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toDateString();
  const weekQuery = week ? `NFL ${week}` : `the CURRENT or UPCOMING week's NFL schedule relative to today: ${today}`;
  
  const prompt = `
    You are ERIC (Expert Real-time Intelligent Capper), an elite NFL scheduler assistant.
    Find the schedule for ${weekQuery}.
    
    Task:
    1. Use Google Search to find the schedule for the requested week.
    2. Return a JSON object containing the week number/label and the list of games.
    3. CRITICAL: Include the 2 or 3 letter Team Abbreviation (e.g., KC, SF, CHI, LV, NE, TB) for every team. This is used for generating logos.
    
    JSON Structure:
    {
      "week": "Week 12",
      "games": [
        { 
            "homeTeam": "Chiefs", "homeTeamAbbr": "KC",
            "awayTeam": "Raiders", "awayTeamAbbr": "LV",
            "time": "1:00 PM ET", "date": "Sunday, Nov 26", "id": "kc-lv-2023" 
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
    return { data: null, rawText: "", error: error.message || "Failed to load schedule." };
  }
};

/**
 * STAGE 1: Fast fetch of Depth Chart and Game Logs
 */
export const getKeyPlayersAndStats = async (
  teamA: string, 
  teamB: string
): Promise<{ rosters: { teamA: TeamRoster, teamB: TeamRoster } | null }> => {
    
    const apiKey = getSafeApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const today = new Date().toDateString();

    const prompt = `
        You are a strict sports data retrieval engine.
        Context: ${teamA} vs ${teamB}. Today is ${today}.
        
        TASK 1: OFFICIAL DEPTH CHART & ABBREVIATIONS
        Search for the "Official Depth Chart" for both teams.
        Find the 2 or 3 letter Team Abbreviation (e.g. KC, SF, GB) for both teams.
        
        Identify the current STARTER for these specific positions:
        - QB (Quarterback)
        - RB (Running Back - Starter)
        - WR1 (Top Wide Receiver)
        - WR2 (Second Wide Receiver)
        - WR3 (Slot/Third Wide Receiver)
        - TE (Tight End - Starter)
        
        TASK 2: LAST 5 GAME LOGS (STRICT ACCURACY)
        For EACH starter identified above, retrieve their LAST 5 COMPLETED GAMES.
        - SEARCH QUERY: "[Player Name] game log ESPN" or "[Player Name] game log Pro Football Reference".
        - You MUST verify the exact stats (Receptions, Yards, TDs) from the search result.
        - DO NOT GUESS. DO NOT use projected stats.
        - If the player was injured or did not play, record "DNP" or skip that specific game entry.

        OUTPUT: Return ONLY valid JSON.
        
        JSON Format:
        {
            "teamA": {
                "teamName": "${teamA}",
                "teamAbbr": "CHI",
                "players": [
                    {
                        "name": "Caleb Williams",
                        "position": "QB",
                        "avgStats": "210 yds/g, 1.2 TD",
                        "last5Games": [
                             { "opponent": "vs GB", "stats": { "PassYds": 205, "TD": 0, "Int": 1 } }
                        ]
                    }
                ]
            },
            "teamB": { 
                "teamName": "${teamB}", 
                "teamAbbr": "GB",
                "players": [] 
            }
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        const text = response.text || "";
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch && jsonMatch[1]) {
            return { rosters: JSON.parse(jsonMatch[1]) };
        }
        return { rosters: null };
    } catch (e) {
        console.error("Fast Roster Fetch Failed", e);
        return { rosters: null };
    }
};

/**
 * STAGE 2: Deep Analysis and Legs
 */
export const getDeepAnalysis = async (
    teamA: string,
    teamB: string,
    preloadedRosters: any,
    onStreamUpdate?: (partialText: string) => void
): Promise<{ data: AnalysisResult | null; sources: GroundingSource[]; rawText: string }> => {
    
    const apiKey = getSafeApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    // We pass the roster data context to the AI so it doesn't have to search for it again
    const contextStr = JSON.stringify(preloadedRosters);

    const prompt = `
      You are ERIC (Expert Real-time Intelligent Capper).
      Analyze the NFL matchup: ${teamA} vs ${teamB}.
      
      I have already retrieved the DEPTH CHART and STATS data:
      ${contextStr}

      YOUR TASK:
      1. Analyze the DEFENSIVE RANKINGS for both teams (e.g. "Rank 32nd vs pass").
      2. Match specific defensive weaknesses to the STARTERS listed in the roster data.
      3. Generate High Value Parlay Legs based on this matchup logic.

      OUTPUT:
      Streaming text analysis explaining your thought process, followed immediately by a JSON block.

      JSON Structure:
      {
        "matchup": "${teamA} vs ${teamB}",
        "summary": "Executive summary...",
        "defenseStats": [
             { "position": "QB", "rank": "32nd", "avgAllowed": "300 yds", "description": "Team B allows most pass yds" }
        ],
        "legs": [
             {
                "id": "leg-1",
                "player": "Name",
                "team": "Team",
                "position": "Pos",
                "propType": "Passing Yards",
                "line": 250.5,
                "confidence": 85,
                "reasoning": "...",
                "playerAvg": 260,
                "defenseAllowedVsPos": 290
             }
        ]
      }
    `;

    try {
        const streamResult = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });

        let fullText = "";
        for await (const chunk of streamResult) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                if (onStreamUpdate) onStreamUpdate(fullText);
            }
        }

        const sources: GroundingSource[] = [];
        const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
        let parsedData: AnalysisResult | null = null;

        if (jsonMatch && jsonMatch[1]) {
            try {
                parsedData = JSON.parse(jsonMatch[1]);
                
                // Add unique IDs
                if (parsedData?.legs) {
                    parsedData.legs = parsedData.legs.map((leg, i) => ({
                        ...leg,
                        id: leg.id || `leg-${Date.now()}-${i}`
                    }));
                }
            } catch (e) {
                console.error("JSON Parse Error in Deep Analysis", e);
            }
        }

        return {
            data: parsedData,
            sources,
            rawText: fullText
        };

    } catch (error) {
        console.error("Deep Analysis Error", error);
        throw error;
    }
};

/**
 * Legacy/Combined function if needed, or used for direct one-shot analysis
 */
export const analyzeMatchup = async (
  teamA: string,
  teamB: string,
  onStreamUpdate?: (partialText: string) => void
): Promise<{ data: AnalysisResult | null; sources: GroundingSource[]; rawText: string }> => {
    // Falls back to the split approach for better performance internally
    const { rosters } = await getKeyPlayersAndStats(teamA, teamB);
    const result = await getDeepAnalysis(teamA, teamB, rosters, onStreamUpdate);
    
    // Merge rosters into result
    if (result.data && rosters) {
        result.data.rosters = rosters;
    }
    
    return result;
};
