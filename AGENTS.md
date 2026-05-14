# 项目说明

## Cloudflare D1 本地开发

- `bun run dev` 默认使用本地 D1 数据库。
- 本地 D1 状态存放在 `.wrangler/state/v3/d1`。
- 本地开发会读写本地 D1 数据库，不会读写 Cloudflare 远程 D1 数据库。
- 使用下面的命令应用本地 D1 migration：

  ```bash
  bunx wrangler d1 migrations apply DB --local
  ```

- 如需操作远程 D1 数据库，必须显式传入 `--remote`，例如：

  ```bash
  bunx wrangler d1 migrations apply DB --env staging --remote
  ```

- 除非明确希望本地开发连接远程数据库，否则不要给 D1 binding 添加 `remote: true`。
