# Soul House Supabase 一键部署

这是给小白使用的数据库部署方式，用来把 `心灵小屋` 的表结构、RLS 权限、15 个测评、报告模板、会员套餐、后台配置一次性导入到 Supabase。

## 你需要准备什么

只需要一个 Supabase 数据库连接串，格式类似：

```text
postgresql://postgres:[YOUR-PASSWORD]@db.wrtgytkjnfvmmmkeltob.supabase.co:5432/postgres
```

获取路径：

1. 打开 Supabase Dashboard。
2. 进入项目 `wrtgytkjnfvmmmkeltob`。
3. 进入 `Project Settings -> Database -> Connection string`。
4. 选择 `URI`，复制连接串。
5. 如果里面有 `[YOUR-PASSWORD]`，脚本会让你在本地窗口输入数据库密码。

如果你忘记数据库密码，可以在 Supabase 的 Database 设置里重置数据库密码。

## 一键执行

在项目根目录双击：

```text
deploy-supabase-one-click.bat
```

脚本会自动完成：

- 检查 Node.js 和 Prisma CLI
- 执行 `supabase/deploy.sql`
- 验证测评、套餐、报告模板是否导入
- 可选写入 `.env.local`

## 命令行执行

也可以在项目根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-supabase.ps1
```

如果你已经拿到了完整连接串，也可以这样运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-supabase.ps1 -DatabaseUrl "postgresql://..."
```

## 注意事项

- 建议对空的 Supabase 项目执行。
- 不要把数据库密码、service role key 发到聊天里。
- `.env.local` 已在 `.gitignore` 中，不会被提交到代码仓库。
- Cloudflare Pages 部署时，需要把 `.env.local` 里的环境变量复制到 Cloudflare Pages 的环境变量设置里。
