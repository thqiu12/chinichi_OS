# Vercel 部署（日本最快路径）· Chinichi OS

**5 分钟从 GitHub push 到上线。** 东京 edge node (hnd1)、自动 HTTPS、Cron 内建、免备案。

---

## 选 DB · Neon vs Supabase

Vercel 自己不托 Postgres，需要外接。两个选项都在东京有节点：

| | **Neon** | **Supabase** |
|---|---|---|
| Postgres 16 | ✓ | ✓ |
| Tokyo 节点 | ✓ (ap-northeast-1) | ✓ |
| 免费额度 | 0.5GB, 100 小时计算 | 500MB, 50K MAU |
| Vercel 集成 | 一键，最佳 | 手动配 env |
| 还附带 | 数据库分支 (像 git) | Auth / Storage / Realtime |
| 推荐 | **首选——单一职责** | 以后要做学生端文件上传时再换 |

下面按 **Neon** 演示。

---

## 5 步上线

### 1. 把 repo push 到 GitHub（已完成）

✓ 你的 repo 已经在 https://github.com/thqiu12/chinichi_OS

### 2. 建 Neon 数据库（2 分钟）

1. https://neon.tech → "Sign in with GitHub"
2. 新建 project：
   - Name: `chinichi`
   - Region: **AWS Asia Pacific (Tokyo) ap-northeast-1** ← 关键
   - Postgres version: 16
3. 创建完成后，控制台首页有 `Connection string`，复制 **pooled** 连接串（带 `-pooler`），形如：
   ```
   postgresql://user:pwd@ep-xxx-pooler.ap-northeast-1.aws.neon.tech/chinichi?sslmode=require
   ```
   > Vercel serverless 一定要用 pooled 连接，否则 connection limit 会爆。

### 3. 把 repo 接到 Vercel（2 分钟）

1. https://vercel.com → "Sign in with GitHub"
2. "Add New… → Project" → 选 `thqiu12/chinichi_OS`
3. **Framework**: Next.js (自动检测)
4. **Build Command**: 默认就好（vercel.json 已经写了 `prisma generate && next build`）
5. 展开 "Environment Variables" 加这几个：

| Name | Value |
|---|---|
| `DATABASE_URL` | 上面 Neon 的 pooled 连接串 |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` 跑出来的随机串 |
| `NEXTAUTH_URL` | `https://你的项目名.vercel.app`（部署后回填也行）|
| `NEXT_PUBLIC_APP_URL` | 同上 |
| `CRON_SECRET` | 另一个随机串（Vercel 内部走 `x-vercel-cron` 头，不需要也行；放着图心安）|
| `OPENAI_API_KEY` | 可选（空 → mock 模式）|

6. **Deploy** → 等 ~2 分钟

### 4. 应用 schema + seed (一次性, 1 分钟)

部署完，本地直连 Neon 跑 migration：

```bash
# 把 DATABASE_URL 临时导到本地 shell
export DATABASE_URL='你刚才那个 Neon 连接串'

# 应用 schema
npx prisma db push

# 灌字典 + 演示数据
npm run db:seed
```

或者用 Neon 控制台的 SQL Editor 跑也行。

> ⚠ **生产**最好换成 `prisma migrate deploy`，需要先本地 `prisma migrate dev --name init` 生成 migration 目录提交。Phase 5 之后建议立刻做这一步。

### 5. 打开链接

访问 `https://你的项目名.vercel.app` → 应该看到 Chinichi · Growth OS 落地页。

进 `/api/demo/role?as=ADMIN&next=/crm` 进 CRM。

---

## 自定义域名（可选）

Vercel → Project → Settings → Domains → Add：

- 用自己的域名（`crm.knock-co.jp` 之类）
- DNS 加 CNAME 记录指向 `cname.vercel-dns.com`
- 自动签 SSL 证书

日本 / 海外域名都无备案要求 — 这就是 Vercel 路线最大的优势。

---

## Cron 校验

`vercel.json` 已经配置好：
```json
"crons": [
  { "path": "/api/cron/deadline-tick", "schedule": "0 * * * *"  },
  { "path": "/api/cron/risk-tick",     "schedule": "0 17 * * *" }
]
```
- `0 * * * *` = 每小时整点 UTC
- `0 17 * * *` = 每天 UTC 17:00 = JST 02:00

Vercel 控制台 → Project → Cron Jobs 能看到执行记录。免费版每月 100 次额度，我们一天 25 次，够用。

---

## 限制 & 解决

| 限制 (Hobby 免费) | 影响 | 解决 |
|---|---|---|
| Function 10 秒超时 | 1147 行批量导入可能卡 | 用 **Pro 计划** ($20/月) → 60 秒；或客户端分块更细 |
| Body 4.5MB | 大 xlsx 上不去 | 客户端 SheetJS 已经分 50 行/批，正常 xlsx < 1MB |
| 100GB 带宽/月 | 一般 CRM 用不完 | 上 Pro = 1TB |
| 100K 函数调用/月 | 中等使用充足 | 上 Pro = 1M |
| 1 Cron 域 | 我们就 2 个 cron job | OK |

预算：
- **Hobby + Neon Free** = ¥0/月（测试 / 小团队）
- **Pro + Neon Pro** = $20 + $19 = **~¥280/月**（生产建议）

---

## 部署后 checklist

- [ ] Neon DB 在 Tokyo 区
- [ ] Vercel 项目 region pin 到 `hnd1`（已在 vercel.json）
- [ ] `DATABASE_URL` 用 **pooled** 连接串
- [ ] `prisma db push` 跑成功
- [ ] `npm run db:seed` 跑成功（看到 admin/sales/student 三个账号）
- [ ] 落地页能打开
- [ ] `/crm` / `/student/home` / `/dashboard` 都能渲染
- [ ] Cron Jobs 控制台显示 "Active"
- [ ] 拖一个测试 xlsx 进 `/crm/leads/import` 试运行能跑通

---

## 跟阿里云方案的取舍

| | Vercel + Neon | 阿里云 Lighthouse |
|---|---|---|
| **启动速度** | 5 分钟 | 1-2 小时 + 备案 7-30 天 |
| **日本访问** | hnd1 直发 ~30ms | 跨境绕路 100-300ms |
| **国内访问** | 经常被墙 ⚠ | 直发 ~30ms |
| **价格 (生产)** | ¥280/月 | ¥150/月 |
| **运维** | 几乎 0 | 你自己装/补/备份 |
| **企业微信回调** | ⚠ 国内调用可能受限 | ✓ 顺畅 |
| **数据合规 (中国学生数据)** | ⚠ 数据出境 | ✓ 境内 |

**结论**：
- 国内服务 + 国内学生数据 + 企业微信 → **阿里云**
- 日本团队 + 测试 / Demo / 海外用户 → **Vercel**
- 想兼顾 → Vercel 跑测试环境 + 阿里云跑生产环境

两套配置都在 repo 里了，并行不冲突。
