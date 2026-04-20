# 部署指南 (Digital Ocean)

## 1. 准备 GitHub 仓库

```bash
git init
git add .
git commit -m "Initial commit with auth"
git remote add origin https://github.com/YOUR_USERNAME/diary-app.git
git push -u origin main
```

## 2. Digital Ocean App Platform 部署

### 方式 A：App Platform（推荐，简单）

1. 登录 Digital Ocean → Create → Apps
2. 连接 GitHub 仓库
3. 配置运行命令：`npm start`
4. 配置构建命令：`npm run build`
5. 设置环境变量（见下方）
6. 添加持久化存储：挂载路径 `/app/diary-data`

### 方式 B：Droplet + Docker

```bash
# 在 Droplet 上
git clone https://github.com/YOUR_USERNAME/diary-app.git
cd diary-app

# 设置环境变量
cp .env.example .env
# 编辑 .env 填写真实值

# 启动
docker compose up -d

# 创建管理员账号
docker compose exec diary-app node scripts/create-admin.mjs admin@yourdomain.com "管理员" "your_secure_password"
```

## 3. 必填环境变量

```bash
# 生成安全密钥
openssl rand -base64 32

SESSION_SECRET=<上面生成的密钥>
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## 4. 创建用户

```bash
# 创建管理员（首次部署后运行）
npm run create-admin admin@yourdomain.com "管理员" "your_password"

# 创建普通用户
npm run create-user user@example.com "用户名" "their_password"
```

## 5. 反向代理（Nginx）

如果使用 Droplet 自行部署，建议在前面加 Nginx：

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
```

之后用 Certbot 配置 HTTPS：
```bash
sudo certbot --nginx -d yourdomain.com
```
