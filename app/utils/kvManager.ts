import type { UserQuestionsData, UserQuestionRecord } from '../types/game';

export class KVManager {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * 获取用户题目记录
   */
  async getUserQuestions(deviceId: string): Promise<UserQuestionsData> {
    try {
      const data = await this.kv.get(`user_questions:${deviceId}`);
      return data ? JSON.parse(data) : { last_7_days: {} };
    } catch {
      return { last_7_days: {} };
    }
  }

  /**
   * 保存用户题目记录
   */
  async saveUserQuestions(deviceId: string, data: UserQuestionsData): Promise<void> {
    const key = `user_questions:${deviceId}`;
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: 7 * 24 * 60 * 60 // 7天过期
    });
  }

  /**
   * 添加题目记录
   */
  async addQuestionRecord(
    deviceId: string,
    questionHash: string,
    solved: boolean = false,
    timeSpent?: number
  ): Promise<void> {
    const userQuestions = await this.getUserQuestions(deviceId);
    const now = new Date().toISOString();

    const record: UserQuestionRecord = {
      timestamp: now,
      solved,
      timeSpent
    };

    // 如果已存在，更新记录
    if (userQuestions.last_7_days[questionHash]) {
      const existing = userQuestions.last_7_days[questionHash];
      record.attempts = (existing.attempts || 0) + 1;
      record.timeSpent = Math.min(existing.timeSpent || Infinity, timeSpent || 0);
      if (solved && !existing.solved) {
        record.solved = true;
        record.timeSpent = timeSpent;
      } else if (!solved) {
        record.solved = existing.solved;
      }
    } else {
      record.attempts = 1;
    }

    userQuestions.last_7_days[questionHash] = record;

    // 清理过期记录（超过7天的）
    this.cleanupExpiredRecords(userQuestions);

    await this.saveUserQuestions(deviceId, userQuestions);
  }

  /**
   * 获取用户7天内已玩过的题目哈希
   */
  async getPlayedQuestionHashes(deviceId: string): Promise<Set<string>> {
    const userQuestions = await this.getUserQuestions(deviceId);
    return new Set(Object.keys(userQuestions.last_7_days));
  }

  /**
   * 检查用户是否玩过某个题目
   */
  async hasPlayedQuestion(deviceId: string, questionHash: string): Promise<boolean> {
    const userQuestions = await this.getUserQuestions(deviceId);
    return questionHash in userQuestions.last_7_days;
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(deviceId: string): Promise<{
    totalPlayed: number;
    totalSolved: number;
    winRate: number;
    averageTime: number;
    bestTime: number;
  }> {
    const userQuestions = await this.getUserQuestions(deviceId);
    const records = Object.values(userQuestions.last_7_days);

    const totalPlayed = records.length;
    const totalSolved = records.filter(r => r.solved).length;
    const winRate = totalPlayed > 0 ? totalSolved / totalPlayed : 0;

    const solvedRecords = records.filter(r => r.solved && r.timeSpent);
    const averageTime = solvedRecords.length > 0
      ? solvedRecords.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / solvedRecords.length
      : 0;

    const bestTime = solvedRecords.length > 0
      ? Math.min(...solvedRecords.map(r => r.timeSpent || 0))
      : 0;

    return {
      totalPlayed,
      totalSolved,
      winRate,
      averageTime: Math.round(averageTime),
      bestTime
    };
  }

  /**
   * 清理过期记录（超过7天的）
   */
  private cleanupExpiredRecords(userQuestions: UserQuestionsData): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const last7Days: { [key: string]: UserQuestionRecord } = {};

    for (const [hash, record] of Object.entries(userQuestions.last_7_days)) {
      const recordDate = new Date(record.timestamp);
      if (recordDate > sevenDaysAgo) {
        last7Days[hash] = record;
      }
    }

    userQuestions.last_7_days = last7Days;
  }

  /**
   * 批量获取多个用户的统计信息
   */
  async getBatchUserStats(deviceIds: string[]): Promise<Map<string, any>> {
    const stats = new Map();

    // 使用Promise.all并行获取
    const promises = deviceIds.map(async (deviceId) => {
      const userStats = await this.getUserStats(deviceId);
      return [deviceId, userStats];
    });

    try {
      const results = await Promise.all(promises);
      results.forEach(([deviceId, userStats]) => {
        stats.set(deviceId, userStats);
      });
    } catch (error) {
      console.error('Error getting batch user stats:', error);
    }

    return stats;
  }

  /**
   * 删除用户数据
   */
  async deleteUserQuestions(deviceId: string): Promise<void> {
    await this.kv.delete(`user_questions:${deviceId}`);
  }

  /**
   * 获取热门题目统计
   */
  async getPopularQuestions(limit: number = 50): Promise<Map<string, number>> {
    // 这个功能在KV中实现比较困难，可以考虑其他方式
    // 或者定期将热门数据同步到KV
    return new Map();
  }

  /**
   * 更新题目热度（异步操作）
   */
  async updateQuestionPopularity(questionHash: string, increment: number = 1): Promise<void> {
    // 这个功能可以考虑使用D1或者其他方式实现
    // KV不适合这种复杂的计数统计
    console.log(`Question ${questionHash} popularity updated by ${increment}`);
  }
}