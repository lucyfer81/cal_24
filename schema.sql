-- 24点游戏数据库Schema
-- 创建时间: 2025-12-16
-- 用于Cloudflare D1 SQLite数据库

-- 题目库表（预生成所有有解的题目）
CREATE TABLE IF NOT EXISTS question_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numbers_hash TEXT UNIQUE NOT NULL,     -- 题目唯一标识
    numbers TEXT NOT NULL,                 -- JSON: [8,3,8,3]
    difficulty INTEGER DEFAULT 1,        -- 1-5难度等级
    solution_count INTEGER DEFAULT 1,    -- 解法数量
    total_attempts INTEGER DEFAULT 0,    -- 总尝试次数
    success_rate REAL DEFAULT 0,         -- 成功率
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 游戏记录表（匿名用户）
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

-- 用户题目记录表（去重管理）
CREATE TABLE IF NOT EXISTS user_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    is_solved BOOLEAN DEFAULT FALSE,
    time_spent INTEGER,
    attempt_count INTEGER DEFAULT 1,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP
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

-- 题目热度表（推荐算法）
CREATE TABLE IF NOT EXISTS question_popularity (
    question_hash TEXT PRIMARY KEY,
    recent_attempts INTEGER DEFAULT 0,    -- 最近24小时尝试次数
    recent_success INTEGER DEFAULT 0,     -- 最近24小时成功次数
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_game_records_device_id ON game_records(device_id);
CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at);
CREATE INDEX IF NOT EXISTS idx_game_records_question_hash ON game_records(question_hash);

CREATE INDEX IF NOT EXISTS idx_user_questions_device_hash ON user_questions(device_id, question_hash);
CREATE INDEX IF NOT EXISTS idx_user_questions_device_id ON user_questions(device_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_last_attempt ON user_questions(last_attempt);

CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_numbers_hash ON question_bank(numbers_hash);

CREATE INDEX IF NOT EXISTS idx_leaderboard_device_id ON leaderboard(device_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_games_won ON leaderboard(games_won DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_best_time ON leaderboard(best_time ASC);

CREATE INDEX IF NOT EXISTS idx_question_popularity_recent_attempts ON question_popularity(recent_attempts DESC);
CREATE INDEX IF NOT EXISTS idx_question_popularity_last_updated ON question_popularity(last_updated);

-- 插入一些示例题目数据（这些是已知有解的题目组合）
INSERT OR IGNORE INTO question_bank (numbers_hash, numbers, difficulty, solution_count) VALUES
('1,2,3,4', '[1,2,3,4]', 1, 1),
('1,3,4,6', '[1,3,4,6]', 2, 1),
('1,4,5,6', '[1,4,5,6]', 2, 1),
('2,3,4,6', '[2,3,4,6]', 1, 1),
('2,3,4,12', '[2,3,4,12]', 1, 1),
('2,4,6,8', '[2,4,6,8]', 2, 1),
('3,3,8,8', '[3,3,8,8]', 3, 1),
('3,4,6,8', '[3,4,6,8]', 2, 1),
('4,4,6,6', '[4,4,6,6]', 2, 1),
('6,6,6,6', '[6,6,6,6]', 1, 1),
('2,2,11,11', '[2,2,11,11]', 3, 1),
('3,3,7,7', '[3,3,7,7]', 3, 1),
('4,4,10,10', '[4,4,10,10]', 3, 1),
('5,5,5,1', '[5,5,5,1]', 2, 1),
('8,8,3,3', '[8,8,3,3]', 3, 1),
('13,13,2,2', '[13,13,2,2]', 4, 1);