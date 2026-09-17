# CI/CD 流水线说明

> 版本：v1.0 · 日期：2026-09-16

## 1. 总览

项目使用 **GitHub Actions**，包含两条流水线：

| 流水线 | 触发 | 目的 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push / PR 到 `main`、`develop` | 每次提交的质量门禁 |
| `.github/workflows/release.yml` | push tag `v*` | 构建生产版本并发布 Release |

## 2. CI 流水线

包含 6 个 Job：

1. **typecheck**：`tsc --noEmit`
2. **lint**：ESLint（`--max-warnings 0`）+ Prettier 检查
3. **unit-test**：`bun test tests/unit --coverage`，上传覆盖率产物
4. **integration-test**：集成测试（暂无则 warn 跳过）
5. **security-audit**：`bun audit` + gitleaks 扫描
6. **build**：生产构建，上传 `dist/`

失败时由 `notify` Job 在 main / develop 分支输出失败摘要。

### 缓存策略

- `~/.bun/install/cache` 与 `node_modules` 均按 `package.json` hash 缓存
- 同一分支新推送自动取消旧流水线（concurrency 配置）

## 3. 发布流水线

触发 `v*` tag 时执行：

1. 检出代码（含全量 git 历史）
2. 类型检查 + Lint + 测试
3. 生产构建
4. 基于两个相邻 tag 间的 commit 自动生成变更日志
5. 使用 `softprops/action-gh-release` 创建 Release，附带 `dist/` 产物
6. tag 含 `-beta` / `-rc` 时自动标记为预发布

## 4. 本地等价运行

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts/ci.ps1

# macOS / Linux
bash scripts/ci.sh
```

脚本按顺序执行：typecheck → lint:ci → format:check → test:unit → build。任一步失败立即退出。

## 5. 扩展指南

- 新增 Job：复制 `ci.yml` 中已有 Job 模板，使用 `needs` 串依赖
- 私有镜像 / 自托管 Runner：在 `runs-on` 中替换为 `self-hosted, linux, medical`
- 通知企业微信 / 飞书：在 `notify` Job 中接入对应 webhook
