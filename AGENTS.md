# 项目说明

## 通用规则

- 除非我明确要求部署，否则不要擅自部署到 staging 或 production。

## UI 组件规则

- 优先使用 shadcn/ui 提供的组件（`src/components/ui/`），不要自己实现。
- 在写 UI 之前先检查 `src/components/ui/` 下是否有可用的组件。
- 如需新增组件，使用 `npx shadcn@latest add <组件名>` 添加。

## 数据库

- 项目使用 **Neon**（Serverless PostgreSQL），通过 `@neondatabase/serverless` 和 `drizzle-orm/neon-http` 连接。
- 数据库连接串通过环境变量 `DATABASE_URL` 配置。
- 使用 Drizzle ORM 管理 schema，migration 文件在 `drizzle/` 目录。
- 生成 migration：`bunx drizzle-kit generate`
- 应用 migration：`bunx drizzle-kit migrate`

## 对象存储

- 图片等静态资源存储在 **阿里云 OSS** 上。
- 上传使用 OSS4-HMAC-SHA256 签名生成预签名 URL，客户端直传到 OSS。
- 相关 OSS 环境变量：`OSS_REGION`、`OSS_BUCKET`、`OSS_ENDPOINT`、`OSS_PUBLIC_BASE_URL`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`。
