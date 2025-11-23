import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GroundingSource, ScheduleResponse, Game } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getNFLSchedule = async (): Promise<{ data: ScheduleResponse | null; rawText: string }> => {
  const today = new Date().toDateString();
  const prompt = `
    You are an NFL scheduler assistant.
    Find the CURRENT or UPCOMING week's NFL schedule relative to today: ${today}.
    
    Task:
    1. Use Google Search to find the schedule for this week.
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
  } catch (error) {
    console.error("Schedule Fetch Error:", error);
    return { data: null, rawText: "" };
  }
};

export const analyzeMatchup = async (
  teamA: string,
  teamB: string
): Promise<{ data: AnalysisResult | null; sources: GroundingSource[]; rawText: string }> => {
  
  const prompt = `
    You are an expert NFL betting analyst.
    Analyze the upcoming NFL matchup between ${teamA} and ${teamB}.
    
    Task:
    1. Search for CURRENT defensive rankings for BOTH teams against specific positions (RB, WR, TE).
    2. Search for key starters (QB, Top 3 WR, Top 2 RB, Top 1 TE) for EACH team.
       - Get their CURRENT SEASON AVERAGES.
       - Get their LAST 5 GAMES stats in a short text format (e.g. "vs Opp: Stat line").
         - For QB: Show Passing Yards & TDs.
         - For RB: Show Rushing Yards.
         - For WR/TE: Show Receptions & Receiving Yards.
    3. For EACH key starter, generate 2 potential parlay legs (e.g. Over Yards, Over Receptions) based on their average, recent performance, and the defense they are facing.
    4. Identify 3-4 "High Confidence" standout betting props from the entire pool.

    Output Requirements:
    - You MUST use Google Search to get real stats.
    - Format the output strictly as a JSON object wrapped in a markdown code block.
    
    JSON Structure:
    {
      "matchup": "${teamA} vs ${teamB}",
      "summary": "Brief executive summary of the defensive matchups.",
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
                    "vs KC: 250 yds, 2 TD",
                    "vs DEN: 180 yds, 1 TD"
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