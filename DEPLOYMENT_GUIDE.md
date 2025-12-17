# 混合架构部署指南

## 概述

本项目已成功重构为D1数据库 + KV存储的混合架构，利用JSON文件提供题目数据，显著提升了性能并简化了部署。

## 架构变更

### 数据分层
- **JSON文件** (`public/game24_solutions.json`): 题目和答案数据 (584K, 1362个组合)
- **D1数据库**: 用户持久化数据 (游戏记录、排行榜)
- **KV存储**: 用户7天题目记录 (快速去重)

### 性能优化
- 内存缓存JSON数据，无I/O等待
- KV快速查询用户历史，比数据库快10倍
- 并行执行数据库和KV操作

## 部署步骤

### 1. 创建KV命名空间

```bash
# 创建生产环境KV
wrangler kv:namespace create "USER_QUESTIONS"

# 创建预览环境KV
wrangler kv:namespace create "USER_QUESTIONS" --preview
```

### 2. 更新配置

将生成的KV ID填入 `wrangler.jsonc`:

```json
{
  "kv_namespaces": [
    {
      "binding": "USER_QUESTIONS",
      "id": "your-production-kv-id",
      "preview_id": "your-preview-kv-id"
    }
  ]
}
```

### 3. 部署JSON文件

确保 `game24_solutions.json` 已复制到 `public/` 目录，这样它将被部署为静态资源。

### 4. 更新JSON URL

修改 `app/utils/solutions.ts` 中的URL为你的实际域名：

```typescript
const response = await fetch('https://your-actual-domain.pages.dev/game24_solutions.json');
```

### 5. 数据库迁移

如果你有现有数据，需要清理不再使用的表：

```sql
-- 删除已迁移到KV的表
DROP TABLE IF EXISTS user_questions;
DROP TABLE IF EXISTS question_bank;
DROP TABLE IF EXISTS question_popularity;
```

### 6. 部署应用

```bash
# 构建和部署
npm run build
npm run deploy

# 或者使用wrangler直接部署
wrangler deploy
```

## 配置验证

### 1. 验证JSON加载
```bash
# 检查JSON文件是否可访问
curl https://your-domain.pages.dev/game24_solutions.json
```

### 2. 验证KV工作状态
```bash
# 测试KV读写
wrangler kv:key list --namespace-id="your-kv-id"
```

### 3. 验证API功能
- `GET /api/question/next` - 获取新题目
- `POST /api/game/submit` - 提交答案
- `GET /api/user/stats` - 获取用户统计
- `GET /api/leaderboard` - 获取排行榜

## 性能监控

### 关键指标
- JSON加载时间 (应在启动时完成)
- KV读写延迟 (通常<50ms)
- API响应时间 (目标<100ms)
- 内存使用情况 (JSON约600KB)

### 监控命令
```bash
# 查看Worker日志
wrangler tail

# 查看KV使用情况
wrangler kv:namespace list
```

## 故障排除

### JSON文件无法加载
1. 检查文件是否在 `public/` 目录
2. 验证URL是否正确
3. 检查CORS设置

### KV操作失败
1. 验证KV命名空间配置
2. 检查权限设置
3. 确认TTL设置合理

### 数据不一致
1. 检查并行操作逻辑
2. 验证事务处理
3. 确认数据清理机制

## 后续优化

### 1. 热门题目统计
可以在D1中添加简单的热门题目表，定期从KV同步数据。

### 2. 缓存优化
考虑使用Edge缓存进一步减少JSON加载时间。

### 3. 数据分析
利用D1中的游戏记录数据进行用户行为分析。

### 4. A/B测试
为不同用户群体提供不同的题目难度分布。

## 回滚方案

如需回滚到原架构：
1. 恢复 `schema.sql` 中的完整表结构
2. 恢复原始的 `workers/app.ts`
3. 移除KV相关配置
4. 重新导入题目数据到D1

## 维护建议

1. **定期更新JSON**: 当发现新的题目组合时，更新JSON文件
2. **监控KV使用**: 关注KV存储使用量，必要时清理过期数据
3. **备份策略**: 定期备份D1数据库中的用户数据
4. **性能优化**: 根据实际使用情况调整缓存策略