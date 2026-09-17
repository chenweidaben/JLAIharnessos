# CI/CD 测试流水线与性能基准

> 健澜科技数智医院智能体
> Copyright (c) 2026 健澜科技. All rights reserved.

## 1. 测试执行命令

```bash
# 全量单元+集成+安全+性能
bun test

# 生成覆盖率报告（行覆盖率门禁 > 80%）
bun test --coverage

# 仅跑安全回归
bun test tests/security/

# 仅跑端到端医疗场景
bun test tests/integration/

# 仅跑性能基准
bun test tests/performance/
```

## 2. 流水线阶段

1. **Lint/类型检查**：TypeScript 严格模式先行。
2. **单元测试**：`bun test` 全绿。
3. **安全回归**：注入检测率 ≥ 95%，正常输入零误报。
4. **覆盖率门禁**：行覆盖率不低于基线（当前 86.29%）。
5. **性能趋势**：记录只读工具平均时延。

## 3. 失败处理

| 类型 | 处置 |
| --- | --- |
| 用例失败 | 阻断合并，附堆栈与复现命令 |
| 覆盖率下降 | 阻断合并 |
| 检测率回退 | 阻断合并 |
| 偶发时序失败 | 多轮复现，修复测试隔离性后放行 |

## 4. 性能基准（Mock 环境实测）

| 基准 | 目标 | 实测 |
| --- | --- | --- |
| query_patient 平均响应 | < 100ms | < 1ms |
| get_patient_detail 平均响应 | < 100ms | < 1ms |
| get_order_list 平均响应 | < 100ms | < 1ms |
| Token 预算单轮评估 | < 5ms | ~0.002ms |
| 10 并发只读查询 | < 500ms | < 1ms |

> 以上为开发环境 Mock 数据结果，仅供相对趋势参考；生产 SLA 以压测环境为准。
