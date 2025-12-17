import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadSolutions, getQuestionsByDifficulty, generateHint, validateExpression } from "../app/utils/solutions";
import { KVManager } from "../app/utils/kvManager";

const app = new Hono();

// 全局变量存储解决方案数据
let isSolutionsLoaded = false;

// 中间件配置
app.use("*", logger());
app.use("*", cors({
  origin: ["http://localhost:5173", "https://your-domain.pages.dev"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Device-ID"],
}));

// 确保解决方案数据已加载的中间件
app.use("/api/*", async (c, next) => {
  if (!isSolutionsLoaded) {
    try {
      await loadSolutions();
      isSolutionsLoaded = true;
      console.log("解决方案数据加载完成");
    } catch (error) {
      console.error("加载解决方案数据失败:", error);
      return c.json({ error: "服务器初始化失败" }, 500);
    }
  }
  await next();
});

// API路由组
const api = new Hono<{ Bindings: Env }>();

/**
 * 获取下一道题目
 */
api.get("/question/next", async (c) => {
  try {
    const deviceId = c.req.header("X-Device-ID");
    const countryCode = c.req.cf?.country || "Unknown";

    if (!deviceId) {
      return c.json({ error: "设备ID缺失" }, 400);
    }

    // 初始化KV管理器
    const kvManager = new KVManager(c.env.USER_QUESTIONS);

    // 获取用户已玩过的题目（最近7天）
    const playedHashes = await kvManager.getPlayedQuestionHashes(deviceId);

    // 从JSON数据获取可用题目池
    const allQuestions = getQuestionsByDifficulty(1, 3);
    const availableQuestions = allQuestions.filter(q => !playedHashes.has(q.hash));

    if (availableQuestions.length === 0) {
      // 如果没有新题目，返回随机题目（从所有题目中选择）
      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      const randomQuestion = allQuestions[randomIndex];

      // 异步记录到KV
      kvManager.addQuestionRecord(deviceId, randomQuestion.hash).catch(error => {
        console.error("记录到KV失败:", error);
      });

      return c.json({
        numbers: randomQuestion.numbers,
        difficulty: randomQuestion.difficulty,
        hint: generateHint(randomQuestion.numbers),
        countryCode
      });
    }

    // 智能选择题目：优先选择低重复率的题目
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];

    // 异步记录到KV
    kvManager.addQuestionRecord(deviceId, selectedQuestion.hash).catch(error => {
      console.error("记录到KV失败:", error);
    });

    return c.json({
      numbers: selectedQuestion.numbers,
      difficulty: selectedQuestion.difficulty,
      hint: generateHint(selectedQuestion.numbers),
      countryCode
    });

  } catch (error) {
    console.error("获取题目失败:", error);
    return c.json({ error: "服务器错误" }, 500);
  }
});

/**
 * 提交游戏结果
 */
api.post("/game/submit", async (c) => {
  try {
    const deviceId = c.req.header("X-Device-ID");
    const body = await c.req.json();

    const {
      numbers,
      expression,
      timeSpent,
      nickname
    } = body;

    if (!deviceId || !numbers || !expression) {
      return c.json({ error: "参数不完整" }, 400);
    }

    // 验证表达式
    const validationResult = validateExpression(numbers, expression);
    if (!validationResult.valid) {
      return c.json({
        error: "表达式验证失败",
        details: validationResult.error,
        debug: validationResult.details
      }, 400);
    }

    // 计算结果（应该总是24）
    const result = 24;
    const isCorrect = true;

    // 生成题目哈希
    const questionHash = numbers.slice().sort((a, b) => a - b).join(',');

    // 初始化KV管理器
    const kvManager = new KVManager(c.env.USER_QUESTIONS);

    // 并行执行数据库和KV操作
    const dbPromise = c.env.DB.prepare(`
      INSERT INTO game_records
      (device_id, nickname, question_hash, expression, result, is_correct, time_spent, country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      deviceId,
      nickname || "匿名玩家",
      questionHash,
      expression,
      result,
      isCorrect,
      timeSpent,
      c.req.cf?.country || "Unknown"
    ).run();

    const kvPromise = kvManager.addQuestionRecord(deviceId, questionHash, isCorrect, timeSpent);

    const leaderboardPromise = (async () => {
      if (isCorrect) {
        const existingLeaderboard = await c.env.DB.prepare(`
          SELECT * FROM leaderboard WHERE device_id = ?
        `).bind(deviceId).first();

        if (existingLeaderboard) {
          return c.env.DB.prepare(`
            UPDATE leaderboard
            SET games_played = games_played + 1,
                games_won = games_won + 1,
                best_time = CASE WHEN ? < best_time OR best_time IS NULL THEN ? ELSE best_time END,
                total_playtime = total_playtime + ?,
                last_played = CURRENT_TIMESTAMP
            WHERE device_id = ?
          `).bind(timeSpent, timeSpent, timeSpent, deviceId).run();
        } else {
          return c.env.DB.prepare(`
            INSERT INTO leaderboard
            (device_id, nickname, country, games_played, games_won, best_time, total_playtime)
            VALUES (?, ?, ?, 1, 1, ?, ?)
          `).bind(deviceId, nickname || "匿名玩家", c.req.cf?.country || "Unknown", timeSpent, timeSpent).run();
        }
      }
    })();

    // 等待所有操作完成
    await Promise.all([dbPromise, kvPromise, leaderboardPromise]);

    return c.json({
      success: true,
      message: "结果已保存",
      isCorrect,
      result: 24
    });

  } catch (error) {
    console.error("提交结果失败:", error);
    return c.json({ error: "服务器错误" }, 500);
  }
});

/**
 * 获取排行榜
 */
api.get("/leaderboard", async (c) => {
  try {
    const { country } = c.req.query();
    const countryCode = c.req.cf?.country;

    let whereClause = "";
    let params: any[] = [];

    if (country && country !== "all") {
      whereClause = "WHERE country = ?";
      params = [country];
    } else if (countryCode) {
      // 默认显示用户所在国家 + 全球
      whereClause = "WHERE country = ? OR country = 'Global'";
      params = [countryCode];
    }

    const leaderboard = await c.env.DB.prepare(`
      SELECT nickname, country, games_played, games_won, best_time, total_playtime,
             ROUND((CAST(games_won AS REAL) / games_played) * 100, 1) as win_rate
      FROM leaderboard
      ${whereClause}
      ORDER BY games_won DESC, best_time ASC
      LIMIT 50
    `).bind(...params).all();

    return c.json({ leaderboard: leaderboard.results });

  } catch (error) {
    console.error("获取排行榜失败:", error);
    return c.json({ error: "服务器错误" }, 500);
  }
});

/**
 * 获取用户统计信息
 */
api.get("/user/stats", async (c) => {
  try {
    const deviceId = c.req.header("X-Device-ID");

    if (!deviceId) {
      return c.json({ error: "设备ID缺失" }, 400);
    }

    // 初始化KV管理器
    const kvManager = new KVManager(c.env.USER_QUESTIONS);

    // 从KV获取用户统计
    const kvStats = await kvManager.getUserStats(deviceId);

    // 从数据库获取排行榜数据
    const leaderboardStats = await c.env.DB.prepare(`
      SELECT
        games_played as total_games,
        games_won,
        best_time,
        total_playtime
      FROM leaderboard
      WHERE device_id = ?
    `).bind(deviceId).first();

    // 合并统计数据
    const stats = {
      totalPlayed: kvStats.totalPlayed,
      totalSolved: kvStats.totalSolved,
      winRate: Math.round(kvStats.winRate * 100) / 100,
      averageTime: kvStats.averageTime,
      bestTime: leaderboardStats?.best_time || kvStats.bestTime,
      totalGames: leaderboardStats?.total_games || 0,
      gamesWon: leaderboardStats?.games_won || 0,
      totalPlaytime: leaderboardStats?.total_playtime || 0
    };

    return c.json({ stats });

  } catch (error) {
    console.error("获取用户统计失败:", error);
    return c.json({ error: "服务器错误" }, 500);
  }
});


app.route("/api", api);

// 前端路由处理
app.get("*", (c) => {
	const requestHandler = createRequestHandler(
		() => import("virtual:react-router/server-build"),
		import.meta.env.MODE,
	);

	return requestHandler(c.req.raw, {
		cloudflare: { env: c.env, ctx: c.executionCtx },
	});
});

export default app;
