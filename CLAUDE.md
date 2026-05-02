@AGENTS.md

# 部署架构

| 项 | 值 |
|---|---|
| 仓库 | `https://github.com/reagan475614947/diary` |
| Droplet IP | `139.59.244.237` (Singapore, 1 vCPU / 1 GB RAM) |
| 项目路径 | `/app` |
| 容器镜像 | `ghcr.io/reagan475614947/diary:latest` |
| 端口 | 3000 |

## 工作流

```
本地修改 → git push（不会触发部署）→ 需要部署时手动触发：
  gh workflow run "Build and Deploy"
```

部署是**纯手动**触发的（`workflow_dispatch`，不绑 push），通过 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)。约 3 分钟完成"GitHub Actions 构建镜像 → 推 ghcr.io → SSH 部署"。

**不要在 Droplet 上直接构建**——1GB RAM 跑 `npm run build` 会 OOM 卡死整个系统。

## SSH 访问

```bash
ssh -i ~/.ssh/diary_deploy_ed25519 root@139.59.244.237
```

服务器 `~/.ssh/authorized_keys` 包含两个公钥：
- 用户个人密钥（`~/.ssh/id_ed25519`）
- GitHub Actions 部署密钥（`~/.ssh/diary_deploy_ed25519`）

## GitHub Secrets

通过 `gh secret list` 查看。已配置：
- `DROPLET_HOST` = `139.59.244.237`
- `DROPLET_SSH_KEY` = `~/.ssh/diary_deploy_ed25519` 私钥内容
- `GITHUB_TOKEN`（自动注入，用于推 ghcr.io 和 Droplet 拉镜像）

## 常用操作

```bash
# 查看最近部署状态
gh run list --limit 5

# 看部署日志
gh run view <run-id> --log

# 手动触发部署（这是唯一的触发方式）
gh workflow run "Build and Deploy"

# 看服务器上容器状态
ssh -i ~/.ssh/diary_deploy_ed25519 root@139.59.244.237 "docker ps && free -h"

# 看容器日志
ssh -i ~/.ssh/diary_deploy_ed25519 root@139.59.244.237 "docker compose -f /app/docker-compose.yml logs --tail=50"
```

## 数据存储

`diary-data/` 在 git 中被忽略；服务器上挂载在 Docker 命名卷 `diary-data` 上（容器内 `/app/diary-data`）。本地 `diary-data/` 与服务器**完全独立**，不互相同步。

目录结构：
```
diary-data/
├── users.json              # 用户账号
├── settings.json           # 全局设置
└── users/{userId}/
    ├── entries/{date}-v{n}.json
    ├── photos/{date}-v{n}.{ext}
    └── ai-reviews/{mode}.json
```

## 故障排查

| 现象 | 原因 | 处置 |
|---|---|---|
| GitHub Actions 部署 SSH 超时 / broken pipe | Droplet OOM 卡死（构建期间） | 已通过把构建移到 CI 解决；如再次出现，从 DO 控制台 Power Cycle |
| `docker compose pull` 401 | ghcr.io 包变成 private 后 Droplet 没登录 | workflow 里 `docker login ghcr.io` 步骤会自动处理；手动可用 PAT 登录 |
| 服务器 SSH banner timeout | 系统资源耗尽 | DO 控制台查看，必要时 Power Cycle |
| 部署后容器还是旧版 | docker-compose 缺 `pull_policy: always` | 已设置；如丢失则 `docker compose pull && up -d` |

## 不要做的事

- ❌ 不要在 Droplet 上 `docker compose build`（1GB RAM 会 OOM）
- ❌ 不要直接在服务器上改代码（GitHub 上的代码是 source of truth）
- ❌ 不要 force-push `main`（自动部署会立即拉新代码）
- ❌ 不要把 `.env*` 提交到 git（已在 `.gitignore` 和 `.dockerignore`）
