export interface DefenseStat {
  position: string; // e.g., "RB", "WR1", "TE"
  rank: string | number; // e.g., "32nd" or 32
  avgAllowed: string | number; // e.g., "120.5 yards"
  description: string;
}

export interface ParlayLeg {
  id: string; // Unique identifier for pinning
  player: string;
  team: string;
  position: string;
  propType: string; // e.g., "Receiving Yards"
  line: number;
  confidence: number; // 0-100
  reasoning: string;
  playerAvg: number;
  defenseAllowedVsPos: number | string;
}

export interface GameLog {
  opponent: string;
  date?: string;
  stats: Record<string, string | number>; // e.g. { "Rec": 5, "Yds": 50 }
}

export interface PlayerStat {
  name: string;
  position: string;
  avgStats: string; // e.g. "5.4 rec, 72.5 yds, 0.5 TD"
  last5Games?: GameLog[]; // Structured game logs
  suggestedLegs?: ParlayLeg[];
}

export interface TeamRoster {
  teamName: string;
  players: PlayerStat[];
}

export interface AnalysisResult {
  matchup: string;
  defenseStats: DefenseStat[];
  legs: ParlayLeg[];
  summary: string;
  rosters?: {
    teamA: TeamRoster;
    teamB: TeamRoster;
  };
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  date: string;
  status?: string;
}

export interface ScheduleResponse {
  week: string;
  games: Game[];
}