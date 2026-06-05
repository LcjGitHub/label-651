# 用户管理系统

基于 **Node.js (Express) + React + SQLite** 开发的全栈用户管理系统。

## 功能特性

- ✅ 用户列表展示（表格形式）
- ✅ 实时搜索（按姓名或邮箱模糊搜索）
- ✅ 新增用户（表单验证）
- ✅ 编辑用户
- ✅ 删除用户（二次确认）
- ✅ 响应式设计
- ✅ 操作反馈（Toast 提示）

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS
- Lucide React 图标库
- React Router DOM

### 后端
- Express.js
- Node.js 内置 `node:sqlite`（原生 SQLite 驱动，无需编译）
- CORS 中间件
- TypeScript

### 数据库
- SQLite（嵌入式数据库）

## 安装依赖

### 一键安装所有依赖

```bash
npm run install:all
```

### 分步安装

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend && npm install
```

## 启动项目

### 一键同时启动前后端（推荐）

```bash
npm run dev:all
```

### 分别启动

```bash
# 启动前端（终端 1）
npm run dev
# 前端访问地址：http://localhost:5173

# 启动后端（终端 2）
npm run dev:backend
# 后端 API 地址：http://localhost:8089
```

## 项目结构

```
label-651/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── server.ts          # 入口文件
│   │   ├── database.ts        # 数据库初始化
│   │   ├── routes/
│   │   │   └── users.ts       # 用户 API 路由
│   │   ├── middleware/
│   │   │   └── errorHandler.ts # 错误处理中间件
│   │   └── types/
│   │       └── index.ts       # 类型定义
│   ├── data/
│   │   └── users.db           # SQLite 数据库文件
│   └── package.json
├── src/                        # 前端应用
│   ├── pages/
│   │   └── Home.tsx           # 主页面
│   ├── components/
│   │   ├── SearchBar.tsx      # 搜索栏
│   │   ├── UserForm.tsx       # 用户表单弹窗
│   │   ├── ConfirmModal.tsx   # 确认弹窗
│   │   └── Toast.tsx          # 通知提示
│   ├── services/
│   │   └── api.ts             # API 服务
│   ├── types/
│   │   └── index.ts           # 类型定义
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts             # Vite 配置（含代理）
└── package.json
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/users` | 获取用户列表（支持 `?search=` 参数） |
| GET | `/api/users/:id` | 获取单个用户 |
| POST | `/api/users` | 创建用户 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

### 请求示例

```bash
# 获取用户列表
curl http://localhost:8089/api/users

# 搜索用户
curl "http://localhost:8089/api/users?search=张"

# 创建用户
curl -X POST http://localhost:8089/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","email":"test@example.com","phone":"13800138000","status":"active"}'
```

## 开发说明

- 前端通过 Vite 开发代理转发 API 请求到后端，无需硬编码后端地址
- 后端 CORS 配置允许所有本地来源访问
- 数据库已预置 5 条测试数据
- 网络错误会显示中文提示，如「无法连接服务器，请确认后端已启动」

## 其他命令

```bash
# 类型检查
npm run check

# 构建前端
npm run build

# 代码检查
npm run lint
```
