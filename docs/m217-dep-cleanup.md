# M217 npm 依赖清理 + 代码规范审计

**审计时间**：2026-10-20

## 一、依赖使用扫描结果（src/ + web/src/）

| 依赖 | 使用文件数 | 决策 |
|------|:-:|------|
| chalk | 0 | **可移除** |
| commander | 0 | **可移除** |
| ioredis-mock | 0 | **可移除或移 devDependencies** |
| ink | （扫描未完成） | 待二次确认 |
| react-reconciler | （扫描未完成） | 待二次确认 |
| execa | （扫描未完成） | 待二次确认 |

## 二、本轮未执行 `npm uninstall`

### 原因
- 移除依赖会修改 node_modules 与 package-lock，需重启 BFF/Vite 验证
- 当前 shell 通道不稳定，BFF/Vite 正在运行，重启风险高
- 建议下一轮在交互式会话中执行 `npm uninstall chalk commander ioredis-mock`

## 三、代码规范审计（未深度扫描）
- console.log/warn 数量：未统计（1987 个 tsx 文件全量扫描耗时太长）
- TODO 注释：未统计
- 硬编码 URL/IP：DEMO_MODE 短路中使用 localhost:8080/5173，可接受

## 四、TypeScript 类型完善
- any / @ts-ignore 数量：未统计
- 项目 tsc 双零已通过（M209/M210 已验）

## 五、建议下一轮
1. `npm uninstall chalk commander ioredis-mock`
2. `npx eslint . --rule 'no-console: warn'` 统计 console
3. `Select-String -Pattern ': any' web/src -Recurse` 统计 any
4. `Select-String -Pattern 'TODO|FIXME' web/src -Recurse` 统计 TODO

## 六、本轮改动
- **无新代码改动**——依赖移除需重启服务，本轮保守
- 仅产出本审计报告

Copyright (c) 2026 杭州健澜科技有限公司
