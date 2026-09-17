# 健澜科技数智医院智能体 - 前端性能优化指南

> Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.

## 1. 性能指标与预算

| 指标 | 目标值 | 说明 |
|------|--------|------|
| LCP（最大内容绘制） | ≤ 2.5s | 首屏核心内容可交互 |
| FID（首次输入延迟） | ≤ 100ms | 交互响应 |
| CLS（累积布局偏移） | ≤ 0.1 | 视觉稳定性 |
| TTFB（首字节时间） | ≤ 600ms | 服务器响应 |
| FCP（首次内容绘制） | ≤ 1.8s | 白屏时间 |
| 首屏 JS Bundle | ≤ 500KB (gzip) | 主包大小预算 |
| 单路由按需加载 | ≤ 200KB (gzip) | 路由级分包 |

## 2. 代码分割与懒加载

### 路由级代码分割
所有业务页面均使用 `React.lazy + Suspense` 懒加载，已在 `src/router/index.tsx` 中实现：
```tsx
const Dashboard = lazy(() => import('@/pages/dashboard'));
const PatientList = lazy(() => import('@/pages/patients'));
```

### 组件级懒加载
- ECharts 图表组件（`src/components/charts/`）按需引入
- 富文本编辑器、大表格等重组件动态 import
- AntD 组件按需引入（Vite tree-shaking 已自动处理）

### 第三方库按需加载
- ECharts：`import * as echarts from 'echarts/core'` + 按需注册图表
- lodash-es：ES Module 自动 tree-shaking
- dayjs：按需引入 locale 和插件

## 3. 构建优化（vite.config.ts）

| 配置项 | 值 | 说明 |
|--------|-----|------|
| target | es2020 | 现代浏览器目标 |
| sourcemap | hidden（生产） | 不上传 CDN，仅用于错误监控堆栈还原 |
| cssCodeSplit | true | CSS 按路由分割 |
| manualChunks | react/antd/echarts/utils | 手动分包，利用浏览器缓存 |
| chunkSizeWarningLimit | 1500KB | 体积告警阈值 |

### 构建分析
```bash
ANALYZE=true npm run build   # 生成 dist/stats.html 体积分析报告
```

## 4. 运行时优化

### 虚拟列表
- 患者列表、消息列表、日志列表使用 `useVirtualList`（`src/utils/performance.ts`）
- 容器高度 + 固定行高计算可视区域，overscan=5 缓冲

### 渲染优化
- 纯展示组件使用 `React.memo`
- 复杂计算使用 `useMemo`
- 回调函数使用 `useCallback`
- 搜索输入防抖（`useDebounce`，300ms）
- 滚动事件节流（`useThrottle`，300ms）

### 资源优化
- 图片使用 WebP 格式 + `loading="lazy"`
- 字体 `font-display: swap` 避免 FOIT
- 关键字体预加载

### 内存泄漏防护
- useEffect 清理定时器 / 事件监听 / WebSocket 订阅
- `useChatStream` / `useAlert` 在卸载时取消订阅

## 5. 性能监控

### Web Vitals 采集
`src/utils/performance.ts` 的 `reportWebVitals` 采集 LCP / FID / CLS，通过 `src/monitoring/index.ts` 上报。

### 自定义指标
- 页面加载时间、API 响应时间、组件渲染时间
- 通过 `monitoring.track('performance', { metric, value })` 上报

### 性能预算 CI 检查
- Bundle 大小超限导致 build warning
- Lighthouse CI（可选）核心页面 LCP / CLS 检查
