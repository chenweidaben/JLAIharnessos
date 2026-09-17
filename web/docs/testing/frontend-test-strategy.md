# 健澜科技数智医院智能体 - 前端测试策略

> Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.

## 1. 测试金字塔

| 层级 | 占比 | 工具 | 目录 |
|------|------|------|------|
| 单元测试（工具函数 / Hooks / Store） | 70% | Vitest | `tests/unit/` |
| 组件测试（通用 / 医疗 / 对话 / 布局） | 20% | Vitest + React Testing Library | `tests/components/` |
| E2E 测试（核心用户流程） | 10% | Playwright | `tests/e2e/` |

## 2. 测试范围

### 必须测试
- 纯工具函数（format / validate / storage / desensitize / download / auth）
- 自定义 Hooks（useChatStream / useAlert / useDebounce / useThrottle）
- Zustand Store 的状态变更逻辑
- 通用展示组件（StatCard / StatusBadge / PageContainer / EmptyState）
- 医疗核心组件（LabResultItem / AlertBanner / PatientInfoCard / VitalSignsPanel）
- 核心用户流程（登录 / 工作台 / 对话 / 患者360 / 门诊 / 急诊 / 质控 / 系统管理）

### 暂不测试
- 纯展示性 ECharts 图表（通过 E2E 截图验证）
- Mock 数据文件本身
- 第三方组件库内部行为

## 3. 命名规范

- 测试文件：`*.test.ts` / `*.test.tsx`（单元/组件）、`*.spec.ts`（E2E）
- 测试用例：`describe('模块名')` → `it('场景描述')`
- 中文描述，符合医疗业务语义

## 4. 覆盖率目标

| 指标 | 阈值 |
|------|------|
| 行覆盖率 (lines) | ≥ 80% |
| 分支覆盖率 (branches) | ≥ 70% |
| 函数覆盖率 (functions) | ≥ 80% |
| 语句覆盖率 (statements) | ≥ 80% |

## 5. Mock 策略

- **浏览器 API**：jsdom 已内置 localStorage/sessionStorage；matchMedia / IntersectionObserver / ResizeObserver 在 `tests/setup.ts` 中全局 Mock
- **WebSocket**：`tests/mocks/mockWebSocket.ts` 提供 `MockWsClient`，Hook 测试通过 `vi.mock('@/services/websocket')` 替换
- **数据工厂**：`tests/fixtures/factories.ts` 提供 createPatient / createLabResult 等工厂函数，支持 partial 覆盖
- **网络请求**：单元测试不依赖真实网络；E2E 使用开发服务器 + 前端 Mock

## 6. 运行命令

```bash
# 单元 / 组件测试
npm run test              # 单次运行
npm run test:watch        # 监听模式
npm run test:coverage     # 覆盖率报告
npm run test:ui           # Vitest UI 界面

# E2E 测试
npm run test:e2e          # 运行全部 E2E
npm run test:e2e:ui       # Playwright UI
npm run test:e2e:report   # 查看 HTML 报告

# 代码质量
npm run lint              # ESLint 检查
npm run lint:fix          # 自动修复
npm run typecheck         # TypeScript 类型检查
npm run format            # Prettier 格式化
```

## 7. CI/CD 集成

CI 流水线执行顺序：
1. `npm ci` 安装依赖
2. `npm run lint` 代码检查
3. `npm run typecheck` 类型检查
4. `npm run test:coverage` 单元测试 + 覆盖率
5. `npm run build` 构建验证
6. `npm run test:e2e` E2E 测试（需先启动 dev server）
