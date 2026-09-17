<!--
  健澜科技杠OS (Jianlan Gang-OS) - Pull Request 模板
  Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
  感谢你的贡献！请完整填写，帮助评审与保障患者安全。
-->

## 变更说明

<!-- 用 1~3 句话描述这个 PR 做了什么、为什么要做。 -->

## 变更类型

- [ ] feat 新功能
- [ ] fix Bug 修复
- [ ] refactor 重构（不改外部行为）
- [ ] perf 性能优化
- [ ] docs 文档
- [ ] style 格式
- [ ] test 测试
- [ ] chore 构建 / 工具
- [ ] security 安全修复

## 关联 Issue

Closes #

## 测试说明

- 新增 / 修改的测试：
- 手工验证步骤：
- 未覆盖的风险点：

## 检查清单

- [ ] 已阅读 [贡献指南](../CONTRIBUTING.md)、[安全策略](../SECURITY.md)、[数据许可](../DATA_LICENSES.md)
- [ ] 提交包含 `Signed-off-by`（DCO）
- [ ] 后端 `bun run typecheck && bun test` 通过
- [ ] 前端 `cd web && npx tsc --noEmit && npx vitest run && npm run build` 通过（如涉及）
- [ ] 新增逻辑有对应测试，覆盖率不低于现有水平
- [ ] **医疗规则/知识均循证、可溯源**，已在描述中给出权威出处（指南/药典/国标）
- [ ] 不包含任何真实患者数据、密钥、内网地址
- [ ] 涉及患者数据的输出已脱敏；高风险动作有人工确认/双复核
- [ ] 涉及权限 / 审计 / 安全的改动已在描述中重点说明
- [ ] 新依赖许可证与 Apache-2.0 兼容，并已登记 THIRD_PARTY_LICENSES.md
- [ ] 文档（`docs/`、README、API）已同步更新
- [ ] 公司名写作「健澜科技」，无错别字

## 截图 / 日志（如适用）

<!-- UI 改动请贴截图；编排/医疗逻辑改动可贴关键执行记录或 DAG 示意。 -->
