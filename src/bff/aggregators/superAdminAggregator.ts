/**
 * 健澜科技 jlmedaios - 超管后台「医院管理驾驶舱」聚合器（M133-B）
 *
 * 【SaaS化+智慧度】本聚合器服务于平台超级管理员视角：
 *  - SaaS 化：把每一家接入医院视为一个独立租户实例，统一纳管其启停、院区规模、
 *    用户量与配置；超管不接触单院业务 PII，只看平台侧运营指标。
 *  - 智慧度：每家医院输出 0-100 的「智慧度评分」（AI 覆盖/采纳、电子病历评级、
 *    床位运营健康度综合），用于横向对比各医院的智能化落地水位。
 *
 * buildHospitalAdminDashboard 为纯函数：仅依据入参计算医院列表视图，
 * 不读 DB、不发请求、不取当前时间，同一输入恒等输出，便于单测与重放。
 * 空数据 / 缺字段一律安全兜底为 0，绝不产生 NaN / Infinity。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型定义                                                              */
/* ------------------------------------------------------------------ */

/** 医院健康度：healthy 正常 / warning 预警 / critical 严重 */
export type HospitalHealth = 'healthy' | 'warning' | 'critical';

/**
 * 单家医院的平台侧原始指标（全部业务量字段可选，缺省按 0 兜底）。
 * 字段命名对齐 tenantService 节点 + 平台运营上报口径，聚合层不做隐式换算。
 */
export interface SuperAdminHospitalRaw {
  /** 医院租户 id（形如 hospital_xxx） */
  id: string;
  /** 医院名称 */
  name: string;
  /** 是否启用（停用后立即拒绝解析访问） */
  enabled: boolean;
  /** 下辖院区数量 */
  campusCount?: number;
  /** 注册用户数（医护+行政） */
  userCount?: number;
  /** 今日活跃用户数 */
  activeUsersToday?: number;
  /** 智慧度评分 0-100（AI 辅助覆盖与采纳率） */
  wisdomScore?: number;
  /** 电子病历应用水平评级 0-5 */
  emrLevel?: number;
  /** 实际开放床位数 */
  bedTotal?: number;
  /** 已占用床位数 */
  bedOccupied?: number;
  /** 最近活跃时间 ISO8601 */
  lastActiveAt?: string;
  /** 医院级键值配置（功能开关/业务参数，禁存密钥） */
  config?: Record<string, unknown>;
  /** 创建时间 ISO8601 */
  createdAt?: string;
}

/** 单家医院在超管视图中的归一化卡片 */
export interface HospitalItem {
  id: string;
  name: string;
  enabled: boolean;
  campusCount: number;
  userCount: number;
  activeUsersToday: number;
  /** 智慧度评分 0-100 */
  wisdomScore: number;
  /** 电子病历评级 0-5 */
  emrLevel: number;
  /** 床位使用率 %（bedOccupied/bedTotal*100，分母 0 为 0） */
  bedUsageRate: number;
  health: HospitalHealth;
  /** 触发预警/严重的原因列表（前端红色/黄色标签展示） */
  healthReasons: string[];
  lastActiveAt?: string;
  config: Record<string, unknown>;
  createdAt?: string;
}

/** buildHospitalAdminDashboard 输出（纯、无时间戳） */
export interface HospitalList {
  /** 医院总数 */
  total: number;
  /** 启用中医院数 */
  enabledCount: number;
  /** 已停用医院数 */
  disabledCount: number;
  /** 全部医院平均智慧度 0-100（保留 1 位小数） */
  avgWisdomScore: number;
  /** 医院卡片列表（按智慧度降序，同分时按 id 升序，保证稳定） */
  items: HospitalItem[];
}

/* ------------------------------------------------------------------ */
/* 纯函数工具                                                            */
/* ------------------------------------------------------------------ */

/** 取数兜底：非有限数按 0 处理 */
function num(v: number | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** 百分制裁剪：约束到 [0,100] */
function clampScore(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** 整数裁剪：约束到 [0,5]（电子病历评级） */
function clampLevel(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(5, Math.round(v)));
}

/** 床位使用率 %；分母为 0 / 非正数时返回 0，避免 NaN / Infinity */
function bedRate(occupied: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((occupied / total) * 1000) / 10;
}

/**
 * 由单家医院原始指标计算健康度与原因。
 * 【SaaS化+智慧度】健康度综合考虑：停用(critical)、智慧度不足、
 * 电子病历评级偏低、零活跃、床位过紧/过闲。
 */
function assessHealth(raw: SuperAdminHospitalRaw, rate: number): {
  health: HospitalHealth;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!raw.enabled) {
    return { health: 'critical', reasons: ['医院已停用，立即拒绝解析访问'] };
  }
  const wisdom = num(raw.wisdomScore);
  const emr = num(raw.emrLevel);
  const active = num(raw.activeUsersToday);

  if (wisdom < 60) reasons.push(`智慧度偏低（${wisdom} 分 < 60），AI 覆盖待提升`);
  if (emr < 3) reasons.push(`电子病历评级不足（EMR L${emr} < L3）`);
  if (active === 0) reasons.push('今日零活跃，疑似离线');
  if (rate > 95) reasons.push(`床位使用率 ${rate}% 过度紧张`);
  else if (rate > 0 && rate < 20) reasons.push(`床位使用率 ${rate}% 资源闲置`);

  // critical 仅由停用触发；任一原因即 warning；否则 healthy
  return {
    health: reasons.length > 0 ? 'warning' : 'healthy',
    reasons,
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数主入口                                                          */
/* ------------------------------------------------------------------ */

/**
 * 超管医院管理驾驶舱纯函数聚合：
 *  1. 归一化每家医院的运营指标（智慧度/EMR/床位使用率）；
 *  2. 综合判定健康度并给出原因；
 *  3. 汇总启用/停用数量与平均智慧度；
 *  4. 按智慧度降序输出稳定列表。
 *
 * 幂等：同一 raw 数组恒等输出（无随机、无当前时间），便于单测与重放。
 *
 * @param raws 各医院平台侧指标（空数组返回空列表）
 * @returns HospitalList 汇总 + 归一化医院卡片
 */
export function buildHospitalAdminDashboard(
  raws: SuperAdminHospitalRaw[] = [],
): HospitalList {
  const safe = Array.isArray(raws) ? raws : [];

  const items: HospitalItem[] = safe.map((raw) => {
    const campusCount = num(raw.campusCount);
    const userCount = num(raw.userCount);
    const activeUsersToday = num(raw.activeUsersToday);
    const wisdomScore = clampScore(num(raw.wisdomScore));
    const emrLevel = clampLevel(num(raw.emrLevel));
    const bedTotal = num(raw.bedTotal);
    const bedOccupied = num(raw.bedOccupied);
    const rate = bedRate(bedOccupied, bedTotal);
    const { health, reasons } = assessHealth(raw, rate);

    return {
      id: raw.id,
      name: raw.name,
      enabled: raw.enabled !== false,
      campusCount,
      userCount,
      activeUsersToday,
      wisdomScore,
      emrLevel,
      bedUsageRate: rate,
      health,
      healthReasons: reasons,
      ...(raw.lastActiveAt ? { lastActiveAt: raw.lastActiveAt } : {}),
      config: raw.config ?? {},
      ...(raw.createdAt ? { createdAt: raw.createdAt } : {}),
    };
  });

  // 稳定排序：智慧度降序，同分时按 id 升序
  items.sort((a, b) => {
    if (b.wisdomScore !== a.wisdomScore) return b.wisdomScore - a.wisdomScore;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const enabledItems = items.filter((i) => i.enabled);
  const total = items.length;
  const enabledCount = enabledItems.length;
  const wisdomSum = items.reduce((acc, i) => acc + i.wisdomScore, 0);
  const avgWisdomScore =
    total === 0 ? 0 : Math.round((wisdomSum / total) * 10) / 10;

  return {
    total,
    enabledCount,
    disabledCount: total - enabledCount,
    avgWisdomScore,
    items,
  };
}
