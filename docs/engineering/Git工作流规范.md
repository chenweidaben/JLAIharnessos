# Git 工作流规范

> 版本：v1.0 · 日期：2026-09-16

完整规范见仓库根目录的 `CONTRIBUTING.md`，本文档为速查版。

## 1. 分支模型

| 分支 | 说明 |
| --- | --- |
| `main` | 生产分支，受保护，仅接受 Release PR |
| `develop` | 集成分支，日常功能合入 |
| `feature/*` | 新功能，从 `develop` 切出 |
| `fix/*` / `hotfix/*` | Bug 修复，`hotfix` 从 `main` 切出 |
| `release/v*` | 发布准备 |

命名一律小写、`-` 连接，禁止使用个人姓名。

## 2. 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

Closes #123
```

type：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore` / `security`。

## 3. PR 流程

1. 本地 `powershell -File scripts/ci.ps1` 全绿
2. 推送并创建 PR，使用 `.github/PULL_REQUEST_TEMPLATE.md`
3. 1 人 Review 通过；核心引擎 / 安全 / 审计模块需 2 人
4. CI 全部 Job 绿后 Squash Merge

## 4. 行尾与二进制

`.gitattributes` 已统一：

- 所有文本文件 `eol=lf`
- `*.ps1` / `*.bat` 保留 `crlf`
- 二进制文件（图片、PDF、`bun.lockb`）不做行尾转换

## 5. 不应提交的内容

`.gitignore` 已覆盖：

- `node_modules/`、`dist/`、`build/`
- `.env*`（真实密钥）
- `coverage/`、`*.log`
- `.vscode/`、`.idea/`
- 操作系统产物（`.DS_Store`、`Thumbs.db`）
