# 健澜科技杠OS · GitHub 开源发布指南

本指南面向负责发布的维护者，说明如何把本地仓库安全、合规地发布到 GitHub，并完成社区化运营配置。
**当前仓库已完成开源化改造（Apache-2.0、双语 README、合规文件、CI），但尚未推送远端**（环境无发布凭证）。

> 目标仓库（占位，发布前替换为真实组织）：`https://github.com/jianlan-tech/gang-os`

---

## 一、发布前合规检查（必须逐项通过）

### 1. 密钥与隐私扫描

```bash
# 依赖与密钥扫描（CI 已含 gitleaks，本地可再跑一次）
bun run security:audit
# 全局人工排查常见密钥特征
grep -RInE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{12,}" --include=*.ts --include=*.yml --include=*.env .
```

- 确认 `.env*`（除 `.env.example` / `.env.compose.example`）均在 `.gitignore`，历史提交中**从未**包含真实口令；
- 若历史曾误提交，须用 `git filter-repo` 清理并轮换相关密钥，而非仅删除当前版本；
- 确认无内网地址、真实患者数据、CA 证书、私钥。

### 2. 数据许可合规

- [ ] 已阅读 [DATA_LICENSES.md](../../DATA_LICENSES.md)；
- [ ] 仓库**不含** SNOMED CT / UMLS / LOINC 离线包 / MIMIC / eICU / DrugBank 商业版等受限数据；
- [ ] `data/`、原始语料、大批量外部知识库已被 `.gitignore` 忽略；
- [ ] 内置 `scripts/knowledge/seed-data/` 仅为精炼示例，不含全文转载的受版权保护内容；
- [ ] 示例患者全部为虚构数据。

### 3. 许可证与版权头

- [ ] 根目录存在 [LICENSE](../../LICENSE)（Apache-2.0）、[NOTICE](../../NOTICE)、[THIRD_PARTY_LICENSES.md](../../THIRD_PARTY_LICENSES.md)；
- [ ] `package.json` 与 `web/package.json` 的 `license` 为 `Apache-2.0`；
- [ ] 新文件版权头使用 Apache 表述（历史文件 “All rights reserved” 建议在后续提交中分批替换，不阻断发布）；
- [ ] 第三方依赖许可证与 Apache-2.0 兼容（重点复核 SSPL/AGPL/Elastic License 组件，见第三方许可清单）。

### 4. 质量门禁

```bash
# 后端
bun run typecheck && bun test
# 前端
cd web && npx tsc --noEmit && npx vitest run && npm run build
```

- [ ] TypeScript 零错误；
- [ ] 后端 900+、前端 180+ 测试全部通过；
- [ ] `bun run lint` 无 error；
- [ ] 文档内的公司名统一为「健澜科技」，产品名为「健澜科技杠OS」。

### 5. 文档完备

- [ ] README.md（中文）、README_EN.md（英文）链接有效、徽章可显示；
- [ ] CONTRIBUTING / SECURITY / CODE_OF_CONDUCT / DATA_LICENSES 齐备；
- [ ] `.github/ISSUE_TEMPLATE`、`PULL_REQUEST_TEMPLATE`、CI/Release 工作流就绪；
- [ ] `agents/`、`examples/`、`docs/` 可被新人按 README 跑通（建议在干净环境克隆验证一次）。

---

## 二、初始化与首次提交

```bash
# 在项目根目录
git init
git branch -M main
git add .
git status            # 再次核对没有 .env / data/ / node_modules / dist
git commit -s -m "chore: 健澜科技杠OS 首次开源发布 (Apache-2.0)"
git tag -a v0.1.0 -m "release: v0.1.0 首个开源版本"
```

> `-s` 生成 DCO `Signed-off-by`。建议配置 `.git-blame-ignore-revs` 忽略大规模格式化提交。

## 三、创建 GitHub 仓库并推送

1. 在 GitHub 创建组织（如 `jianlan-tech`）与**空仓库** `gang-os`（不要勾选自动生成 README/LICENSE，避免冲突）；
2. 配置仓库元信息：
   - **Topics**：`healthcare`、`medical-ai`、`agent`、`orchestration`、`low-code`、`llm`、`his`、`fhir`、`hl7`、`dicom`、`cdss`、`typescript`、`bun`、`react`；
   - Description：`开源·免费·工业级的医疗智能体操作系统 —— 让医疗 AI 更简单、更落地`；
   - Website：官网/文档站（可选）；
3. 推送：

```bash
git remote add origin https://github.com/jianlan-tech/gang-os.git
git push -u origin main
git push origin v0.1.0
```

4. 如需保留内部多分支历史，按需推送 `develop` 等；首次开源建议只发布干净的 `main`。

## 四、GitHub 仓库设置（Settings）

- **General → Features**：勾选 Issues、Discussions（社区问答与智能体市场交流）、Projects（可选）；
- **Pull Requests**：开启“Always suggest deleting head branches”；
- **Branches → Add rule（main）**：
  - Require PR before merging、Require status checks（选择 CI 的 typecheck/lint/test/build/web-build）；
  - Require signed commits（可选）、Require linear history（推荐 Squash merge）；
  - Include administrators；
- **Secrets and variables → Actions**：配置发布所需（如 npm/Docker 凭证、`GITHUB_TOKEN` 默认已具备）；
- **Code security**：开启 Dependabot alerts、Dependabot security updates、Secret scanning、Push protection（如组织套餐支持）；
- **Security → Advisories**：验证私有安全公告链接可用（与 SECURITY.md / ISSUE config 一致）；
- 添加维护者团队与最小权限（Admin/Maintain/Write/Triage）。

## 五、发布 Release

- Tag 推送会触发 `.github/workflows/release.yml`（如已配置构建产物/Changelog）；
- 在 GitHub Releases 基于 `v0.1.0` 撰写发布说明：核心能力、快速开始、破坏性变更（无）、已知限制、校验和；
- 同步更新 [CHANGELOG.md](../../CHANGELOG.md)，遵循 Keep a Changelog + SemVer；
- 多阶段发布：`v0.1.x` 明确标注“开源预览/快速上手”，生产部署建议跟进 `v0.x` 稳定线。

## 六、社区运营建议

- 维护 `ROADMAP.md`（或 Projects 看板），公开优先级与“求助 wanted”标签；
- Issue 标签：`good first issue`、`help wanted`、`medical-domain`、`agent-template`、`tool`、`cds-rule`、`adapter`、`security`、`data-license`；
- 建立智能体模板/适配器/C DS 规则的**贡献目录与质量标准**（循证来源、测试、安全评审）；
- 在 Discussions 设“展示与分享（Showcase）”，鼓励医院分享自建智能体；
- 准备治理文档（治理模型、商标使用、第三方发行/云服务的商标与 SSPL 边界）；
- 对外材料引用《开源白皮书》。

## 七、发布后核对

- [ ] 全新环境 `git clone` → `bun install` → `bun test` → `web` 构建全部成功；
- [ ] README 徽章、文档锚点、示例（`bun examples/orchestrate.ts`）可用；
- [ ] CI 在 PR 上正常触发并全绿；
- [ ] 安全公告渠道（SECURITY.md 邮箱）有人值守；
- [ ] 在官网/公众号/技术社区发布开源公告与白皮书链接。

---

## 附：商标与商业化边界

- “健澜科技”“杠OS/Gang-OS”名称与标识为公司商标，Apache-2.0 授予代码许可但**不授予商标权**；
- 第三方基于本项目提供 SaaS/云服务时，须自行评估 Redis（RSAL/SSPL）、Elastic（Elastic License）、Grafana（AGPL）等组件许可，建议使用 ValKey/OpenSearch 等开源替代并遵守商标与 NOTICE 要求；
- 受限医学数据的获取与合规由使用方负责。
