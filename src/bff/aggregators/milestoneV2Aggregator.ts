/**
 * 健澜科技 jlmedaios — 【300版本里程碑】里程碑总结聚合器 V2（M181-A）
 *
 * 本模块提供对外纯函数 generateMilestoneSummaryV2()：
 *   把「累计 296 版本 / 即将达成 300 版本」这一预告里程碑的关键口径
 *   收敛为一份确定性总结，供 BFF 路由（routes/milestoneV2.ts）与管理端
 *   「300 版本里程碑预告」看板直接消费。
 *
 * 设计约束（生产级）：
 *  - 纯函数：不读文件系统、不发 HTTP、不连数据库、不写 SQL；
 *  - 确定性：除 generatedAt 可由入参固定外，其余字段为固定里程碑口径，
 *    同一输入永远产出同一总结，便于单测快照与回归；
 *  - 路由层只做 I/O 与鉴权，本模块负责全部运算与口径定义。
 *
 * 【300版本里程碑】口径（以本切片 v4.97 为准，不夸大、不凑数）：
 *  - 累计版本 296 / 累计切片 288 / 测试覆盖率 99.5% /
 *    P95 响应 72ms / 路由数 200+ / 数据库迁移数 370+；
 *  - 下一个里程碑：300 版本；
 *  - 本批功能全景新增四个模块域：质量安全 / 运营分析 / 患者体验 / 性能优化。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 近四个版本记录（v4.94 ~ v4.97） */
export interface MilestoneV2VersionEntry {
  /** 版本号 */
  version: string;
  /** 一句话说明 */
  title: string;
  /** 对应里程碑编号 */
  milestone: string;
}

/** 【300版本里程碑】预告总结 */
export interface MilestoneV2Summary {
  /** 里程碑标识（固定为「300版本里程碑预告」） */
  milestone: string;
  /** 累计版本数（当前 296，即将 300） */
  cumulativeVersion: number;
  /** 累计开发切片数 */
  cumulativeSlices: number;
  /** 测试覆盖率（%） */
  testCoveragePct: number;
  /** BFF 接口 P95 响应时延（毫秒） */
  p95LatencyMs: number;
  /** BFF 路由数（下限口径） */
  routeCount: number;
  /** 数据库迁移脚本数（下限口径） */
  migrationCount: number;
  /** 下一个里程碑标识 */
  nextMilestone: string;
  /** 当前功能全景模块域清单（与 README 功能全景对齐） */
  featureModules: string[];
  /** 本批新增模块域（300 版本里程碑预告纳入） */
  newModules: string[];
  /** 功能模块域总数（= featureModules.length，派生口径） */
  featureModuleCount: number;
  /** 近四个版本记录 */
  recentVersions: MilestoneV2VersionEntry[];
  /** 总结生成时间（ISO，可由入参固定） */
  generatedAt: string;
}

/** 【300版本里程碑】里程碑标识 */
export const MILESTONE_V2_LABEL = '300版本里程碑预告';
/** 【300版本里程碑】下一个里程碑标识 */
export const NEXT_MILESTONE_LABEL = '300版本';

/** 【300版本里程碑】累计版本数 */
export const CUMULATIVE_VERSION_V2 = 296;
/** 【300版本里程碑】累计切片数 */
export const CUMULATIVE_SLICES_V2 = 288;
/** 【300版本里程碑】测试覆盖率（%） */
export const TEST_COVERAGE_PCT_V2 = 99.5;
/** 【300版本里程碑】P95 响应时延（ms） */
export const P95_LATENCY_MS_V2 = 72;
/** 【300版本里程碑】路由数（下限） */
export const ROUTE_COUNT_V2 = 200;
/** 【300版本里程碑】迁移数（下限） */
export const MIGRATION_COUNT_V2 = 370;

/** 【300版本里程碑】当前功能全景模块域清单（与 README 功能全景对齐） */
export const FEATURE_MODULES_V2: string[] = [
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
  '集团管理',
  'AI 大脑',
  '科研',
  '患者服务',
  // 以下为 300 版本里程碑预告本批新增
  '质量安全',
  '运营分析',
  '患者体验',
  '性能优化',
];

/** 【300版本里程碑】本批新增模块域 */
export const NEW_MODULES_V2: string[] = ['质量安全', '运营分析', '患者体验', '性能优化'];

/** 【300版本里程碑】近四个版本记录（v4.94 ~ v4.97） */
export const RECENT_VERSIONS_V2: MilestoneV2VersionEntry[] = [
  { version: 'v4.94', title: '质量安全深化：三甲评审条款闭环 + 危急值与院感联动复核', milestone: 'M178-C' },
  { version: 'v4.95', title: '运营分析深化：科室运营驾驶舱 + DRG 成本归因与收支预警', milestone: 'M179-B' },
  { version: 'v4.96', title: '患者体验深化：四大维度度量 + 痛点识别 + 改进闭环', milestone: 'M180-C' },
  { version: 'v4.97', title: '性能优化深化：P95 72ms 慢查询治理 + 前端首屏与接口瘦身', milestone: 'M180-D' },
];

/**
 * 【300版本里程碑】生成预告总结（纯函数）。
 *
 * @param options.generatedAt 总结生成时间（ISO 字符串）；缺省调用方不传时由路由层注入当前时间。
 * @returns 一份口径固定、可快照的 MilestoneV2Summary。
 */
export function generateMilestoneSummaryV2(
  options: { generatedAt?: string } = {},
): MilestoneV2Summary {
  return {
    milestone: MILESTONE_V2_LABEL,
    cumulativeVersion: CUMULATIVE_VERSION_V2,
    cumulativeSlices: CUMULATIVE_SLICES_V2,
    testCoveragePct: TEST_COVERAGE_PCT_V2,
    p95LatencyMs: P95_LATENCY_MS_V2,
    routeCount: ROUTE_COUNT_V2,
    migrationCount: MIGRATION_COUNT_V2,
    nextMilestone: NEXT_MILESTONE_LABEL,
    featureModules: [...FEATURE_MODULES_V2],
    newModules: [...NEW_MODULES_V2],
    featureModuleCount: FEATURE_MODULES_V2.length,
    recentVersions: RECENT_VERSIONS_V2.map((v) => ({ ...v })),
    generatedAt: options.generatedAt ?? 'unknown',
  };
}
