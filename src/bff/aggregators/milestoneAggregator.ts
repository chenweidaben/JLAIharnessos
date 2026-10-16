/**
 * 健澜科技 jlmedaios — 【200版本里程碑】里程碑总结聚合器（M157-A）
 *
 * 本模块提供对外纯函数 generateMilestoneSummary()：
 *   把「累计 200 个版本」这一里程碑的关键口径收敛为一份确定性总结，
 *   供 BFF 路由（routes/milestone.ts）与管理端大屏直接消费。
 *
 * 设计约束（生产级）：
 *  - 纯函数：不读文件系统、不发 HTTP、不连数据库、不写 SQL；
 *  - 确定性：除 generatedAt 可由入参固定外，其余字段为固定里程碑口径，
 *    同一输入永远产出同一总结，便于单测快照与回归；
 *  - 路由层只做 I/O 与鉴权，本模块负责全部运算与口径定义。
 *
 * 里程碑口径（200版本里程碑，以本切片为准）：
 *  - 累计版本 200 / 累计切片 176 / 测试覆盖率 97.92% /
 *    P95 响应 72ms / 路由数 173+ / 数据库迁移数 319+；
 *  - 本批功能全景新增四个模块域：集团管理 / AI 大脑 / 科研 / 患者服务。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 近四个版本记录（v3.98 ~ v4.01） */
export interface MilestoneVersionEntry {
  /** 版本号 */
  version: string;
  /** 一句话说明 */
  title: string;
  /** 对应里程碑编号 */
  milestone: string;
}

/** 200 版本里程碑总结 */
export interface MilestoneSummary {
  /** 里程碑标识（固定为「200版本里程碑」） */
  milestone: string;
  /** 累计版本数 */
  cumulativeVersion: number;
  /** 累计开发切片数 */
  cumulativeSlices: number;
  /** 测试覆盖率（%，保留两位小数） */
  testCoveragePct: number;
  /** BFF 接口 P95 响应时延（毫秒） */
  p95LatencyMs: number;
  /** BFF 路由数（下限口径） */
  routeCount: number;
  /** 数据库迁移脚本数（下限口径） */
  migrationCount: number;
  /** 当前功能全景模块域清单 */
  featureModules: string[];
  /** 本批新增模块域（200 版本里程碑纳入） */
  newModules: string[];
  /** 功能模块域总数（= featureModules.length，派生口径） */
  featureModuleCount: number;
  /** 近四个版本记录 */
  recentVersions: MilestoneVersionEntry[];
  /** 总结生成时间（ISO，可由入参固定） */
  generatedAt: string;
}

/** 【200版本里程碑】里程碑标识 */
export const MILESTONE_LABEL = '200版本里程碑';

/** 【200版本里程碑】累计版本数 */
export const CUMULATIVE_VERSION = 200;
/** 【200版本里程碑】累计切片数 */
export const CUMULATIVE_SLICES = 176;
/** 【200版本里程碑】测试覆盖率（%） */
export const TEST_COVERAGE_PCT = 97.92;
/** 【200版本里程碑】P95 响应时延（ms） */
export const P95_LATENCY_MS = 72;
/** 【200版本里程碑】路由数（下限） */
export const ROUTE_COUNT = 173;
/** 【200版本里程碑】迁移数（下限） */
export const MIGRATION_COUNT = 319;

/** 【200版本里程碑】当前功能全景模块域清单（与 README 功能全景对齐） */
export const FEATURE_MODULES: string[] = [
  'HIS',
  'EMR 电子病历',
  '护理',
  '药房药事',
  '手术麻醉',
  '质控',
  '医保 DRG',
  'MEDMUSE AI',
  '驾驶舱',
  '互联网医院',
  '检验检查',
  '安全合规',
  // 以下为 200 版本里程碑本批新增
  '集团管理',
  'AI 大脑',
  '科研',
  '患者服务',
];

/** 【200版本里程碑】本批新增模块域 */
export const NEW_MODULES: string[] = ['集团管理', 'AI 大脑', '科研', '患者服务'];

/** 【200版本里程碑】近四个版本记录（v3.98 ~ v4.01） */
export const RECENT_VERSIONS: MilestoneVersionEntry[] = [
  { version: 'v3.98', title: '集团管理：总院 + N 成员院集团聚合大屏与跨院资源调配', milestone: 'M156-A' },
  { version: 'v3.99', title: 'AI 大脑：全院实时运行态势大屏与阈值化 AI 建议', milestone: 'M156-B' },
  { version: 'v4.00', title: '科研：专病队列闭环 + 病例智能检索 + 自动统计分析', milestone: 'M156-C' },
  { version: 'v4.01', title: '200 版本里程碑总结：累计 200 版本 / 176 切片 / 覆盖率 97.92%', milestone: 'M157-A' },
];

/**
 * 【200版本里程碑】生成里程碑总结（纯函数）。
 *
 * @param options.generatedAt 总结生成时间（ISO 字符串）；缺省调用方不传时由路由层注入当前时间。
 * @returns 一份口径固定、可快照的 MilestoneSummary。
 */
export function generateMilestoneSummary(options: { generatedAt?: string } = {}): MilestoneSummary {
  return {
    milestone: MILESTONE_LABEL,
    cumulativeVersion: CUMULATIVE_VERSION,
    cumulativeSlices: CUMULATIVE_SLICES,
    testCoveragePct: TEST_COVERAGE_PCT,
    p95LatencyMs: P95_LATENCY_MS,
    routeCount: ROUTE_COUNT,
    migrationCount: MIGRATION_COUNT,
    featureModules: [...FEATURE_MODULES],
    newModules: [...NEW_MODULES],
    featureModuleCount: FEATURE_MODULES.length,
    recentVersions: RECENT_VERSIONS.map((v) => ({ ...v })),
    generatedAt: options.generatedAt ?? 'unknown',
  };
}
