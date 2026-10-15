/**
 * 健澜科技 jlmedaios — 【集团与科研】医院集团多院管理聚合器（M156-A）
 *
 * 面向医疗集团（总院 + N 家成员医院）的统一管理大屏，把各成员院
 * 按 hospital_id 严格隔离落库的运营指标，在「集团聚合层」横向归并：
 *   · buildGroupDashboard(groupId, input?, nowIso?)：
 *       集团下属医院列表 + 各院核心指标卡（门诊/住院/手术/收入/满意度）
 *       + 集团总量与均分 + 三类资源负载均值 + 集团统一标准清单；
 *   · compareHospitals(groupId, metric, period, metrics?)：
 *       指定指标在成员院之间横向对比（值 / 集团均值 / 偏离度 / 排名）；
 *   · optimizeGroupResource(groupId, resourceType, metrics?, nowIso?)：
 *       专家 / 大型设备 / 床位 的跨院调配建议（高负载院 ↔ 低负载院配对）。
 *
 * 【数据隔离红线】纯函数口径：
 *  - 每个输入快照行都自带 hospital_id；本模块不写库、不做院级业务下钻；
 *  - 跨院对比只把各院「同一周期的聚合指标」横向汇总，不暴露患者级 PII；
 *  - 院与院之间的明细数据永不直接串联，所有跨院视图均由本聚合层产出。
 *
 * 生产安全：空输入一律返回结构完整的零值结果并打 demo 标记，绝不抛异常；
 * 任何非法数值（NaN / 负数 / 分母为 0）均安全收敛为 0。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 五项核心运营指标（集团对比口径） */
export type GroupMetricKey =
  | 'outpatientVolume'
  | 'inpatientVolume'
  | 'surgeryVolume'
  | 'revenue'
  | 'satisfaction';

/** 跨院可调配资源类型 */
export type ResourceType = 'expert' | 'equipment' | 'bed';

/** 周期粒度 */
export type PeriodType = 'day' | 'week' | 'month' | 'quarter';

/** 资源负载率对应的快照字段 */
type LoadKey = 'expertLoad' | 'equipmentLoad' | 'bedOccupancy';

/** 集团成员医院（院籍信息，由 grp.group_hospital_member 装入） */
export interface GroupMember {
  /** 院别隔离主键 */
  hospitalId: string;
  /** 医院名称 */
  hospitalName: string;
  /** 医院等级：三级甲等 / 三级乙等 / 二级甲等 … */
  hospitalLevel?: string;
  /** 所在区域 */
  region?: string;
  /** 成员角色：head 总院 / branch 分院 / member 协作医院 */
  memberRole?: 'head' | 'branch' | 'member' | string;
}

/**
 * 院级核心指标快照（一行 = 某医院某周期）。
 * 每一行都强带 hospital_id —— 院级系统只写自己院的行，本聚合器只读汇总。
 */
export interface HospitalMetricSnapshot {
  /** 数据隔离硬边界：本指标归属的成员医院 */
  hospitalId: string;
  /** 医院名称（冗余展示） */
  hospitalName: string;
  /** 统计周期标签：'2026-10' / '2026Q3' / '2026-10-16' */
  period: string;
  /** 门诊量（人次） */
  outpatientVolume: number;
  /** 住院量（出院人次） */
  inpatientVolume: number;
  /** 手术量（台） */
  surgeryVolume: number;
  /** 业务收入（万元） */
  revenue: number;
  /** 满意度（百分制 0~100） */
  satisfaction: number;
  /** 专家占用率 0~100 */
  expertLoad: number;
  /** 大型设备占用率 0~100 */
  equipmentLoad: number;
  /** 床位占用率 0~100 */
  bedOccupancy: number;
}

/** 集团统一标准（诊疗规范 / 质控标准 / 安全制度） */
export interface GroupStandard {
  /** 标准类别：clinic 诊疗规范 / qc 质控标准 / safety 安全制度 */
  category: 'clinic' | 'qc' | 'safety' | string;
  /** 标准名称 */
  name: string;
  /** 标准编号 */
  standardCode: string;
  /** 版本号 */
  version: string;
  /** 强制级别：mandatory 强制 / recommended 推荐 */
  enforceLevel: 'mandatory' | 'recommended' | string;
}

/** buildGroupDashboard 输入（路由层从 DB 行 / 内存快照装入，纯函数只读） */
export interface GroupInput {
  /** 集团名称 */
  groupName?: string;
  /** 总院 hospitalId */
  headHospitalId?: string;
  /** 成员医院列表 */
  members?: GroupMember[];
  /** 各院本期指标快照 */
  metrics?: HospitalMetricSnapshot[];
  /** 集团统一标准清单 */
  standards?: GroupStandard[];
}

/** 单院指标卡（大屏一行一家医院） */
export interface HospitalCard {
  hospitalId: string;
  hospitalName: string;
  hospitalLevel?: string;
  memberRole?: string;
  period: string;
  outpatientVolume: number;
  inpatientVolume: number;
  surgeryVolume: number;
  revenue: number;
  satisfaction: number;
  expertLoad: number;
  equipmentLoad: number;
  bedOccupancy: number;
}

/** buildGroupDashboard 总产出 */
export interface GroupDashboard {
  groupId: string;
  groupName: string;
  /** 生成时间（注入，便于测试） */
  asOf: string;
  /** 是否演示/冷启动模式（无真实样本时置位） */
  demo: boolean;
  /** 成员医院数 */
  memberCount: number;
  /** 总院 hospitalId */
  headHospitalId: string | null;
  members: GroupMember[];
  /** 集团汇总（五项核心指标） */
  totals: {
    outpatientVolume: number;
    inpatientVolume: number;
    surgeryVolume: number;
    revenue: number;
    satisfactionAvg: number;
  };
  /** 各医院核心指标卡 */
  hospitals: HospitalCard[];
  /** 三类资源负载均值（集团口径，供资源优化面板） */
  resourceLoad: {
    expertLoadAvg: number;
    equipmentLoadAvg: number;
    bedOccupancyAvg: number;
  };
  /** 集团统一标准汇总 */
  standards: {
    total: number;
    mandatory: number;
    byCategory: { clinic: number; qc: number; safety: number };
    items: GroupStandard[];
  };
}

/** compareHospitals 单院对比行 */
export interface HospitalComparison {
  hospitalId: string;
  hospitalName: string;
  metric: GroupMetricKey;
  metricName: string;
  period: string;
  value: number;
  /** 集团均值 */
  groupAverage: number;
  /** 偏离集团均值百分比：(value - avg) / avg * 100 */
  deviationPct: number;
  /** 排名（按指标值降序，1 最高） */
  rank: number;
  isAboveAverage: boolean;
}

/** 资源调配动作项（人话建议 → 可执行动作） */
export interface ResourceActionItem {
  fromHospitalId: string;
  fromHospitalName: string;
  toHospitalId: string;
  toHospitalName: string;
  resourceType: ResourceType;
  estimatedQuantity: number;
  rationale: string;
}

/** optimizeGroupResource 总产出 */
export interface ResourceSuggestion {
  groupId: string;
  resourceType: ResourceType;
  resourceName: string;
  asOf: string;
  demo: boolean;
  /** 集团平均负载率 0~100 */
  averageLoad: number;
  /** 高负载院（≥85），按负载降序 */
  overloaded: { hospitalId: string; hospitalName: string; load: number }[];
  /** 低负载院（≤60），按负载升序（最闲在前） */
  idle: { hospitalId: string; hospitalName: string; load: number; spareCapacityPct: number }[];
  /** 人话结论文案 */
  suggestions: string[];
  /** 可执行调配动作（低负载院 → 高负载院 配对） */
  actionItems: ResourceActionItem[];
}

/* ------------------------------- 常量与元数据 ------------------------------- */

/** 五项核心指标元数据（名称 / 单位） */
export const GROUP_METRIC_META: Record<GroupMetricKey, { name: string; unit: string }> = {
  outpatientVolume: { name: '门诊量', unit: '人次' },
  inpatientVolume: { name: '住院量', unit: '人次' },
  surgeryVolume: { name: '手术量', unit: '台' },
  revenue: { name: '业务收入', unit: '万元' },
  satisfaction: { name: '满意度', unit: '分' },
};

/** 资源类型元数据（负载率字段映射） */
export const RESOURCE_META: Record<ResourceType, { name: string; unit: string; loadKey: LoadKey }> = {
  expert: { name: '专家', unit: '人', loadKey: 'expertLoad' },
  equipment: { name: '大型设备', unit: '台', loadKey: 'equipmentLoad' },
  bed: { name: '床位', unit: '张', loadKey: 'bedOccupancy' },
};

/** 高负载阈值（≥ 即饱和，需要外部资源支援） */
export const OVERLOAD_THRESHOLD = 85;
/** 低负载阈值（≤ 即闲置，可向外输出资源） */
export const IDLE_THRESHOLD = 60;

/* ------------------------------- 安全收敛工具 ------------------------------- */

/** 数值安全化：NaN / 负数一律收敛为 0 */
function safeNum(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return n < 0 ? 0 : n;
}

/** 数值保留两位小数（避免浮点尾巴） */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 均值：空数组返回 0（不除零） */
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/* ------------------------------- 纯函数 ------------------------------- */

/**
 * 集团大屏聚合：把成员院籍 + 各院本期指标 + 统一标准归并成一页看板。
 *
 * @param groupId 集团 ID
 * @param input   集团输入（院籍/指标/标准均可空）
 * @param nowIso  生成时间戳（注入，便于测试）
 */
export function buildGroupDashboard(
  groupId: string,
  input?: GroupInput,
  nowIso: string = new Date().toISOString(),
): GroupDashboard {
  const members: GroupMember[] = Array.isArray(input?.members) ? input!.members : [];
  const metrics: HospitalMetricSnapshot[] = Array.isArray(input?.metrics) ? input!.metrics : [];
  const standards: GroupStandard[] = Array.isArray(input?.standards) ? input!.standards : [];

  // 指标按 hospitalId 建索引（同一周期每院一行；多行取最新 period 一行）
  const metricByHospital = new Map<string, HospitalMetricSnapshot>();
  for (const m of metrics) {
    const id = m.hospitalId;
    const prev = metricByHospital.get(id);
    if (!prev || String(m.period) >= String(prev.period)) {
      metricByHospital.set(id, m);
    }
  }

  // 各院指标卡：院籍为主，缺指标的院补零值（不串院、不编数）
  const hospitals: HospitalCard[] = members.map((mem) => {
    const snap = metricByHospital.get(mem.hospitalId);
    return {
      hospitalId: mem.hospitalId,
      hospitalName: mem.hospitalName,
      hospitalLevel: mem.hospitalLevel,
      memberRole: mem.memberRole,
      period: snap?.period ?? '',
      outpatientVolume: safeNum(snap?.outpatientVolume),
      inpatientVolume: safeNum(snap?.inpatientVolume),
      surgeryVolume: safeNum(snap?.surgeryVolume),
      revenue: safeNum(snap?.revenue),
      satisfaction: safeNum(snap?.satisfaction),
      expertLoad: safeNum(snap?.expertLoad),
      equipmentLoad: safeNum(snap?.equipmentLoad),
      bedOccupancy: safeNum(snap?.bedOccupancy),
    };
  });

  // 集团汇总：量类求和，满意度取均值
  const totals = {
    outpatientVolume: hospitals.reduce((a, h) => a + h.outpatientVolume, 0),
    inpatientVolume: hospitals.reduce((a, h) => a + h.inpatientVolume, 0),
    surgeryVolume: hospitals.reduce((a, h) => a + h.surgeryVolume, 0),
    revenue: round2(hospitals.reduce((a, h) => a + h.revenue, 0)),
    satisfactionAvg: round2(avg(hospitals.map((h) => h.satisfaction))),
  };

  // 三类资源负载均值
  const resourceLoad = {
    expertLoadAvg: round2(avg(hospitals.map((h) => h.expertLoad))),
    equipmentLoadAvg: round2(avg(hospitals.map((h) => h.equipmentLoad))),
    bedOccupancyAvg: round2(avg(hospitals.map((h) => h.bedOccupancy))),
  };

  // 统一标准汇总
  const byCategory = { clinic: 0, qc: 0, safety: 0 };
  let mandatory = 0;
  for (const s of standards) {
    if (s.category === 'clinic') byCategory.clinic += 1;
    else if (s.category === 'qc') byCategory.qc += 1;
    else if (s.category === 'safety') byCategory.safety += 1;
    if (s.enforceLevel === 'mandatory') mandatory += 1;
  }

  // 冷启动判定：无院籍或全无指标 → demo 标记
  const hasAnyMetric = hospitals.some(
    (h) =>
      h.outpatientVolume > 0 ||
      h.inpatientVolume > 0 ||
      h.surgeryVolume > 0 ||
      h.revenue > 0 ||
      h.satisfaction > 0,
  );
  const demo = members.length === 0 || !hasAnyMetric;

  return {
    groupId,
    groupName: input?.groupName ?? '',
    asOf: nowIso,
    demo,
    memberCount: members.length,
    headHospitalId: input?.headHospitalId ?? null,
    members,
    totals,
    hospitals,
    resourceLoad,
    standards: {
      total: standards.length,
      mandatory,
      byCategory,
      items: standards,
    },
  };
}

/**
 * 跨院指标对比：同一周期内，各成员院在指定指标上的横向比较。
 * 纯聚合：只做值 / 均值 / 偏离度 / 排名，不下钻患者明细。
 *
 * @param groupId 集团 ID（透传，便于审计）
 * @param metric  指标键（五项之一）
 * @param period  周期标签；传空串则对全部快照做对比
 * @param metrics 各院指标快照
 */
export function compareHospitals(
  groupId: string,
  metric: GroupMetricKey | string,
  period: string,
  metrics?: HospitalMetricSnapshot[],
): HospitalComparison[] {
  void groupId;
  const meta = GROUP_METRIC_META[metric as GroupMetricKey];
  if (!meta) return [];

  const all = Array.isArray(metrics) ? metrics : [];
  const rows = period ? all.filter((m) => String(m.period) === String(period)) : all;
  if (rows.length === 0) return [];

  const values = rows.map((m) => safeNum(m[metric as GroupMetricKey]));
  const groupAverage = round2(avg(values));

  // 按指标值降序排名
  const indexed = rows
    .map((m, i) => ({ m, value: values[i] }))
    .sort((a, b) => b.value - a.value);

  const result: HospitalComparison[] = indexed.map((row, idx) => {
    const deviationPct =
      groupAverage > 0 ? round2(((row.value - groupAverage) / groupAverage) * 100) : 0;
    return {
      hospitalId: row.m.hospitalId,
      hospitalName: row.m.hospitalName,
      metric: metric as GroupMetricKey,
      metricName: meta.name,
      period: row.m.period,
      value: round2(row.value),
      groupAverage,
      deviationPct,
      rank: idx + 1,
      isAboveAverage: row.value > groupAverage,
    };
  });

  return result;
}

/**
 * 跨院资源优化建议：找出某类资源的高负载院与低负载院，
 * 给出「从低负载院向高负载院调配」的人话建议与配对动作。
 *
 * @param groupId      集团 ID
 * @param resourceType 资源类型（expert/equipment/bed）
 * @param metrics      各院指标快照
 * @param nowIso       生成时间戳（注入）
 */
export function optimizeGroupResource(
  groupId: string,
  resourceType: ResourceType | string,
  metrics?: HospitalMetricSnapshot[],
  nowIso: string = new Date().toISOString(),
): ResourceSuggestion {
  const meta = RESOURCE_META[resourceType as ResourceType];
  const empty: ResourceSuggestion = {
    groupId,
    resourceType: (resourceType as ResourceType) ?? ('expert' as ResourceType),
    resourceName: meta?.name ?? '未知资源',
    asOf: nowIso,
    demo: true,
    averageLoad: 0,
    overloaded: [],
    idle: [],
    suggestions: [],
    actionItems: [],
  };
  if (!meta) return empty;

  const rows = Array.isArray(metrics) ? metrics : [];
  if (rows.length === 0) return empty;

  const loadKey = meta.loadKey;
  const loads = rows.map((m) => safeNum(m[loadKey]));
  const averageLoad = round2(avg(loads));

  const overloaded = rows
    .map((m, i) => ({ hospitalId: m.hospitalId, hospitalName: m.hospitalName, load: loads[i] }))
    .filter((r) => r.load >= OVERLOAD_THRESHOLD)
    .sort((a, b) => b.load - a.load);

  const idle = rows
    .map((m, i) => ({
      hospitalId: m.hospitalId,
      hospitalName: m.hospitalName,
      load: loads[i],
      spareCapacityPct: round2(Math.max(0, IDLE_THRESHOLD - loads[i])),
    }))
    .filter((r) => r.load <= IDLE_THRESHOLD)
    .sort((a, b) => a.load - b.load);

  // 人话建议
  const suggestions: string[] = [];
  if (overloaded.length === 0 && idle.length === 0) {
    suggestions.push(
      `集团${meta.name}负载均值 ${averageLoad}%，各院负载处于均衡区间（${IDLE_THRESHOLD}%~${OVERLOAD_THRESHOLD}%），暂无需跨院调配。`,
    );
  } else {
    if (overloaded.length > 0) {
      suggestions.push(
        `${overloaded.map((o) => `${o.hospitalName}(${o.load}%)`).join('、')} 负载饱和（≥${OVERLOAD_THRESHOLD}%），${meta.name}资源紧张。`,
      );
    }
    if (idle.length > 0) {
      suggestions.push(
        `${idle.map((o) => `${o.hospitalName}(${o.load}%)`).join('、')} 负载偏低（≤${IDLE_THRESHOLD}%），尚有${meta.name}余量可支援。`,
      );
    }
  }

  // 配对动作：低负载院 → 高负载院（轮询配对，N:M 均衡）
  const actionItems: ResourceActionItem[] = [];
  if (overloaded.length > 0 && idle.length > 0) {
    overloaded.forEach((over, oi) => {
      const idleSrc = idle[oi % idle.length];
      // 估算调配量：负载差 / 10，向上取整，至少 1 个单位
      const gapPct = Math.max(0, over.load - averageLoad);
      const estimatedQuantity = Math.max(1, Math.round(gapPct / 10));
      actionItems.push({
        fromHospitalId: idleSrc.hospitalId,
        fromHospitalName: idleSrc.hospitalName,
        toHospitalId: over.hospitalId,
        toHospitalName: over.hospitalName,
        resourceType: resourceType as ResourceType,
        estimatedQuantity,
        rationale: `${idleSrc.hospitalName}${meta.name}负载 ${idleSrc.load}%（余量 ${idleSrc.spareCapacityPct}%）→ ${over.hospitalName}负载 ${over.load}%（超均值 ${round2(over.load - averageLoad)}%），建议调配 ${estimatedQuantity} ${meta.unit}。`,
      });
    });
  }

  // demo 标记：有真实快照但没有任何越界院 → 真实数据但无需动作
  const demo = rows.length === 0;

  return {
    groupId,
    resourceType: resourceType as ResourceType,
    resourceName: meta.name,
    asOf: nowIso,
    demo,
    averageLoad,
    overloaded,
    idle,
    suggestions,
    actionItems,
  };
}
