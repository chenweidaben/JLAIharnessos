# 贡献指南（Contributing to Jianlan Gang-OS）

首先，感谢你愿意为健澜科技杠OS 贡献力量！我们的目标是和全国医院信息科、医疗 IT 厂商、
高校与全球开发者一起，把这个免费开源的工业级医疗智能体操作系统，打磨成
**医疗 AI 的安卓系统**。

本项目面向真实临床场景，**代码质量、患者安全与数据合规是最高优先级**。
请在贡献前阅读本指南、[行为准则](CODE_OF_CONDUCT.md)、[安全策略](SECURITY.md)
与[数据许可说明](DATA_LICENSES.md)。

## 一、开发环境

- [Bun](https://bun.sh/) ≥ 1.3、Node.js ≥ 18、Git ≥ 2.40
- 推荐 VS Code（ESLint + Prettier 插件）

```bash
git clone https://github.com/jianlan-tech/gang-os.git
cd gang-os
bun install
bun run typecheck     # 类型检查
bun test              # 后端测试
cd web && npm install && npx vitest run   # 前端测试
```

## 二、你可以贡献什么

我们欢迎各种形式的贡献，尤其是医疗领域的专业沉淀：

- 🩺 **医疗工具**（`src/medical-tools/`）：新增/完善一个临床工具，配 Zod schema、风险分级与单测；
- 🤖 **智能体模板**（`agents/`）：提交一个开箱即用的 `agent.yaml` + 提示词 + 示例；
- 💊 **CDS 规则**：药物相互作用、危急值、诊疗规范等**循证**规则，须注明权威来源；
- 📚 **知识接入与解析**：新的知识库连接器、术语映射、检索/重排优化（注意[数据许可](DATA_LICENSES.md)）；
- 🔌 **集成适配器**：HIS/EMR/LIS/PACS 厂商适配、HL7/FHIR/DICOM 增强；
- 🛠️ **编排内核 / 低代码画布 / 安全 / 性能 / 文档 / 国际化**。

> ⚠️ 医疗规则与知识**必须循证、可溯源**，并在 PR 中给出权威出处（指南、药典、国标等）；
> 禁止提交无法核实的医学结论，禁止提交任何真实患者数据（即使声称已脱敏）。

## 三、分支与提交规范

请从最新 `main` 切分支，命名：

- `feature/<scope>-<desc>`、`fix/<desc>`、`docs/<desc>`、`security/<desc>`

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat(medical-tools): 新增药品相互作用批量审查工具
fix(cds): 修复头孢类危急值区间误判
docs(agents): 补充语音病历模板说明
```

type 可选：`feat / fix / docs / style / refactor / test / chore / perf / security`。

### 开发者原创声明（DCO）

本项目采用 [Developer Certificate of Origin](https://developercertificate.org/)。
提交时请加 `Signed-off-by`，表示你确认有权以 Apache-2.0 许可贡献该内容：

```bash
git commit -s -m "feat(...): ..."
# 提交信息末尾将自动包含：
# Signed-off-by: 你的姓名 <you@example.com>
```

## 四、Pull Request 流程

1. Fork 仓库并从 `main` 切功能分支；
2. 本地确保门禁通过（见下）；
3. 编写/更新测试，补充必要文档与 API 说明；
4. 创建 PR，填写 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)，关联 Issue（`Closes #123`）；
5. 维护者评审：一般改动至少 1 人通过；**编排内核 / 安全 / 审计 / 医疗规则**需 2 人评审；
6. CI 全绿后 Squash Merge。

### 提交前自检

```bash
bun run typecheck && bun run lint && bun test
cd web && npx tsc --noEmit && npx vitest run && npm run build
```

评审清单：

- [ ] 功能正确，覆盖正常 / 异常 / 边界路径；新增逻辑有测试
- [ ] 医疗结论循证、来源可追溯；高风险动作有人工确认/双复核
- [ ] 无 `any` 滥用、无 `@ts-ignore`、无硬编码密钥/内网地址/真实患者数据
- [ ] 同步更新文档、`agents/` 清单或 API 文档
- [ ] 公司名称统一写作「**健澜科技**」（勿写同音字）
- [ ] 新依赖许可证与 Apache-2.0 兼容，并登记到 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)

## 五、代码与文档约定

- TypeScript 严格模式；ESM/NodeNext，相对路径 import 带 `.js` 后缀；
- 后端测试使用 `bun:test`，前端使用 Vitest + Testing Library；
- 命名清晰、函数职责单一、关键医疗逻辑写清注释与循证依据；
- 文档以中文为主，关键面向开源的文档提供英文版更佳。

## 六、Issue 与安全问题

- Bug / 需求请使用对应 [Issue 模板](.github/ISSUE_TEMPLATE/)，提供复现步骤与环境；
- **安全漏洞请勿公开 Issue**，按 [SECURITY.md](SECURITY.md) 私下报告；
- 讨论请保持友善专业，遵守[贡献者公约](CODE_OF_CONDUCT.md)，医疗讨论以循证为准。

## 七、行为准则

参与本项目即表示你同意遵守 [贡献者公约](CODE_OF_CONDUCT.md)：尊重、包容、对事不对人，
共同守护患者安全与开源社区的健康氛围。

再次感谢你的贡献 —— 让医疗 AI 更简单、更落地。
