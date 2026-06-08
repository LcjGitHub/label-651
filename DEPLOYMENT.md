# Docker 容器化部署说明

## 目录结构

```
label-651/
├── Dockerfile.frontend      # 前端镜像构建文件
├── Dockerfile.backend       # 后端镜像构建文件
├── docker-compose.yml       # Docker Compose 编排文件
├── nginx.conf               # Nginx 配置文件
├── .env.example             # 环境变量示例
├── backend/
│   ├── data/                # SQLite 数据库目录（挂载持久化）
│   ├── uploads/             # 上传文件目录（挂载持久化）
│   └── exports/             # 导出文件目录（挂载持久化）
└── DEPLOYMENT.md            # 本文档
```

## 快速开始（一键启动）

### 前置条件

- Docker Engine >= 20.10
- Docker Compose >= 2.0
- 宿主机端口 8080、8089 未被占用

### 步骤 1：配置环境变量

复制环境变量示例文件并根据需要修改：

```bash
cp .env.example .env
```

环境变量说明：

| 变量名           | 默认值                          | 说明                     |
| ---------------- | ------------------------------- | ------------------------ |
| `FRONTEND_PORT`  | `8080`                          | 前端 Nginx 对外端口      |
| `BACKEND_PORT`   | `8089`                          | 后端服务端口（容器内部） |
| `CORS_ORIGINS`   | `http://localhost:8080,http://127.0.0.1:8080` | 允许的 CORS 来源，多个用逗号分隔 |

### 步骤 2：一键启动

使用 npm 脚本（推荐）：

```bash
npm run docker:up
```

或直接使用 Docker Compose：

```bash
docker compose up -d --build
```

### 步骤 3：访问应用

- 前端地址：http://localhost:8080
- 后端健康检查：http://localhost:8080/api/health

## 常用命令

| 命令                    | 说明                                       |
| ----------------------- | ------------------------------------------ |
| `npm run docker:up`     | 构建并启动所有服务（后台运行）             |
| `npm run docker:down`   | 停止并移除所有容器                         |
| `npm run docker:restart`| 重启所有服务                               |
| `npm run docker:logs`   | 实时查看所有服务日志                       |
| `npm run docker:build`  | 仅构建镜像，不启动                         |
| `npm run docker:ps`     | 查看容器运行状态                           |

## Docker Compose 原生命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 查看日志
docker compose logs -f
docker compose logs -f backend    # 仅查看后端日志
docker compose logs -f frontend   # 仅查看前端日志

# 重启服务
docker compose restart

# 重新构建并启动
docker compose up -d --build

# 进入容器
docker compose exec backend sh
docker compose exec frontend sh

# 查看容器状态
docker compose ps
```

## 服务架构

```
                    ┌─────────────────────┐
                    │   用户浏览器         │
                    └──────────┬──────────┘
                               │ :8080
                    ┌──────────▼──────────┐
                    │   Nginx (frontend)  │
                    │  - 静态资源服务      │
                    │  - /api 反向代理     │
                    │  - /ws   WebSocket   │
                    └──────────┬──────────┘
                               │ label-network
                    ┌──────────▼──────────┐
                    │  Express (backend)  │
                    │  - REST API :8089    │
                    │  - WebSocket /ws     │
                    │  - SQLite 数据库     │
                    └──────────┬──────────┘
                               │ 挂载卷
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
   │  data/      │      │  uploads/   │      │  exports/   │
   │ users.db    │      │  avatars/   │      │  *.xlsx     │
   └─────────────┘      └─────────────┘      └─────────────┘
   (宿主机持久化)       (宿主机持久化)       (宿主机持久化)
```

## 数据持久化

以下目录通过 Docker Volume 挂载到宿主机，容器删除后数据不会丢失：

| 容器内路径      | 宿主机路径            | 说明           |
| --------------- | --------------------- | -------------- |
| `/app/data`     | `./backend/data`      | SQLite 数据库  |
| `/app/uploads`  | `./backend/uploads`   | 用户上传文件   |
| `/app/exports`  | `./backend/exports`   | 导出的 Excel   |

**数据备份**：直接复制 `backend/data/`、`backend/uploads/`、`backend/exports/` 三个目录即可完成全量备份。

## 健康检查

后端服务内置健康检查接口：

- **路径**：`GET /api/health`
- **容器健康检查**：每 30 秒自动检测，连续失败 3 次标记为不健康
- **响应示例**：

```json
{
  "success": true,
  "message": "用户管理系统 API 运行正常",
  "timestamp": "2026-06-08T00:00:00.000Z"
}
```

前端容器依赖后端健康检查通过后才会启动。

## 自定义配置

### 修改前端端口

编辑 `.env` 文件：

```env
FRONTEND_PORT=80
```

### 添加自定义域名 CORS

编辑 `.env` 文件：

```env
CORS_ORIGINS=http://localhost:8080,https://your-domain.com
```

### 修改 Nginx 配置

编辑 `nginx.conf` 后重新构建：

```bash
npm run docker:up
```

## 故障排查

### 容器无法启动

```bash
# 查看所有容器状态
docker compose ps -a

# 查看具体容器日志
docker compose logs backend
docker compose logs frontend
```

### 端口被占用

修改 `.env` 中的 `FRONTEND_PORT` 或修改 `docker-compose.yml` 中的端口映射。

### 数据库权限问题

确保宿主机目录有读写权限：

```bash
chmod -R 755 backend/data backend/uploads backend/exports
```

### 清理重置

**警告：此操作会删除所有容器，但不会删除挂载的数据卷**

```bash
docker compose down -v
```

**完全重置（包括数据）**：

```bash
docker compose down -v
rm -rf backend/data/* backend/uploads/* backend/exports/*
```

## 生产环境部署建议

1. **使用 HTTPS**：在 Nginx 前增加反向代理（如 Traefik、Nginx Proxy Manager）配置 SSL 证书
2. **限制资源**：在 `docker-compose.yml` 中为各服务添加 `deploy.resources` 限制
3. **日志轮转**：配置 Docker 日志驱动限制日志文件大小
4. **定期备份**：设置定时任务备份 `backend/data/` 目录
5. **环境隔离**：为生产环境创建独立的 `docker-compose.prod.yml` 覆盖配置

## 更新部署

代码更新后，重新执行一键启动命令即可自动构建并重启：

```bash
npm run docker:up
```

Docker 的分层缓存机制会只重建变更部分，通常很快完成。
