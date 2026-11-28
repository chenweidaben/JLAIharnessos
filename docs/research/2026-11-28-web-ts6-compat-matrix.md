# Web 前端子仓升级 TypeScript 6.0 兼容矩阵评估（只读）

- 编制日期：2026-11-28
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 评估分支：`consult-agent-m86`（本次评估**未切换分支、未修改任何 `web/` 配置、锁文件、源码或既有 TS 5.6.3 构建**）
- 评估对象：`web/` 独立前端（工具链独立：Vite + esbuild + Vitest + jsdom + antd 5 + React 19）
- 目标版本：TypeScript **6.0.2**（参照根后端已在运行的版本）
- 产品名称：健澜AI原生医院操作系统OS；主体：健澜科技（杭州健澜科技有限公司）

> 结论性质：本报告为**只读兼容性评估**。所有"兼容/有条件兼容/疑似缺口/未知"判定均基于官方文档、npm 元数据、peer 区间与本地 `node_modules` 实测；查不到官方明确声明的项，一律标注"未查到官方明确兼容声明"，不臆断兼容或不兼容。最终结论须以独立试点分支上 `typecheck + vitest + build` 取证为准。

---

## 0. 评估范围与红线遵守情况

| 项 | 状态 |
| --- | --- |
| 是否在主干切换 TS6 | 否，未在本仓切 TS6 |
| 是否改动 `web/package.json` / `web/tsconfig.json` / 锁文件 / 源码 / 既有构建 | 否，全部只读 |
| 既有 web TS 5.6.3 构建是否保持不动 | 是，未触碰 |
| 联网核实范围 | TypeScript 6.0 发布说明、typescript-eslint 官方依赖版本矩阵、Vite/Vitest 官方支持版本页、npm peer 区间与 DT dist-tag、各库官方文档/CHANGELOG |

---

## 1. 现状版本表（依赖 / package.json 声明 / 本地实测 / 用途）

> "本地实测"取自 `web/node_modules/<pkg>/package.json` 版本字段（只读）。部分实测版本高于 `package.json` 声明区间内的早期快照，属 semver 区间内正常解析；与历史台账记录不一致处已在备注列标出，试点分支复核时以锁文件解析结果为准。

### 1.1 编译与工具链

| 依赖 | package.json 声明 | 本地实测版本 | 用途 | 备注 |
| --- | --- | --- | --- | --- |
| typescript | `~5.6.3` | **5.6.3** | 类型检查（`tsc --noEmit`）、构建前置门禁 | 现状 `bun run --cwd web typecheck` 实测 exit 0 |
| vite | 未直接声明（经 `@vitejs/plugin-react` peer 引入） | **5.4.21** | 开发服务器 / 生产打包 | 见 §2 矩阵；Vite 5 已不在官方支持矩阵 |
| @vitejs/plugin-react | `^4.3.4` | **4.7.0** | React Fast Refresh（Babel） | peer: `vite ^4.2 \|\| ^5 \|\| ^6 \|\| ^7` |
| vitest | `^2.1.8` | **2.1.9** | 单元 / 组件测试运行器 | Vitest 2.1 已不在官方支持矩阵 |
| @vitest/coverage-v8 | `^2.1.8` | **2.1.9** | v8 覆盖率采集 | 须与 vitest 同版本 |
| @vitest/ui | `^2.1.8` | **2.1.9** | Vitest 浏览器 UI | 须与 vitest 同版本 |
| jsdom | `^25.0.1` | **25.0.1** | 测试 DOM 环境 | 纯运行时，不发 d.ts |
| eslint | `^9.15.0` | **9.39.4** | Flat Config 静态检查 | ESLint 9 |
| typescript-eslint | `^8.15.0` | **8.70.0** | ESLint 的 TS parser / 规则 | peer: `typescript >=4.8.4 <6.1.0` |
| @types/node | `^22.10.1` | **22.20.3** | Node 全局/模块类型（配置文件用） | 试点需复核与 TS6 类型加载 |
| @testing-library/dom | `^10.4.0` | **10.4.2** | DOM 查询/事件底层 | — |
| @testing-library/jest-dom | `^6.6.3` | **6.10.0** | 断言匹配器（全局类型已入 tsconfig `types`） | — |
| @testing-library/react | `^16.1.0` | **16.3.3** | React 组件测试 | peer: `@types/react ^18\|\|^19`、`react ^18\|\|^19` |
| @testing-library/user-event | `^14.5.2` | **14.6.7** | 用户事件模拟 | — |
| tailwindcss | `^3.4.15` | **3.4.19** | CSS 工具链（PostCSS） | — |

### 1.2 运行时与 UI 库

| 依赖 | package.json 声明 | 本地实测版本 | 用途 | 备注 |
| --- | --- | --- | --- | --- |
| react | `^19.0.0` | **19.3.0** | React 运行时 | — |
| react-dom | `^19.0.0` | **19.3.0** | React DOM 渲染 | — |
| @types/react | `^19.0.1` | **19.3.0** | React 类型定义 | DT 19.3.0 已带 `ts6.0` dist-tag；台账曾记 19.0.1，以实测 19.3.0 为准 |
| @types/react-dom | `^19.0.2` | **19.3.0** | React DOM 类型定义 | 同上 |
| antd | `^5.22.2` | **5.29.3** | React UI 组件库 | 自带 d.ts；peer 仅 `react >=16.9`、`react-dom >=16.9` |
| @ant-design/icons | `^5.5.1` | **5.6.1** | antd 图标 | 与 antd 6 配套时须升 icons 6 |
| @ant-design/v5-patch-for-react-19 | `^1.0.3` | **1.0.3** | antd v5 在 React 19 下的运行时兼容补丁（入口副作用引入） | peer: `antd >=5.22.6`、`react >=19.0.0` |
| @xyflow/react | `^12.11.6` | **12.11.6** | 流程图 / 智能体编排画布 | 自带 TS 类型；peer `@types/react >=17`；上游已发 13.0.2 |
| echarts | `^5.5.1` | **5.6.0** | 图表 | 自带 d.ts；台账曾记 5.5.1，以实测 5.6.0 为准 |
| echarts-for-react | `^3.0.2` | **3.0.6** | echarts React 封装 | — |
| react-router-dom | `^6.28.0` | **6.30.6** | 路由 | — |
| zustand | `^5.0.1` | **5.0.15** | 状态管理 | — |
| dayjs | `^1.11.13` | **1.11.23** | 日期处理 | — |
| lodash-es | `^4.17.21` | **4.18.1** | 工具函数 | 配 `@types/lodash-es 4.17.12` |
| axios | `^1.7.9` | **1.20.0** | HTTP 客户端 | — |
| clsx | `^2.1.1` | **2.1.1** | 类名拼接 | — |
| yaml | `^2.9.1` | **2.9.1** | YAML 解析 | — |
| qrcode.react | `^4.2.0` | **4.2.0** | 二维码组件 | — |

### 1.3 web 现有 tsconfig 关键项（`web/tsconfig.json`，只读）

- `target`: `ES2020`；`lib`: `["ES2020", "DOM", "DOM.Iterable"]`
- `module`: `ESNext`；`moduleResolution`: `bundler`；`isolatedModules`: `true`
- `jsx`: `react-jsx`；`strict`: `true`；`skipLibCheck`: `true`
- `noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch`: `true`
- `esModuleInterop`: `true`；`forceConsistentCasingInFileNames`: `true`
- `types`: `["vite/client", "vitest/globals", "@testing-library/jest-dom"]`（**未列 `"node"`**）
- 无 `baseUrl`（已在 v5.0 试点移除，paths 相对解析）；无 `ignoreDeprecations`
- `include`: `src`、`tests`、`vitest.config.ts`、`playwright.config.ts`
- 类型垫片：`src/vite-env.d.ts`（`/// <reference types="vite/client" />` + `ImportMetaEnv` 补充）

### 1.4 构建 / 测试接线（只读）

- `web/package.json` 脚本：`typecheck = tsc --noEmit`；`build = tsc --noEmit && vite build`；`test = vitest run`；`lint = eslint .`
- `vite.config.ts`：`react()` 插件；`build.target = es2020`；manualChunks 分包 react-vendor / antd-vendor / echarts-vendor / utils
- `vitest.config.ts`：环境 `jsdom`；`globals: true`；setup `./tests/setup.ts`；覆盖率 v8，门槛行 80 / 分支 70 / 函数 80 / 语句 80
- 根后端测试由独立 `bun test` 跑；**web 测试由独立 vitest 跑，不经过根 `bun test`**

---

## 2. 兼容矩阵：各依赖对 TypeScript 6.0 的状态评估

### 2.1 状态判定口径

| 标记 | 含义 |
| --- | --- |
| 兼容 | 官方 peer 区间 / DT dist-tag / 官方文档明确覆盖 TS 6.0，或机制上与 TS 编译器无耦合 |
| 有条件兼容 | 机制上低风险或不直接耦合，但存在版本前提，或须在试点分支取证确认 |
| 疑似缺口 | 存在已知风险点（工具链 EOL、自带 d.ts 未验证、默认值翻转等），且未查到正向官方声明 |
| 未知 | 未查到官方明确兼容/不兼容声明，须分支取证，不臆断 |

### 2.2 逐项矩阵

| # | 依赖（实测版本） | 对 TS 6.0 状态 | 依据与来源 | 评估说明 / 风险点 |
| --- | --- | --- | --- | --- |
| 1 | **antd 5.29.3** | **未知（疑似需分支取证）** | 未查到 antd 官方对 TypeScript 6.x 的明确兼容声明；antd 自带 TS 定义，peer 仅 `react/react-dom`（本地 `node_modules/antd/package.json` 实测）。CHANGELOG 仅见组件类型修复条目，无 TS6 适配说明：https://ant.design/changelog-cn | antd v5 已进入一年维护期尾声，官方公告常规维护计划于 **2026 年底结束**，之后聚焦 v6，后续 TS6 补丁预期有限：https://ant.design/docs/blog/v5-ood/ 。试点首要取证面：`antd/**/*.d.ts` 在 tsc 6.0 + strict 下是否产生类型报错；若报错，v5 侧可回旋空间小。 |
| 2 | **@ant-design/v5-patch-for-react-19 1.0.3** | **有条件兼容（低风险）** | 运行时副作用补丁（`import '@ant-design/v5-patch-for-react-19'`），类型面极小；peer `antd >=5.22.6`、`react >=19`。未查到 TS6 专门声明。官方 React 19 兼容说明：https://5x-ant-design.antgroup.com/docs/react/v5-for-19 ；npm：https://www.npmjs.com/package/@ant-design/v5-patch-for-react-19 | 仅在入口执行运行时打补丁，不向消费者导出复杂类型；TS 编译器耦合风险低。试点确认入口导入语句在 TS6 下无类型告警即可。 |
| 3 | **React 19.3.0 / react-dom 19.3.0（运行时）** | **兼容** | React 运行时库与 TS 编译器版本无耦合；React 19 升级指南要求配套 `@types/react@^19`：https://19.react.dev/blog/2024/04/25/react-19-upgrade-guide | 运行时本身不参与类型检查；风险集中在配套类型定义（见 #4）。 |
| 4 | **@types/react 19.3.0 / @types/react-dom 19.3.0** | **兼容（有条件：保持 19.3.x 最新）** | DefinitelyTyped `@types/react` 19.3.0 已发布 `ts6.0` dist-tag（同时挂 `ts5.6`…`ts5.9`、`ts7.0/7.1`），表明该版本类型经 TS 6.0 类型校验：https://www.npmjs.com/package/@types/react?activeTab=versions ；旁证 `@types/react-is` 19.3.0 同样挂 `ts6.0` 标签：https://www.npmjs.com/package/@types/react-is?activeTab=versions | 前提：不要回退到 19.0.x 旧类型快照。试点若锁文件解析出 19.0.x，应在分支内对齐到 19.3.x。`@types/react-dom` 同版本策略。 |
| 5 | **Vite 5.4.21** | **有条件兼容（官方未查到 TS6 明确声明；工具链已 EOL）** | Vite 经 esbuild 转译 TS，**类型检查由独立 `tsc --noEmit` 完成**，Vite 不消费 TS 编译器版本做类型求解：https://v5.vite.dev/guide/features 。官方支持版本页：当前仅 `vite@8.3` 常规补丁，`7.3/8.2` 回补重要修复，`6.4/8.1` 回补安全补丁；**Vite 5.0.0 已明确标注 not supported**：https://vite.dev/releases | 风险分两层：① esbuild 能否解析 TS6 源码语法——TS 6.0 主要为弃用项移除与默认值翻转，未引入 esbuild 尚未支持的重大新语法；② Vite 5 已 EOL，即便暴露 TS6 兼容问题也不会回补。试点先保留 5.4 取证；中长期须规划升 Vite 6.4+ / 8.x。 |
| 6 | **@vitejs/plugin-react 4.7.0** | **有条件兼容（低风险）** | Babel Fast Refresh 插件，不调用 tsc；peer `vite ^4.2 || ^5 || ^6 || ^7`。未查到 TS6 专门声明。npm：https://www.npmjs.com/package/@vitejs/plugin-react |  dev 期 HMR 与类型检查解耦；风险低。若中长期升 Vite 大版本，按 peer 范围联动核对插件版本。 |
| 7 | **Vitest 2.1.9（含 coverage-v8 / ui 2.1.9）** | **疑似缺口** | 未查到 Vitest 2.1 对 TypeScript 6.x 的明确兼容声明。官方支持版本页：当前常规补丁 `vitest@5.1`，回补 `4.1/5.0`；**更早版本（含 2.x）不再受支持**：https://vitest.dev/releases.html 。Vitest 说明其类型定义可能随 TS 版本调整而在次版本间变更，并可能抬高最低 TS 版本：同页 "TypeScript Definitions" 节 | 风险：① Vitest 2.1 自带类型（`vitest/globals` 等）在 tsc 6.0 下是否通过未验证；② 工具链 EOL，问题不回补；③ 底层复用 Vite/esbuild 转译测试文件，与 #5 联动。试点先按 2.1 取证；若类型报错且无法本地垫片，评估升 Vitest 4.1 / 5.x（连带评估 jsdom、coverage、ui 版本对齐）。 |
| 8 | **jsdom 25.0.1** | **兼容（运行时，无 TS 编译器耦合）** | jsdom 为纯 JS 运行时环境，不发布 d.ts；测试断言/全局类型来自 `vitest/globals` 与 `@testing-library/*`，不依赖 jsdom 自带类型。peer 仅可选 `canvas`。 | 与 TS 编译器版本无直接耦合；随 Vitest 升级时再核对 jsdom 兼容版本即可。 |
| 9 | **typescript-eslint 8.70.0** | **兼容** | 官方依赖版本矩阵：当前支持 TypeScript 区间 **`>=4.8.4 <6.1.0`**，覆盖 6.0.2：https://typescript-eslint.io/users/dependency-versions/ 。本地 peer 区间一致（`>=4.8.4 <6.1.0`）。parser 对非支持版本会告警/报错（`onUnsupportedTypeScriptVersion`）：https://typescript-eslint.io/packages/parser/ | 注意：`package.json` 声明 `^8.15.0`；8.15.0 发布时其支持区间尚为 `<5.7.0`（见 parser 文档示例）。试点应将 tseslint 对齐到根后端 **8.71.2** 或更新 8.x，避免锁文件解析到早期 8.15.x 而不在 TS6 支持窗口内。ESLint 9.39.4 在 tseslint 支持的 `^8.57 || ^9 || ^10` 区间内。 |
| 10 | **@testing-library/react 16.3.3（+dom 10.4.2 / jest-dom 6.10.0 / user-event 14.6.7）** | **未知（低风险，分支取证）** | 库自带类型定义（`@types/testing-library__react` 已废弃 stub）；peer `@types/react ^18||^19`、`react ^18||^19`。未查到对 TS6 的明确声明。官方介绍：https://testing-library.com/docs/react-testing-library/intro/ | 类型面向 React 19 类型体系，不锁 TS 编译器版本；风险低。试点取证其 `.d.ts` 在 tsc 6.0 下无报错；`@testing-library/jest-dom` 全局类型已在 tsconfig `types` 中显式枚举。 |
| 11 | **tailwindcss 3.4.19** | **兼容（低风险，无编译器耦合）** | Tailwind 3.4 为 PostCSS CSS 编译工具链；TS 类型仅用于配置文件注解（`/** @type {import('tailwindcss').Config} */`），不进入消费者产物类型检查。未查到 TS6 专门声明。官方配置文档：https://v3.tailwindcss.com/docs/configuration | 与 TS 编译器版本基本解耦；风险低。注意上游 Tailwind 4 已普及，中长期可另评估，不在本次 TS6 范围。 |
| 12 | **@xyflow/react 12.11.6** | **未知（分支取证）** | 库以 TypeScript 编写并导出节点/边类型；peer `@types/react >=17`、`react >=17`。未查到对 TS6 的明确声明。官方 TS 用法：https://reactflow.dev/learn/advanced-use/typescript ；npm（上游已发 13.0.2）：https://www.npmjs.com/package/@xyflow/react | 风险：自带泛型/类型守卫在 tsc 6.0 推断规则下可能报错。试点取证 12.11.6；若类型报错，评估随上游升 13.x（需另做 API/样式回归）。 |
| 13 | **echarts 5.6.0（+ echarts-for-react 3.0.6）** | **疑似缺口** | echarts 自带 d.ts，包内维护最低支持 TS 版本判定（`MIN_VERSION` in `echarts/build/testDts.js`），用于兼容旧 TS 版本：https://apache.googlesource.com/echarts/+/baaeec5cc11a200f6f08f291c5f238009420988c/package.README.md 。未查到对 TS6 的明确兼容声明；`@types/echarts` 为废弃 stub，类型以 echarts 自带为准。 | 风险：自带 d.ts 基于较早 TS 版本编写，在 tsc 6.0 strict / 新推断与类型排序（`--stableTypeOrdering` 相关行为）下可能暴露报错。试点重点取证图表组件相关类型；必要时评估 echarts 6.x 生态版本。`echarts-for-react` 封装类型一并核对。 |
| 14 | **其余运行时库**（react-router-dom 6.30.6、zustand 5.0.15、dayjs 1.11.23、lodash-es 4.18.1 + @types/lodash-es 4.17.12、axios 1.20.0、clsx 2.1.1、yaml 2.9.1、qrcode.react 4.2.0） | **未知（随 typecheck 一并取证）** | 未逐项查到 TS6 明确声明；多数为运行时库或带宽松类型。 | 不单独阻断；试点 `tsc --noEmit` 时按报错来源包归类记录。`@types/lodash-es`、`@types/node` 等 DT 类型在试点复核其 `ts6.0` 标签覆盖情况。 |

### 2.3 矩阵汇总

| 判定 | 项 |
| --- | --- |
| 兼容 | React 19 运行时；@types/react 19.3.x / @types/react-dom 19.3.x；jsdom 25.0.1；typescript-eslint 8.70/8.71；tailwindcss 3.4.19（低风险） |
| 有条件兼容 | v5-patch-for-react-19；@vitejs/plugin-react；Vite 5.4（EOL，中长期须升级） |
| 疑似缺口 | Vitest 2.1（EOL，类型未验证）；echarts 5.6（自带 d.ts 未验证） |
| 未知 | antd 5.29.3；@testing-library/react 16.3.3；@xyflow/react 12.11.6；其余运行时库 |

---

## 3. 根后端已跑 TS 6.0.2 的可复用经验与不可照搬差异

### 3.1 根后端现状（只读实测）

- 根 `typescript`: **6.0.2**；`typescript-eslint`: **8.71.2**；`react`: 19.2.4；`@types/react`: 19.3.0
- 根 `tsconfig.json`：`target ES2022`、`lib ["ES2022","DOM"]`、`module ESNext`、`moduleResolution bundler`、`jsx react-jsx`、`strict`、`esModuleInterop`、`skipLibCheck`、`isolatedModules`、`noEmit`、**`ignoreDeprecations: "6.0"`**、`types: ["bun-types"]`
- 根运行形态：Bun runtime + `bun test` + ink 终端视图（`react-reconciler` 自研渲染）

### 3.2 可复用经验

| 经验点 | 根后端做法 | web 试点可复用方式 |
| --- | --- | --- |
| 弃用项过渡开关 | `ignoreDeprecations: "6.0"` 静默 6.0 弃用告警 | web 试点 tsconfig 同加该字段；注意 **7.0 将不再支持这些弃用项**，过渡期后须清理 |
| tseslint 配套大版本 | 8.71.2 配合 TS 6.0.2 | web tseslint 对齐到 ≥8.71 的 8.x，落在官方 `<6.1.0` 窗口内 |
| 模块解析 | `moduleResolution: bundler` | web 现已是 `bundler`，无需迁移；避开已弃用的 `node/classic` |
| 互操作开关 | `esModuleInterop: true` | web 现已是 `true`；TS6 中设为 `false` 已被禁止，保持 true 即可 |
| 严格模式与跳过库检查 | `strict` + `skipLibCheck` | web 现已开启；保持，减少第三方 d.ts 噪音 |
| 类型显式枚举 | `types` 显式列出 | web 已显式枚举；TS6 `types` 默认 `[]`，切忌依赖自动枚举全部 `@types` |
| target/lib 基准 | ES2022 | web 现 ES2020，试点评估上调到 ES2022 的浏览器兼容接受度（见 §5 拍板项） |

### 3.3 不能直接照搬的差异

| 维度 | 根后端 | web 前端 | 差异影响 |
| --- | --- | --- | --- |
| 运行时 / 测试 | Bun runtime + `bun test`，`bun-types` 全局类型 | Vite + esbuild + Vitest + jsdom，`vite/client` + `vitest/globals` + `jest-dom` | 根后端通过 TS6 **不能证明** web 的 Vite/esbuild/Vitest/jsdom 链路兼容 |
| React 形态 | ink 终端视图（react-reconciler 自研渲染），React 19.2.4 | 浏览器 DOM 构建，react-dom 19.3.0 + antd 5 + 浏览器组件库 | 根后端 React 版本/类型表现**不等同**浏览器构建结论；antd、xyflow、echarts、testing-library 的兼容须在 web 侧独立取证 |
| 类型垫片 | `types: ["bun-types"]` | `types: ["vite/client","vitest/globals","@testing-library/jest-dom"]`，且配置文件用到 `process.env`（`vite.config.ts`、`playwright.config.ts`） | 不可直接套用 `bun-types`；web 试点需评估是否在 `types` 补 `"node"`（见 §4） |
| 产物目标 | 服务端 / 终端脚本 | 浏览器 evergreen，`build.target es2020`，CSS/分包/SPA 路由 | target/lib 上调须评估浏览器覆盖；Vite 分包、HMR、jsdom 环境为 web 独有 |
| 工具链维护状态 | 根 TS6 + tseslint 8.71 为新基线 | web 仍 Vite 5.4 / Vitest 2.1（均 EOL） | 根后端新基线不代表 web 工具链可平迁 TS6 |

---

## 4. 升级到 TS 6 的预估动作清单（仅在独立试点分支执行）

### 4.1 tsconfig / 类型垫片调整

1. 升级 `typescript` 到 `~6.0.2`；tsconfig 增加 `"ignoreDeprecations": "6.0"`（过渡期开关）。
2. 评估 `target` / `lib`：由 `ES2020` 上调到 `ES2022`（或保持 ES2020 先取证）；确认无 ES5 目标、无 `downlevelIteration`（现状均未使用）。
3. **`types` 数组复核**：现状未列 `"node"`，而 `vite.config.ts` / `playwright.config.ts` 使用 `process.env`。TS6 `types` 默认 `[]` 且显式数组不再自动枚举 `@types/node`；试点确认 `process` 全局是否解析，必要时补 `"node"`。
4. 复核 `src/vite-env.d.ts` 的 `vite/client` 引用与 `ImportMetaEnv` 补充在 TS6 下生效；`import.meta.env` 用法保持。
5. 评估默认值翻转带来的新报错：`noUncheckedSideEffectImports` 默认 `true`（副作用导入拼写/缺失报错）、`rootDir` 默认 `.`（本仓 `noEmit`，影响有限，但须确认）、`types` 默认 `[]`。

### 4.2 依赖版本对齐（试点分支内）

6. `typescript-eslint` 对齐到 ≥8.71（根后端 8.71.2 同基线），确认 parser 无 unsupported TS 告警；ESLint 9.39 保持。
7. 保持 `@types/react` / `@types/react-dom` 在 19.3.x；复核 `@types/node 22.20.3`、`@types/lodash-es 4.17.12` 与 TS6 类型加载。
8. 工具链大版本评估（**非单纯 TS 升级，需拍板**）：
   - Vite 5.4 EOL → 评估 Vite 6.4+ / 8.x 迁移路径；
   - Vitest 2.1 EOL → 评估 Vitest 4.1 / 5.x，连带 jsdom / coverage-v8 / ui 版本对齐；
   - @xyflow/react 12 → 评估 13.x；antd v5 EOM → 中长期评估 v6（icons 同步升 6）；echarts 5.6 → 评估 6.x 生态版本。

### 4.3 类型报错面预期与取证

9. 已只读扫描现状源码：**未发现**旧版 `module Foo { }` 命名空间块、`import ... asserts { ... }` 导入断言、`/// <reference no-default-lib="true" />` 指令；`moduleResolution` 已是 `bundler`；`esModuleInterop` 为 `true`。TS6 硬性弃用语法在本仓历史包袱小。
10. 预期报错来源优先级：① antd 组件 d.ts；② echarts / xyflow 自带泛型类型；③ Vitest 2.1 全局/工具类型；④ testing-library 类型；⑤ 副作用导入 / 未使用变量等严格门禁触发项。
11. 处置策略：类型垫片 → 依赖升级 → 源码显式类型修正；不通过下调 `strict`、不通过全局放宽门禁来消除报错。

### 4.4 试点取证流水线（独立分支）

12. 从 `consult-agent-m86` 切试点分支（如 `chore/web-ts6-pilot`），先记录 TS 5.6.3 基线：`typecheck`、`vitest run`、`vite build` 结果与既有台账对比。
13. 分支内仅改 web 依赖/配置，依次跑：`tsc --noEmit` → `eslint .` → `vitest run` → `vite build`（必要时 `build:analyze`）；留存日志与报错分类（来源包 / 错误码 / 处置方式）。
14. 覆盖率门槛（行 80 / 分支 70 / 函数 80 / 语句 80）不得因试点下降；e2e（Playwright）按既有流程回归。
15. 准出评审：全部门禁绿、无未处置类型缺口后，再决定是否合入；未达标则废弃试点分支，主干保持 TS 5.6.3。

---

## 5. 风险点与阻断项

| # | 风险 / 阻断项 | 级别 | 说明 |
| --- | --- | --- | --- |
| R1 | **antd 5.29.3 类型在 TS6 下未验证，且 v5 已进入维护尾声** | 高 | antd 未发布 TS6 兼容声明；v5 常规维护 2026 年底结束，若 d.ts 报错，v5 侧补丁预期有限。属潜在阻断项，须试点首个取证。 |
| R2 | **Vite 5.4 与 Vitest 2.1 均已 EOL** | 高 | 两者官方支持矩阵均已不含 5.x/2.x；TS6 暴露的问题不会回补。若试点卡在工具链类型/转译层，将被迫连带升级工具链大版本，升级范围与回归成本扩大。 |
| R3 | **echarts 5.6 / @xyflow 12 自带 d.ts 未在 TS6 验证** | 中 | 自带类型基于较早 TS 编写，strict 与新推断/类型排序下可能报错；上游已有 echarts 6、xyflow 13 可供评估。 |
| R4 | **TS6 默认值翻转引入新门禁报错** | 中 | `types=[]`、`noUncheckedSideEffectImports=true`、`rootDir=.` 等默认变更，可能在未改业务逻辑的情况下产生新报错；需逐条甄别处置。 |
| R5 | **`types` 缺 `"node"` 导致配置文件 `process` 解析失败** | 中 | `vite.config.ts` / `playwright.config.ts` 使用 `process.env`；TS6 不再自动枚举 `@types/node` 全局，试点须显式补齐或改用类型安全写法。 |
| R6 | **`ignoreDeprecations: "6.0"` 仅为 6.0 过渡开关** | 中 | TS 7.0 将移除全部 6.0 弃用项；不能把该开关当作长期方案，试点期间须登记待清理项。 |
| R7 | **双工具链隔离风险** | 低-中 | web 独立锁文件（`bun.lock` / `package-lock.json`）与独立 vitest；试点升级不得污染根后端 TS6 既有运行，也不得回写主干 TS5.6.3 构建。 |
| R8 | **类型定义版本回退风险** | 低 | 若锁文件解析出旧版 `@types/react 19.0.x`，其未经 TS6 校验；须锁定 19.3.x。 |

---

## 6. 建议路径与需要拍板项

### 6.1 建议路径（分步，主干零扰动）

1. **阶段 A — 只读评估（本次已完成）**：产出本矩阵，明确缺口与未知项。
2. **阶段 B — 独立分支试点**：切 `chore/web-ts6-pilot`，在分支内升级 TS 6.0.2 + tseslint 对齐 + tsconfig 过渡配置，跑通 `typecheck + lint + vitest + build` 取证；主干 `consult-agent-m86` 继续保持 TS 5.6.3 既有构建。
3. **阶段 C — 评审决策**：依据试点日志判定：① 直接合入 TS6；② 先连带升级 Vite/Vitest 等工具链大版本后再合入；③ 暂缓，web 留在 TS5.6.3 等待 antd/vitest 生态就绪。
4. **阶段 D — 合入与清理**：准出后合入主干，登记 7.0 前须清理的弃用项；回归覆盖率与 e2e。

### 6.2 试点必须先满足的前置条件

- 试点分支从 `consult-agent-m86` 干净切出，基线门禁（typecheck/vitest/build）在 TS 5.6.3 下复测留存。
- 分支内改动仅限 `web/` 依赖与配置；根后端与主干既有构建不被触碰。
- 取证覆盖：`tsc --noEmit`、`eslint .`、`vitest run`（含覆盖率门槛）、`vite build`、Playwright e2e 回归。
- 所有第三方类型报错按来源包归类留痕；不得通过下调 strict / 关闭门禁绕过。

### 6.3 需要拍板项

| # | 拍板项 | 选项 | 影响 |
| --- | --- | --- | --- |
| D1 | 是否接受在 TS6 试点中**连带升级工具链大版本**（Vite 5→6.4+/8.x、Vitest 2.1→4.1/5.x） | A. 试点先守旧工具链取证，失败再议；B. 试点直接连带升级工具链 | 决定升级范围、回归成本与周期；选 B 需另出工具链迁移评估 |
| D2 | antd 路线：短期维持 v5 取证，还是借 TS6 试点**同步规划 v6 迁移** | A. 维持 v5；B. 规划 v6（icons 同步升 6，组件 API/样式回归） | v5 EOM 时间窗与 TS6 类型风险叠加，需明确中期方向 |
| D3 | `target`/`lib` 是否由 ES2020 上调到 **ES2022** | A. 保持 ES2020；B. 上调 ES2022 | 影响浏览器兼容面与可用 API 类型；需结合目标浏览器矩阵确认 |
| D4 | 试点准出标准 | 建议：typecheck exit 0、lint 无新增 error、vitest 全绿且覆盖率不降、build 成功、e2e 回归通过 | 需评审确认门槛是否接受 `warn` 项保留与例外清单 |
| D5 | tseslint 是否与根后端锁定**同一 8.x 版本基线**（8.71.2） | A. 对齐同基线；B. web 独立选取最新 8.x | 影响双仓 lint 一致性与后续升级节奏 |
| D6 | echarts / xyflow 是否借试点评估大版本升级（echarts 6、xyflow 13） | A. 维持现版本取证；B. 评估大版本 | 影响图表/画布 API 回归工作量 |

---

## 7. 联网来源清单

1. TypeScript 6.0 发布说明（弃用项、默认值翻转、`ignoreDeprecations`、types/rootDir 行为）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
2. typescript-eslint 官方依赖版本矩阵（TypeScript `>=4.8.4 <6.1.0`、ESLint `^8.57 || ^9 || ^10`）：https://typescript-eslint.io/users/dependency-versions/
3. @typescript-eslint/parser 版本支持告警机制（`onUnsupportedTypeScriptVersion`）：https://typescript-eslint.io/packages/parser/
4. Vite 5 Features（esbuild 转译、target/useDefineForClassFields 行为）：https://v5.vite.dev/guide/features
5. Vite 官方支持版本页（Vite 5 not supported；当前 6.4/7.3/8.1/8.2/8.3 受支持）：https://vite.dev/releases
6. Vitest 官方发布/支持版本页（2.x 不再支持；当前 4.1/5.0/5.1；类型定义随 TS 版本调整说明）：https://vitest.dev/releases.html
7. @types/react npm 版本页（19.3.0 挂 `ts6.0` dist-tag）：https://www.npmjs.com/package/@types/react?activeTab=versions
8. @types/react-is npm 版本页（19.3.0 `ts6.0` 标签旁证）：https://www.npmjs.com/package/@types/react-is?activeTab=versions
9. React 19 升级指南（配套 @types/react 19）：https://19.react.dev/blog/2024/04/25/react-19-upgrade-guide
10. Ant Design React 19 兼容说明（v5-patch-for-react-19）：https://5x-ant-design.antgroup.com/docs/react/v5-for-19
11. @ant-design/v5-patch-for-react-19 npm（peer 区间）：https://www.npmjs.com/package/@ant-design/v5-patch-for-react-19
12. Ant Design v5 维护结束公告（2026 年底常规维护结束，转向 v6）：https://ant.design/docs/blog/v5-ood/
13. Ant Design 更新日志（TypeScript 类型修复条目，未见 TS6 适配声明）：https://ant.design/changelog-cn
14. Testing Library React 介绍（自带类型、peer @types/react）：https://testing-library.com/docs/react-testing-library/intro/
15. ECharts 包内 d.ts 说明（最低 TS 版本判定 MIN_VERSION）：https://apache.googlesource.com/echarts/+/baaeec5cc11a200f6f08f291c5f238009420988c/package.README.md
16. React Flow 官方 TypeScript 用法文档：https://reactflow.dev/learn/advanced-use/typescript
17. @xyflow/react npm（上游 13.0.2，peer @types/react >=17）：https://www.npmjs.com/package/@xyflow/react
18. Tailwind CSS 3.4 配置文档（TypeScript 配置与类型注解）：https://v3.tailwindcss.com/docs/configuration
19. @vitejs/plugin-react npm（peer vite 范围）：https://www.npmjs.com/package/@vitejs/plugin-react

---

## 8. 核心结论（回报摘要）

1. **tseslint 链路已在 TS6 支持窗口内**：typescript-eslint 官方区间 `>=4.8.4 <6.1.0` 覆盖 6.0.2；根后端 8.71.2 已验证运行。web 试点把 8.70.0 对齐到 ≥8.71 即可，ESLint 9.39 不受阻。
2. **React 19 类型侧基本就绪**：DT `@types/react` / `@types/react-dom` 19.3.0 已带 `ts6.0` 标签；运行时 React 19.3.0 与编译器无耦合。前提是保持 19.3.x，不回退旧类型。
3. **主要缺口集中在 EOL 工具链与未验证的自带 d.ts**：Vite 5.4、Vitest 2.1 均已不在官方支持矩阵；antd 5.29.3、echarts 5.6、@xyflow 12.11.6、testing-library 16.3.3 均**未查到官方 TS6 明确兼容声明**，须独立分支取证。
4. **历史语法包袱小，但默认值翻转是新风险**：现状未发现 TS6 硬性弃用语法（旧 module 块 / import asserts / no-default-lib）；但 `types=[]`、`noUncheckedSideEffectImports=true`、配置文件 `process` 全局缺失等默认变更可能引入新报错，需试点逐条处置。
5. **建议路径**：主干保持 TS 5.6.3 不动；先切独立试点分支拉 TS 6.0.2，跑通 typecheck + lint + vitest + build + e2e 取证，再依据缺口决定直接合入、连带升级工具链，还是暂缓。是否连带升级 Vite/Vitest/antd 大版本为首要拍板项。
