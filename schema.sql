-- 24点游戏数据库Schema（优化版）
-- 创建时间: 2025-12-17
-- 使用D1 + KV混合架构：题目数据来自JSON，用户题目记录迁移到KV

-- 游戏记录表（匿名用户）- 保留用于统计分析
CREATE TABLE IF NOT EXISTS game_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,              -- 设备指纹
    nickname TEXT NOT NULL,               -- 用户昵称（可修改）
    question_hash TEXT NOT NULL,          -- 题目哈希
    expression TEXT NOT NULL,             -- 构建的表达式
    result INTEGER NOT NULL,              -- 计算结果
    is_correct BOOLEAN DEFAULT FALSE,     -- 是否等于24
    time_spent INTEGER,                   -- 用时（秒）
    country TEXT,                         -- 国家/地区（根据IP）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 排行榜表
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    nickname TEXT NOT NULL,
    country TEXT,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    best_time INTEGER,                    -- 最佳完成时间
    total_playtime INTEGER DEFAULT 0,     -- 总游戏时间
    last_played DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_game_records_device_id ON game_records(device_id);
CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at);
CREATE INDEX IF NOT EXISTS idx_game_records_question_hash ON game_records(question_hash);

CREATE INDEX IF NOT EXISTS idx_leaderboard_device_id ON leaderboard(device_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_games_won ON leaderboard(games_won DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_best_time ON leaderboard(best_time ASC);