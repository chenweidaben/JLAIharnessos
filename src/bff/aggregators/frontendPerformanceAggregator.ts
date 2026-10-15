/**
 * 健澜科技 jlmedaios - 前端性能分析聚合器（M145-B）
 *
 * 【前端性能优化】面向管理后台 SPA 的「打包体积 + 路由懒加载 + 首屏骨架屏」
 * 纯函数分析层。本层不读时钟、不访问 IO、不修改入参，全部可确定性单测。
 *
 * 分层：
 *  - analyzeBundleSize(bundleStats): Analysis —— 读 Vite/Rollup 产物 chunk 清单，
 *    计算首屏入口体积、vendor 占比、超预算 chunk 清单、健康分与改进建议；
 *  - generateLazyLoadingReport(routes): Report —— 读前端路由声明快照，
 *    统计懒加载覆盖率、识别仍为静态 import 的路由、首屏缺骨架屏的路由；
 *  - DEFAULT_BUNDLE_STATS / DEFAULT_ROUTE_NODES —— 当前前端产物 / 路由的
 *    声明式快照（与 web/src 实际路由人工对齐维护），供 admin 路由直接出报告。
 *
 * 优化方向对齐：路由懒加载 / 组件按需 / 首屏骨架屏 / 打包体积分析。
 *
 * 生产安全加固：
 *  - 所有纯函数对「非数组 / 负数 / NaN / 缺字段」脏数据防御，返回归一化结果而非抛错；
 *  - 体积预算以 gzip 后字节为口径（用户真实下载量），缺 gzip 时保守回落 raw；
 *  - 健康分钳制在 0..100，分级 A/B/C/D，便于 admin 面板红灯化；
 *  - 【生产化收尾】不引入任何新依赖，不读写文件 / 网络，结果只经 BFF 路由下发。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 打包体积分析                                                        */
/* ------------------------------------------------------------------ */

/** 单个 chunk 产物（Vite/Rollup 输出摘要） */
export interface BundleChunk {
  /** chunk 产物文件名，如 index-D8f2a.js */
  name: string;
  /** 原始字节数（未压缩） */
  size: number;
  /** gzip 后字节数（可选；缺省时保守按 raw 计） */
  gzip?: number;
  /** 是否入口 chunk（首屏关键路径） */
  isEntry?: boolean;
  /** 是否第三方 vendor chunk（node_modules） */
  isVendor?: boolean;
}

/** 打包产物统计输入 */
export interface BundleStats {
  chunks: BundleChunk[];
  /** 构建产物生成时间戳（epoch ms，可选） */
  generatedAt?: number;
}

/** 体积预算（字节）——【生产化收尾】与 Web 性能预算门禁对齐 */
export const BUNDLE_BUDGETS = {
  /** 入口 chunk gzip 预算：80 KB（首屏可接受上限） */
  ENTRY_GZIP_BYTES: 80 * 1024,
  /** 单个懒加载 chunk gzip 预算：220 KB */
  LAZY_GZIP_BYTES: 220 * 1024,
  /** 单 chunk raw 软告警线：600 KB（无论是否懒加载） */
  CHUNK_RAW_WARN_BYTES: 600 * 1024,
} as const;

/** 超预算 chunk 行 */
export interface OverBudgetChunk {
  name: string;
  /** raw 字节 */
  rawBytes: number;
  /** gzip 字节 */
  gzipBytes: number;
  /** 命中的预算阈值（字节） */
  budgetBytes: number;
  /** 入口 / 懒加载 */
  kind: 'entry' | 'lazy';
}

/** analyzeBundleSize 返回体 */
export interface BundleAnalysis {
  chunkCount: number;
  totalRawBytes: number;
  totalGzipBytes: number;
  /** 入口 chunk（首屏）累计 raw 字节 */
  entryRawBytes: number;
  /** 入口 chunk（首屏）累计 gzip 字节 */
  entryGzipBytes: number;
  /** vendor chunk 累计 raw 字节 */
  vendorRawBytes: number;
  /** 超预算 chunk 清单（按 gzip 降序） */
  overBudget: OverBudgetChunk[];
  /** 入口是否在预算内 */
  entryWithinBudget: boolean;
  /** 健康分 0..100 */
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  /** 可执行改进建议 */
  recommendations: string[];
}

/** 归一化数值：非有限数 / 负数 → 0 */
function safeNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
}

/** 取 chunk 的 gzip 字节；缺省 / 非法时保守回落 raw（不虚构压缩率） */
function gzipOf(chunk: BundleChunk): number {
  const g = safeNum(chunk?.gzip);
  return g > 0 ? g : safeNum(chunk?.size);
}

/** 字节 → KB（保留 1 位小数），供建议文案可读 */
function kb(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

/** 健康分 → 等级 */
function gradeOf(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/**
 * 纯函数：分析打包体积。
 *
 * 防御：stats/chunks 非数组 → 空分析；单条脏 chunk 按 0 字节跳过名称空项。
 * 评分：基础 100，每个入口超预算 -15、每个懒加载超预算 -8、
 *       存在 raw > 600KB 的 chunk 再 -5，钳制 0..100。
 */
export function analyzeBundleSize(stats: BundleStats): BundleAnalysis {
  const list = Array.isArray(stats?.chunks) ? stats.chunks : [];

  let totalRaw = 0;
  let totalGzip = 0;
  let entryRaw = 0;
  let entryGzip = 0;
  let vendorRaw = 0;
  let hasRawWarn = false;
  const overBudget: OverBudgetChunk[] = [];

  for (const raw of list) {
    const size = safeNum(raw?.size);
    const gzip = gzipOf(raw as BundleChunk);
    const name = typeof raw?.name === 'string' ? raw.name : '';
    const isEntry = raw?.isEntry === true;
    const isVendor = raw?.isVendor === true;

    totalRaw += size;
    totalGzip += gzip;
    if (isEntry) {
      entryRaw += size;
      entryGzip += gzip;
    }
    if (isVendor) vendorRaw += size;
    if (size > BUNDLE_BUDGETS.CHUNK_RAW_WARN_BYTES) hasRawWarn = true;

    // 入口用入口预算，其余（懒加载）用懒加载预算
    const budget = isEntry
      ? BUNDLE_BUDGETS.ENTRY_GZIP_BYTES
      : BUNDLE_BUDGETS.LAZY_GZIP_BYTES;
    if (gzip > budget && name.length > 0) {
      overBudget.push({
        name,
        rawBytes: size,
        gzipBytes: gzip,
        budgetBytes: budget,
        kind: isEntry ? 'entry' : 'lazy',
      });
    }
  }

  // 超预算清单按 gzip 降序
  overBudget.sort((a, b) => b.gzipBytes - a.gzipBytes);

  const entryOver = overBudget.filter((o) => o.kind === 'entry');
  const lazyOver = overBudget.filter((o) => o.kind === 'lazy');

  let score = 100;
  score -= entryOver.length * 15;
  score -= lazyOver.length * 8;
  if (hasRawWarn) score -= 5;
  score = Math.max(0, Math.min(100, score));

  // 改进建议（去重、按优先级）
  const recommendations: string[] = [];
  if (entryOver.length > 0) {
    recommendations.push(
      `入口 chunk gzip ${kb(entryGzip)}KB 超预算 ${kb(BUNDLE_BUDGETS.ENTRY_GZIP_BYTES)}KB：` +
        `将 react/antd 拆为独立 vendor chunk，首屏仅加载核心业务 chunk，路由级 code-split。`,
    );
  }
  for (const o of lazyOver) {
    recommendations.push(
      `懒加载 chunk ${o.name} gzip ${kb(o.gzipBytes)}KB 超预算 ${kb(o.budgetBytes)}KB：` +
        `按子路由二次拆分；echarts/monaco 等重组件改组件级动态 import()。`,
    );
  }
  if (vendorRaw > 600 * 1024) {
    recommendations.push(
      `vendor 累计 raw ${kb(vendorRaw)}KB：排查重复依赖，lodash/moment 改 lodash-es / dayjs 按需引入。`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('打包体积健康：保持路由级 code-split 与 vendor 长效预算门禁即可。');
  }

  return {
    chunkCount: list.length,
    totalRawBytes: totalRaw,
    totalGzipBytes: totalGzip,
    entryRawBytes: entryRaw,
    entryGzipBytes: entryGzip,
    vendorRawBytes: vendorRaw,
    overBudget,
    entryWithinBudget: entryOver.length === 0,
    score,
    grade: gradeOf(score),
    recommendations,
  };
}

/* ------------------------------------------------------------------ */
/* 路由懒加载报告                                                      */
/* ------------------------------------------------------------------ */

/** 前端路由声明快照（与 web/src/router 人工对齐） */
export interface RouteNode {
  /** 路由路径，如 /admin/performance/frontend */
  path: string;
  /** 路由中文名 */
  name: string;
  /** 是否已通过 React.lazy / 动态 import() 按需加载 */
  lazy: boolean;
  /** 首屏关键路由（登录后默认落地 / 高频直达） */
  critical?: boolean;
  /** 首屏关键路由是否已配 Suspense 骨架屏 */
  skeleton?: boolean;
}

/** generateLazyLoadingReport 返回体 */
export interface LazyLoadingReport {
  totalRoutes: number;
  lazyCount: number;
  eagerCount: number;
  /** 懒加载覆盖率 0..1 */
  lazyRatio: number;
  criticalCount: number;
  /** 首屏且已配骨架屏数量 */
  skeletonReady: number;
  /** 仍为静态 import、建议改懒加载的路由 path */
  eagerRoutes: string[];
  /** 首屏关键但缺骨架屏的路由 path */
  missingSkeleton: string[];
  score: number;
  recommendations: string[];
}

/**
 * 纯函数：生成路由懒加载报告。
 *
 * 防御：routes 非数组 → 空报告；path 非字符串跳过。
 * 评分：基础 100，每个待懒加载路由 -8，每个缺骨架屏首屏路由 -6，钳制 0..100。
 */
export function generateLazyLoadingReport(routes: RouteNode[]): LazyLoadingReport {
  const list = Array.isArray(routes) ? routes : [];

  let lazyCount = 0;
  let criticalCount = 0;
  let skeletonReady = 0;
  const eagerRoutes: string[] = [];
  const missingSkeleton: string[] = [];

  for (const r of list) {
    const path = typeof r?.path === 'string' ? r.path : '';
    if (path.length === 0) continue;

    const isLazy = r?.lazy === true;
    const isCritical = r?.critical === true;
    const hasSkeleton = r?.skeleton === true;

    if (isLazy) lazyCount += 1;
    else eagerRoutes.push(path);

    if (isCritical) {
      criticalCount += 1;
      if (hasSkeleton) skeletonReady += 1;
      else missingSkeleton.push(path);
    }
  }

  const totalRoutes = lazyCount + eagerRoutes.length;
  const lazyRatio = totalRoutes > 0
    ? Math.round((lazyCount / totalRoutes) * 10000) / 10000
    : 0;

  let score = 100;
  score -= eagerRoutes.length * 8;
  score -= missingSkeleton.length * 6;
  score = Math.max(0, Math.min(100, score));

  const recommendations: string[] = [];
  if (eagerRoutes.length > 0) {
    recommendations.push(
      `以下 ${eagerRoutes.length} 条路由仍为静态 import：改为 React.lazy + Suspense 按需加载` +
        `（/login、全局布局壳可保持静态）：${eagerRoutes.join('、')}。`,
    );
  }
  if (missingSkeleton.length > 0) {
    recommendations.push(
      `首屏路由缺骨架屏（Suspense fallback），会导致切换白屏：${missingSkeleton.join('、')}。`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('懒加载覆盖率与首屏骨架屏配置达标：建议对图表/编辑器类重组件补组件级按需加载。');
  }

  return {
    totalRoutes,
    lazyCount,
    eagerCount: eagerRoutes.length,
    lazyRatio,
    criticalCount,
    skeletonReady,
    eagerRoutes,
    missingSkeleton,
    score,
    recommendations,
  };
}

/* ------------------------------------------------------------------ */
/* 默认快照（与 web/src 实际产物 / 路由人工对齐维护）                    */
/* ------------------------------------------------------------------ */

/**
 * 当前前端打包产物快照（M145-B 基线）。
 * 【生产化收尾】后续可由 CI 在 build 后注入真实 manifest 覆盖，此处为可运行基线。
 */
export const DEFAULT_BUNDLE_STATS: BundleStats = {
  generatedAt: Date.now(),
  chunks: [
    { name: 'index-D8f2a.js', size: 340 * 1024, gzip: 96 * 1024, isEntry: true },
    { name: 'vendor-react-antd.js', size: 520 * 1024, gzip: 150 * 1024, isVendor: true },
    { name: 'echarts-heavy.js', size: 660 * 1024, gzip: 196 * 1024 },
    { name: 'admin-dashboard.js', size: 180 * 1024, gzip: 54 * 1024 },
    { name: 'patient-portal.js', size: 240 * 1024, gzip: 72 * 1024 },
  ],
};

/** 当前前端路由懒加载配置快照（M145-B 基线） */
export const DEFAULT_ROUTE_NODES: RouteNode[] = [
  { path: '/login', name: '登录', lazy: false, critical: true, skeleton: true },
  { path: '/admin/dashboard', name: '管理驾驶舱', lazy: true, critical: true, skeleton: false },
  { path: '/admin/performance/optimizations', name: '性能优化', lazy: true },
  { path: '/admin/performance/frontend', name: '前端性能', lazy: true, skeleton: true },
  { path: '/admin/infection/alerts', name: '院感告警', lazy: false },
  { path: '/admin/insurance/review', name: '医保审核', lazy: false },
  { path: '/admin/quality/monitor', name: '质量监控', lazy: true },
  { path: '/admin/backup', name: '备份管理', lazy: true },
];
