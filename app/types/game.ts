export interface GameSolution {
  target: number;
  total_solved_combinations: number;
  solutions: {
    [key: string]: string[];
  };
}

export interface Question {
  numbers: number[];
  hash: string;
  difficulty: number;
  solutions: string[];
}

export interface UserQuestionRecord {
  timestamp: string;
  solved: boolean;
  attempts?: number;
  timeSpent?: number;
}

export interface UserQuestionsData {
  last_7_days: {
    [questionHash: string]: UserQuestionRecord;
  };
}

export interface GameRecord {
  device_id: string;
  nickname: string;
  question_hash: string;
  expression: string;
  result: number;
  is_correct: boolean;
  time_spent?: number;
  country?: string;
}

export interface LeaderboardEntry {
  device_id: string;
  nickname: string;
  country?: string;
  games_played: number;
  games_won: number;
  best_time?: number;
  total_playtime: number;
  win_rate: number;
}

export interface QuestionRequest {
  numbers: number[];
  difficulty: number;
  hint?: string;
  countryCode?: string;
}

export interface SubmitRequest {
  numbers: number[];
  expression: string;
  timeSpent?: number;
}