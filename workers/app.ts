import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

// 中间件配置
app.use("*", logger());
app.use("*", cors({
  origin: ["http://localhost:5173", "https://your-domain.pages.dev"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Device-ID"],
}));

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

    // 获取用户已玩过的题目（最近7天）
    const playedQuestions = await c.env.DB.prepare(`
      SELECT DISTINCT question_hash FROM user_questions
      WHERE device_id = ? AND last_attempt > datetime('now', '-7 days')
    `).bind(deviceId).all();

    // 获取可用题目池
    const availableQuestions = await c.env.DB.prepare(`
      SELECT q.*,
             COALESCE(p.recent_attempts, 0) as recent_attempts,
             COALESCE(p.recent_success, 0) as recent_success
      FROM question_bank q
      LEFT JOIN question_popularity p ON q.numbers_hash = p.question_hash
      WHERE q.difficulty BETWEEN 1 AND 3
      AND q.numbers_hash NOT IN (${playedQuestions.results.length > 0 ? playedQuestions.results.map(() => "?").join(",") : "''"})
      ORDER BY
        CASE WHEN p.recent_attempts < 10 THEN 1 ELSE 2 END,
        RANDOM()
      LIMIT 50
    `).bind(...playedQuestions.results.map(r => r.question_hash)).all();

    if (availableQuestions.results.length === 0) {
      // 如果没有新题目，返回随机题目
      const randomQuestion = await c.env.DB.prepare(`
        SELECT * FROM question_bank
        ORDER BY RANDOM()
        LIMIT 1
      `).first();

      if (!randomQuestion) {
        return c.json({ error: "没有可用题目" }, 404);
      }

      return c.json({
        numbers: JSON.parse(randomQuestion.numbers),
        difficulty: randomQuestion.difficulty,
        hint: generateHint(JSON.parse(randomQuestion.numbers))
      });
    }

    // 随机选择一道题
    const selectedQuestion = availableQuestions.results[
      Math.floor(Math.random() * availableQuestions.results.length)
    ];

    // 记录题目下发
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO user_questions
      (device_id, question_hash) VALUES (?, ?)
    `).bind(deviceId, selectedQuestion.numbers_hash).run();

    // 更新题目热度
    await c.env.DB.prepare(`
      INSERT INTO question_popularity (question_hash, recent_attempts)
      VALUES (?, 1)
      ON CONFLICT(question_hash) DO UPDATE SET
        recent_attempts = recent_attempts + 1,
        last_updated = CURRENT_TIMESTAMP
    `).bind(selectedQuestion.numbers_hash).run();

    return c.json({
      numbers: JSON.parse(selectedQuestion.numbers),
      difficulty: selectedQuestion.difficulty,
      hint: generateHint(JSON.parse(selectedQuestion.numbers)),
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
      questionHash,
      numbers,
      expression,
      result,
      isCorrect,
      timeSpent,
      nickname
    } = body;

    if (!deviceId || !questionHash || !numbers || !expression) {
      return c.json({ error: "参数不完整" }, 400);
    }

    // 记录游戏结果
    await c.env.DB.prepare(`
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

    // 更新用户题目记录
    await c.env.DB.prepare(`
      UPDATE user_questions
      SET is_solved = ?, time_spent = ?, attempt_count = attempt_count + 1, last_attempt = CURRENT_TIMESTAMP
      WHERE device_id = ? AND question_hash = ?
    `).bind(isCorrect, timeSpent, deviceId, questionHash).run();

    // 更新排行榜
    if (isCorrect) {
      const existingLeaderboard = await c.env.DB.prepare(`
        SELECT * FROM leaderboard WHERE device_id = ?
      `).bind(deviceId).first();

      if (existingLeaderboard) {
        await c.env.DB.prepare(`
          UPDATE leaderboard
          SET games_played = games_played + 1,
              games_won = games_won + 1,
              best_time = CASE WHEN ? < best_time OR best_time IS NULL THEN ? ELSE best_time END,
              total_playtime = total_playtime + ?,
              last_played = CURRENT_TIMESTAMP
          WHERE device_id = ?
        `).bind(timeSpent, timeSpent, timeSpent, deviceId).run();
      } else {
        await c.env.DB.prepare(`
          INSERT INTO leaderboard
          (device_id, nickname, country, games_played, games_won, best_time, total_playtime)
          VALUES (?, ?, ?, 1, 1, ?, ?)
        `).bind(deviceId, nickname || "匿名玩家", c.req.cf?.country || "Unknown", timeSpent, timeSpent).run();
      }
    }

    // 更新题目统计
    await c.env.DB.prepare(`
      UPDATE question_bank
      SET total_attempts = total_attempts + 1
      WHERE numbers_hash = ?
    `).bind(questionHash).run();

    // 如果答对了，更新题目热度
    if (isCorrect) {
      await c.env.DB.prepare(`
        UPDATE question_popularity
        SET recent_success = recent_success + 1
        WHERE question_hash = ?
      `).bind(questionHash).run();
    }

    return c.json({ success: true, message: "结果已保存" });

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

    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_games,
        COUNT(CASE WHEN is_correct = 1 THEN 1 END) as games_won,
        AVG(time_spent) as avg_time,
        MIN(time_spent) as best_time
      FROM game_records
      WHERE device_id = ?
    `).bind(deviceId).first();

    const leaderboard = await c.env.DB.prepare(`
      SELECT * FROM leaderboard WHERE device_id = ?
    `).bind(deviceId).first();

    return c.json({
      stats,
      leaderboard
    });

  } catch (error) {
    console.error("获取用户统计失败:", error);
    return c.json({ error: "服务器错误" }, 500);
  }
});

/**
 * 生成提示的辅助函数
 */
function generateHint(numbers: number[]): string {
  // 简单的提示生成逻辑
  const sum = numbers.reduce((a, b) => a + b, 0);
  const product = numbers.reduce((a, b) => a * b, 1);

  if (product === 24) {
    return "试试将所有数字相乘";
  }

  if (sum === 24) {
    return "试试将所有数字相加";
  }

  return "试试不同的运算符组合";
}

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
