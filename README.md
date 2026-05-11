# Chinichi · Growth OS

留学生私塾的陪伴 · 推进 · 不掉队 系统。
不是 ERP — 是让学生始终知道 **"今天我该做什么"** 的成长运营平台。

## 三端一体

- **内部端** (`/dashboard`) — 管理员 / 升学班主任 / 教师
- **学生端** (`/student/home`) — mobile-first，每天回答一个问题：今天最重要的一件事
- **CRM** (`/crm/leads`) — 线索 → 试听 → 成交 → 自动转 Student

## 核心理念

| 不要 | 要 |
|---|---|
| 复杂 ERP | 推进式首页 |
| 录入表单 | 选择 + AI 补全 |
| 冷冰冰提醒 | "○○老师提醒你…" |
| 手填 Timeline | 系统自动落档 |

中枢概念 **`nextAction`** —— 系统始终知道下一步推进谁、做什么。

## 技术栈

- Next.js 14 (App Router) · TypeScript · TailwindCSS
- Prisma + PostgreSQL
- 自实现 Cookie Auth（MVP 阶段，可替换为 NextAuth）
- AI / WeCom 均支持 mock 模式：未配置 key 时自动降级，不影响运行

## 本地运行

```bash
# 1. 装依赖
npm install

# 2. 起本地 Postgres（任选一种）
#   a. docker:    docker run -d --name chinichi-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
#   b. Postgres.app / Supabase / Neon 都可以
#   把连接串写入 .env 的 DATABASE_URL

cp .env.example .env

# 3. 数据库
npm run db:push    # 同步 schema (开发期推荐, 不产生 migration 文件)
npm run db:seed    # 写入 3 学生 / 2 老师 / 1 班主任 / 7 天 Echo 数据

# 4. 启动
npm run dev
# 内部端: http://localhost:3000/dashboard
# 学生端: http://localhost:3000/student/home
```

### Demo 账号 (db:seed 后可用)

| 身份 | 邮箱 | 密码 |
|---|---|---|
| 管理员 | admin@chinichi.local   | admin1234 |
| 班主任 | mentor@chinichi.local  | admin1234 |
| 学生 | student@chinichi.local | admin1234 |

> **没连数据库也能跑**：所有数据查询都包了 `safe()`，DB 不可用时返回 demo 数据，UI 仍可演示。

### Cron 手动触发（本地）

```bash
curl -X POST -H "x-cron-secret: dev-cron-secret" http://localhost:3000/api/cron/deadline-tick
curl -X POST -H "x-cron-secret: dev-cron-secret" http://localhost:3000/api/cron/risk-tick
```

生产环境配置：Vercel Cron（每小时 / 每天 02:00），或 Supabase pg_cron。

### Echo App 接入测试

```bash
curl -X POST http://localhost:3000/api/webhooks/echo \
  -H "Content-Type: application/json" \
  -d '{"studentId":"<student-id>","data":{"date":"2026-05-11","study_minutes":35,"streak":8,"shadowing_done":4,"ai_conv_count":2,"pron_score":86}}'
```

## 关键代码地图

```
prisma/schema.prisma         数据模型（学生=升学项目；Timeline=事件流；矩阵式 Membership）
services/timeline.ts         emit() —— 一切事件流入这里
services/deadlines.ts        模板 + 30/14/7/3/1 天幂等提醒
services/risk.ts             7d → YELLOW，14d → RED + 通知 mentor
services/ai.ts               跟进摘要 / 课后反馈 / 鼓励语（mock-safe）
services/wecom.ts            企业微信发送（落 Notification 表 + 推送）
services/learning.ts         Echo / JLPT App / LMS 都走同一接口
components/forms/FeedbackQuickForm.tsx   极简 3-tap 课后反馈，AI 扩写
app/api/followups/route.ts   写跟进 → 强制 nextAction → 同步 student → emit Timeline
```

## 状态

MVP 范围已完成：CRM、Student、FollowUp、Todo、Deadline、Lesson、LessonFeedback、Timeline、Dashboard、Student Portal、Echo 接入、企业微信通道、Cron。

下一步建议：NextAuth 替换 cookie auth、对象存储接入（作业 / 截图）、企业微信加解密、WBS 报表、家长周报。
