import { GameLog, PlayerStat } from '../types';

export interface StatSummary {
  name: string;
  value: number;
  min: number;
  max: number;
  average: number;
  variance: number;
}

/**
 * Parses game logs and extracts numeric statistics
 * Calculates averages, min, max, and variance for each stat
 */
export const StatParser = {
  /**
   * Extract all stat names from a player's game logs
   */
  getStatNames: (gameLogs?: GameLog[]): string[] => {
    if (!gameLogs || gameLogs.length === 0) return [];

    const firstGame = gameLogs[0];
    if (!firstGame.stats) return [];

    return Object.keys(firstGame.stats).filter(key => {
      const value = firstGame.stats[key];
      return typeof value === 'number' || !isNaN(Number(value));
    });
  },

  /**
   * Parse a single stat value (handle strings like "210" or numbers)
   */
  parseStatValue: (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  },

  /**
   * Calculate statistics for a specific stat across all games
   */
  calculateStatSummary: (
    statName: string,
    gameLogs?: GameLog[]
  ): StatSummary | null => {
    if (!gameLogs || gameLogs.length === 0) return null;

    const values: number[] = [];

    gameLogs.forEach(log => {
      if (log.stats && log.stats[statName] !== undefined) {
        const val = StatParser.parseStatValue(log.stats[statName]);
        values.push(val);
      }
    });

    if (values.length === 0) return null;

    // Calculate statistics
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate variance (standard deviation)
    const squaredDiffs = values.map(v => Math.pow(v - average, 2));
    const variance = Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / values.length
    );

    return {
      name: statName,
      value: average,
      min,
      max,
      average,
      variance: parseFloat(variance.toFixed(2))
    };
  },

  /**
   * Calculate all stat summaries for a player
   */
  getAllStatSummaries: (
    gameLogs?: GameLog[]
  ): StatSummary[] => {
    const statNames = StatParser.getStatNames(gameLogs);
    const summaries: StatSummary[] = [];

    statNames.forEach(statName => {
      const summary = StatParser.calculateStatSummary(statName, gameLogs);
      if (summary) {
        summaries.push(summary);
      }
    });

    return summaries;
  },

  /**
   * Calculate safe recommendation (conservative line below average)
   * Rounds to nearest 5-yard increment for betting purposes
   * Typically 15-20% below average to be conservative
   */
  calculateSafeRecommendation: (average: number, conservativePercent: number = 15): number => {
    const reduction = average * (conservativePercent / 100);
    const recommended = average - reduction;
    // Round to nearest 5-yard increment
    return Math.round(recommended / 5) * 5;
  },

  /**
   * Determine safety score based on consistency
   * Lower variance = higher safety score (0-100)
   */
  calculateSafetyScore: (average: number, variance: number): number => {
    if (average === 0) return 0;

    // Calculate coefficient of variation (variance / mean)
    const coefficientOfVariation = variance / average;

    // Convert to safety score: lower CV = higher safety (0-100)
    // CV of 0.1 = 90 safety, CV of 0.3 = 70 safety, CV of 0.5+ = 50 or lower
    const safetyScore = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));

    return parseFloat(safetyScore.toFixed(0));
  },

  /**
   * Calculate defense advantage score based on opponent's ranking
   * Lower rank number = stronger defense = lower allowed stats = higher advantage
   * Returns 0-100 advantage score
   */
  calculateDefenseAdvantage: (rank: string | number): number => {
    let rankNum = typeof rank === 'string' ? parseInt(rank) : rank;

    // If rank is something like "32nd", extract the number
    if (typeof rank === 'string' && rank.includes('nd')) {
      rankNum = parseInt(rank.match(/\d+/)?.[0] || '16') || 16;
    }

    // Rank 1 (best defense) = 100 advantage, Rank 32 (worst defense) = 0 advantage
    const advantage = Math.max(0, 100 - (rankNum * 3.125));
    return parseFloat(advantage.toFixed(0));
  },

  /**
   * Get top N safest legs from a player's stats
   * Returns legs sorted by combined safety + defense advantage score
   * Incorporates defense rankings to weight recommendations
   */
  getTopSafeLegs: (
    player: PlayerStat,
    teamName: string,
    limit: number = 5,
    defenseRank?: string | number
  ): Array<{
    player: string;
    team: string;
    position: string;
    statName: string;
    average: number;
    recommended: number;
    min: number;
    max: number;
    safetyScore: number;
    defenseAdvantage: number;
    variance: number;
  }> => {
    const summaries = StatParser.getAllStatSummaries(player.last5Games);
    const defenseAdvantage = defenseRank ? StatParser.calculateDefenseAdvantage(defenseRank) : 0;

    const legs = summaries.map(summary => ({
      player: player.name,
      team: teamName,
      position: player.position,
      statName: summary.name,
      average: parseFloat(summary.average.toFixed(1)),
      recommended: StatParser.calculateSafeRecommendation(summary.average, 15),
      min: parseFloat(summary.min.toFixed(1)),
      max: parseFloat(summary.max.toFixed(1)),
      variance: summary.variance,
      safetyScore: StatParser.calculateSafetyScore(summary.average, summary.variance),
      defenseAdvantage
    }));

    // Sort by combined score: 60% safety score + 40% defense advantage
    return legs
      .map(leg => ({
        ...leg,
        combinedScore: (leg.safetyScore * 0.6) + (leg.defenseAdvantage * 0.4)
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit)
      .map(({ combinedScore, ...leg }) => leg);
  }
};
