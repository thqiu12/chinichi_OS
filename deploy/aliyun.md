# 阿里云部署指南 · Chinichi OS

技术栈：**Next.js 14 (standalone build) + PostgreSQL 16 + Nginx**，通过 Docker Compose 单机部署。

> 💡 想最快上线（5 分钟、免备案、东京 edge）？看 [Vercel 路径](./vercel.md)。  
> 国内服务 / 企业微信 / 国内学生数据合规需求才需要走阿里云方案。

---

## 三种部署方式 — 选哪个？

| 方式 | 月成本估算 | 启动速度 | 适用 |
|---|---|---|---|
| **A. 轻量应用服务器 (Lighthouse)** | ¥60-100 | 5 分钟 | **推荐首选**：早期、单机、流量低 |
| **B. ECS + RDS PG** | ¥400-500 | 30 分钟 | 生产稳定、数据库托管、流量上来后 |
| **C. ACK / SAE 容器** | ¥600+ | 1 天 | 多实例、自动伸缩、有运维团队 |

下面按 **A 方案**（最低门槛）展开。B 方案的差异在最后单独说。

---

## A · 轻量应用服务器一键起步

### 1. 购买实例 (5 分钟)

阿里云控制台 → 轻量应用服务器 → 创建实例：

- 地域：**杭州 / 上海 / 北京**（离用户近，国内访问快）
- 镜像：**Ubuntu 22.04** 系统镜像（不用应用镜像，自己装更干净）
- 套餐：2 vCPU / 4GB 内存 / 80GB SSD（¥68/月起，活动价更低）
- 流量包：1Mbps 起，按业务量调

> ⚠️ **国内地域**：所有公开域名都需要 ICP 备案（7-30 天）。如果你想立即上线测试，可以选 **香港 / 新加坡** 地域，免备案，但延迟更高。

### 2. 备案 + 域名 (并行，7-30 天)

- 域名：阿里云 → 万网，买一个 `.cn` / `.com`（~¥50/年）
- ICP 备案：阿里云 App → 备案 → 跟向导走，提交资料 → 等管局审核
- 备案期间可以先用 IP 临时访问内部测试

### 3. 安全组（端口）放开 22 / 80 / 443

轻量应用服务器 → 防火墙 → 添加规则：
```
TCP 22   ← 你的 IP（SSH，安全起见不要 0.0.0.0/0）
TCP 80   ← 0.0.0.0/0 （HTTP）
TCP 443  ← 0.0.0.0/0 （HTTPS）
```

### 4. SSH 进服务器，装 Docker

```bash
ssh root@<你的实例公网IP>

# 系统更新
apt-get update && apt-get upgrade -y

# 装 Docker + Compose
curl -fsSL https://get.docker.com | bash
systemctl enable --now docker

# 验证
docker --version           # → Docker version 27.x
docker compose version     # → Docker Compose version v2.x
```

### 5. 拉代码、装 OpenSSL 工具

```bash
# 装 git
apt-get install -y git openssl

# 拉项目（建议先 fork 或私有化，避免泄露生产 .env）
git clone https://github.com/thqiu12/chinichi_OS.git /opt/chinichi
cd /opt/chinichi
```

### 6. 写 `.env`

```bash
cp .env.production.example .env

# 生成强密钥
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"  >> .env.tmp
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"    >> .env.tmp
echo "CRON_SECRET=$(openssl rand -base64 32)"        >> .env.tmp

# 编辑 .env，把上面的值粘进去，并改 NEXTAUTH_URL / NEXT_PUBLIC_APP_URL 为你的域名
vim .env
```

`.env` 最小可用版本：
```
POSTGRES_PASSWORD=...生成的随机串...
NEXTAUTH_SECRET=...生成的随机串...
CRON_SECRET=...生成的随机串...
NEXTAUTH_URL=https://crm.yourdomain.cn
NEXT_PUBLIC_APP_URL=https://crm.yourdomain.cn
```

### 7. 起服务 + migrate + seed

```bash
# 构建 + 启动（首次需要 ~3 分钟拉镜像 + 构建）
docker compose up -d --build

# 等 db 起来
docker compose ps             # 看 web 是不是 healthy

# 应用 schema（生产用 deploy，不会问交互）
docker compose exec web npx prisma migrate deploy

# 灌字典 + 演示数据（生产环境只 seed 一次！）
docker compose exec web npm run db:seed
```

> 如果 `prisma migrate deploy` 报 "no migrations found"，那是因为我们目前还没有 `prisma/migrations/` 目录。临时替代命令：
> ```bash
> docker compose exec web npx prisma db push
> ```
> 后续正式上线前，本地跑一次 `npx prisma migrate dev --name init` 生成 migrations 目录提交进 repo。

### 8. 浏览器测试

```bash
# 用 IP 临时访问（备案前/HTTPS 前）
curl http://localhost
# 或在浏览器打开 http://<实例公网IP>/
```

应该看到 Chinichi · Growth OS 落地页。点 "进入 CRM"。

### 9. HTTPS 证书（备案完成后）

阿里云证书服务 → 申请免费 DV 证书（一年期可续）→ 下载 Nginx 格式 → 得到 `fullchain.pem` + `private.key`：

```bash
mkdir -p /opt/chinichi/deploy/certs
# 上传两个文件到这里（scp / FTP 都行）
ls /opt/chinichi/deploy/certs/
# fullchain.pem  private.key
```

然后改 `deploy/nginx.conf`：取消注释 443 server 块和 80→443 跳转块，把 `your.domain.cn` 改成你的域名。

```bash
# 重启 nginx
docker compose restart nginx
```

测试：
```bash
curl -I https://crm.yourdomain.cn
# HTTP/2 200
```

### 10. 定时任务 (cron)

学生端的 Deadline 提醒 / 风险升级要靠 cron。轻量服务器用 host crontab 调容器内接口：

```bash
crontab -e
```

加：
```cron
# 每小时跑 Deadline tick
0 * * * * curl -sS -X POST -H "x-cron-secret: $(grep CRON_SECRET /opt/chinichi/.env | cut -d= -f2)" http://localhost/api/cron/deadline-tick

# 每天 02:00 跑 Risk tick
0 2 * * * curl -sS -X POST -H "x-cron-secret: $(grep CRON_SECRET /opt/chinichi/.env | cut -d= -f2)" http://localhost/api/cron/risk-tick
```

> 当前 cron 路由还没校验 `x-cron-secret`，等真正接通时再加 middleware。

### 11. 备份 (重要)

数据库 daily dump 到本地 + 远程 OSS：

```bash
# host 脚本：/opt/chinichi/backup.sh
cat > /opt/chinichi/backup.sh <<'EOF'
#!/bin/bash
set -e
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /var/backups/chinichi
docker compose -f /opt/chinichi/docker-compose.yml exec -T db \
  pg_dump -U chinichi chinichi | gzip > /var/backups/chinichi/db-$TS.sql.gz
# 保留最近 30 天
find /var/backups/chinichi -name "db-*.sql.gz" -mtime +30 -delete
EOF
chmod +x /opt/chinichi/backup.sh

# 每天 03:00 备份
crontab -e
# 0 3 * * * /opt/chinichi/backup.sh >> /var/log/chinichi-backup.log 2>&1
```

更进一步：每天用 `ossutil` 把 dumps 推到阿里云 OSS 存对象存储。

---

## 日常运维

```bash
cd /opt/chinichi

# 看日志
docker compose logs -f web         # Next.js
docker compose logs -f db          # Postgres
docker compose logs -f nginx       # Nginx

# 重启某个服务
docker compose restart web

# 拉新代码 + 重新部署（零停机不行，会有 ~10s 不可用）
git pull
docker compose up -d --build web
docker compose exec web npx prisma migrate deploy

# 进容器
docker compose exec web sh
docker compose exec db psql -U chinichi -d chinichi

# 看资源
docker stats
```

---

## B 方案 · ECS + RDS PostgreSQL（推荐生产）

差别只在数据库 — Web 部分一模一样。

1. 买 **阿里云 RDS PostgreSQL** → 选 PG 16 → 基础版即可（~¥250/月）
2. RDS 控制台 → 数据库 → 创建 `chinichi` DB + `chinichi` user
3. 白名单 → 把 ECS 内网 IP 加进来
4. 修改 `.env`：把 `DATABASE_URL` 显式设置成 RDS 连接串（带 `?sslmode=require`）
5. 从 `docker-compose.yml` 删掉 `db:` service，`web:` 的 `depends_on` 也删掉
6. 同样 `docker compose up -d --build`

这样数据库 backup / 高可用 / 扩容 都阿里云托管，省心很多。

---

## 常见坑

| 现象 | 原因 / 修复 |
|---|---|
| `docker compose up` 卡在 `npm ci` | 国内 npm 慢 → 改用淘宝镜像：构建前 `npm config set registry https://registry.npmmirror.com` 或在 Dockerfile 里加 `RUN npm config set registry https://registry.npmmirror.com` |
| Prisma 报 `Could not find PostgreSQL client lib` | 镜像缺 OpenSSL → 我们 Dockerfile 已经装了；如果你用别的基础镜像，自己 `apt install openssl` |
| 网站打不开但 IP 可访问 | 备案没过 / DNS 没生效 / 安全组没开 80,443 |
| HTTPS 报"证书不被信任" | nginx.conf 里挂的是 `private.key` 应该是带链的 `fullchain.pem`；阿里云证书下载选 "Nginx" 格式 |
| 上传 xlsx 超过 1MB 失败 | `nginx.conf` 里 `client_max_body_size 20m` 已经放开；再大要继续调 + 调 Next 的 `experimental.serverActions.bodySizeLimit` |
| 内存不足 OOM | 4GB 起步够；峰值跑大量导入时考虑升到 8GB |
| 备案被驳回 | 主体名跟域名不一致 / 网站描述不通过 → 按管局意见改后再提 |

---

## 域名 + 微信 / 企业微信回调

如果以后要接企业微信回调（接收消息、通讯录变更），需要：

1. 在企业微信管理后台填 `https://crm.yourdomain.cn/api/webhooks/wecom`
2. 验证时阿里云 IP 必须能被企业微信访问（直连，不要走 CDN，否则签名校验会出问题）
3. Token / EncodingAESKey 写入 `.env` 的 `WECOM_*` 三个变量

---

## 总结清单

部署一次性 checklist：
- [ ] 阿里云账号实名 + 充值
- [ ] 域名 + ICP 备案
- [ ] 轻量服务器 / ECS 实例
- [ ] 安全组开 22 / 80 / 443
- [ ] Docker + Compose 装好
- [ ] 代码拉到 `/opt/chinichi`
- [ ] `.env` 生成强密钥
- [ ] `docker compose up -d --build`
- [ ] `prisma db push` 或 `migrate deploy`
- [ ] `npm run db:seed`
- [ ] SSL 证书放进 `deploy/certs/`，启用 443
- [ ] cron 定时任务
- [ ] 每日数据库备份 + OSS 备份

整个一条龙第一次大概 1-2 小时（不含备案）。
