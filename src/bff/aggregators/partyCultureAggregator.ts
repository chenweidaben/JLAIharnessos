/**
 * 健澜科技 jlmedaios - 党建与文化深化聚合器（M178-D · 医院管理深化）
 *
 * 【财务人力行政党建】党建文化要务实，不能形式主义。
 *   本模块把"党建/工会/医德医风/医院文化"从"登记留痕"推进到"可组织、可校验、
 *   可问效"：
 *
 *   管理四维度：
 *     - 党建工作：三会一课 / 主题党日 / 党员发展 / 组织关系
 *     - 工会工作：职工福利 / 文体活动 / 困难帮扶 / 职代会
 *     - 医德医风：医德考评 / 行风建设 / 投诉处理 / 先进表彰
 *     - 医院文化：院训院徽 / 医院精神 / 文化活动 / 品牌建设
 *
 *   对外纯函数：
 *     - buildDeepPartyCulture()            深度党建文化总览（四维度看板）
 *     - organizePartyActivity(activity)     党建活动组织（反形式主义硬校验）
 *     - evaluateMedicalEthics(staffId, period) 医德考评（证据加权，查实一票否决）
 *     - trackHospitalCultureEvent(event)    文化活动跟踪（问效，不数场次）
 *
 * 与全包聚合器约定一致：
 *   - 对外函数核心为组包/统计，入参不被回改；
 *   - 进程内台账 Map 是看板与考评的在读索引；PostgreSQL 为持久化留痕，
 *     落库 best-effort（断库/表未迁移降级，不阻断主流程）；
 *   - 不触碰 WebSocket，不新增依赖（id 取 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 管理四维度 */
export type CulturePillar = '党建工作' | '工会工作' | '医德医风' | '医院文化';

/** 党建工作子项 */
export type PartyBuildingTopic = '三会一课' | '主题党日' | '党员发展' | '组织关系';
/** 工会工作子项 */
export type UnionTopic = '职工福利' | '文体活动' | '困难帮扶' | '职代会';
/** 医德医风子项 */
export type EthicsTopic = '医德考评' | '行风建设' | '投诉处理' | '先进表彰';
/** 医院文化子项 */
export type CultureTopic = '院训院徽' | '医院精神' | '文化活动' | '品牌建设';

/** 活动子项全集（与四维度一一对应，校验所见即所查） */
export type ActivityTopic = PartyBuildingTopic | UnionTopic | EthicsTopic | CultureTopic;

/** 党建活动组织入参 */
export interface OrganizePartyActivityInput {
  /** 管理维度 */
  pillar: CulturePillar;
  /** 活动主题 */
  topic: string;
  /** 子项：三会一课/主题党日/职工福利/医德考评/院训院徽 等 */
  themeType: ActivityTopic;
  /** 计划日期 YYYY-MM-DD */
  plannedDate: string;
  /** 活动地点 */
  location: string;
  /** 主持人/责任人 id */
  hostId: string;
  /** 应到人数（反形式主义硬校验：<3 视为流于形式） */
  expectedAttendees: number;
  /** 预算（元），缺省 0 */
  budget?: number;
  /** 议程要点（务实：必填，不得只写标题） */
  agendaNotes: string;
  /** 议定落地事项（会后要办的实事） */
  actionItems?: string[];
}

/** 反形式主义校验项 */
export interface PragmatismCheckItem {
  /** 校验项名称 */
  item: string;
  /** 是否通过 */
  passed: boolean;
  /** 未通过原因（通过时为空串） */
  reason: string;
}

/** 一场被"组织"起来的党建/工会活动（不是签到拍照就散会） */
export interface OrganizedPartyActivity {
  /** 活动唯一标识 */
  id: string;
  pillar: CulturePillar;
  topic: string;
  themeType: ActivityTopic;
  plannedDate: string;
  location: string;
  hostId: string;
  expectedAttendees: number;
  budget: number;
  agendaNotes: string;
  /** 反形式主义校验清单 */
  pragmatismChecklist: PragmatismCheckItem[];
  /** 形式主义风险提示（非空 = 需要整改后再办） */
  formalRiskFlags: string[];
  /** 议定落地事项 */
  actionItems: string[];
  /** organized：可办；needsImprovement：流于形式风险，需整改 */
  status: 'organized' | 'needsImprovement';
  createdAt: string;
}

/** 医德考评证据（来自真实投诉/表扬/培训/退红包记录，不填表打分） */
export interface EthicsEvidence {
  /** 有效投诉件数 */
  complaints: number;
  /** 经查实违规（收红包、大处方、推诿病人等），>0 即一票否决 */
  verifiedViolations: number;
  /** 表扬信/锦旗次数 */
  commendations: number;
  /** 拒收/退回红包次数 */
  redEnvelopeReturned: number;
  /** 医德培训出勤 */
  trainingAttended: number;
  /** 医德培训应出勤 */
  trainingRequired: number;
}

/** 医德考评结果 */
export interface MedicalEthicsEvaluation {
  staffId: string;
  period: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  gradeLabel: string;
  /** 查实违规一票否决，等次封顶为 C */
  vetoed: boolean;
  /** 本周期考评依据摘要（务实：不是空话） */
  basis: string[];
  evaluatedAt: string;
}

/** 医院文化活动跟踪入参 */
export interface CultureEventInput {
  /** 活动名称 */
  name: string;
  /** 文化子项 */
  category: CultureTopic;
  /** 活动日期 YYYY-MM-DD */
  eventDate: string;
  /** 组织者 */
  organizer: string;
  /** 计划覆盖人数 */
  plannedReach: number;
  /** 预算（元） */
  budget: number;
  /** 实际覆盖人数（未开展时缺省 0） */
  actualReach?: number;
  /** 实际花费（元） */
  actualSpend?: number;
  /** 现场满意度 0-100 */
  satisfaction?: number;
  /** 成效小结（办成了什么，不是"圆满举办"） */
  outcomeSummary?: string;
}

/** 被跟踪的医院文化活动 */
export interface TrackedCultureEvent {
  id: string;
  name: string;
  category: CultureTopic;
  eventDate: string;
  organizer: string;
  plannedReach: number;
  actualReach: number;
  budget: number;
  actualSpend: number;
  satisfaction: number | null;
  outcomeSummary: string;
  status: 'planned' | 'executing' | 'closed';
  /** 人均成本（元/人），未问效时为 null */
  costPerReach: number | null;
  createdAt: string;
}

/** 单维度看板统计 */
export interface PillarStat {
  /** 维度名 */
  name: CulturePillar;
  /** 本维度已组织活动数 */
  activityCount: number;
  /** 形式主义风险（需整改）活动数 */
  riskCount: number;
  /** 子项覆盖（哪些子项已有动作） */
  coveredTopics: string[];
}

/** 深度党建文化总览（GET /api/v1/party/culture 返回体） */
export interface DeepPartyCulture {
  updatedAt: string;
  /** 院训 / 医院精神（文化锚点，长期不变） */
  motto: string;
  spirit: string;
  pillars: {
    partyBuilding: PillarStat;
    union: PillarStat;
    medicalEthics: PillarStat;
    hospitalCulture: PillarStat;
  };
  /** 已组织活动总数 */
  activitiesOrganized: number;
  /** 需整改（形式主义风险）活动数 */
  activitiesNeedingImprovement: number;
  /** 文化活动跟踪数 */
  cultureEventsTracked: number;
  /** 医德考评：已考评人数 */
  ethicsEvaluated: number;
  /** 医德考评等次分布 */
  ethicsGradeDistribution: Record<'A' | 'B' | 'C' | 'D', number>;
}

/* ------------------------------------------------------------------ */
/* 进程内台账                                                          */
/* ------------------------------------------------------------------ */

const activityLedger = new Map<string, OrganizedPartyActivity>();
const cultureEventLedger = new Map<string, TrackedCultureEvent>();
/** 医德证据台账：`${staffId}__${period}` -> evidence */
const ethicsEvidenceLedger = new Map<string, EthicsEvidence>();
/** 考评结果缓存：`${staffId}__${period}` -> evaluation */
const ethicsResultLedger = new Map<string, MedicalEthicsEvaluation>();

/** 院训 / 医院精神（务实、凝练，不堆砌形容词） */
const HOSPITAL_MOTTO = '仁爱、精业、求实、创新';
const HOSPITAL_SPIRIT = '以患者为中心，靠质量立院';

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** 校验并规范化活动日期：必须为 YYYY-MM-DD 真实日历日期 */
function normalizeDate(date: string): string {
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`日期必须为 YYYY-MM-DD，收到 ${String(date)}`);
  }
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
    throw new Error(`日期非法：${date}`);
  }
  return date;
}

function emptyGradeDist(): Record<'A' | 'B' | 'C' | 'D', number> {
  return { A: 0, B: 0, C: 0, D: 0 };
}

/* ------------------------------------------------------------------ */
/* 对外纯函数 1：党建活动组织（反形式主义硬校验）                        */
/* ------------------------------------------------------------------ */

/**
 * 【财务人力行政党建】组织一场党建/工会活动。
 *
 * 务实反形式主义校验：
 *   - 议程要点 agendaNotes 非空且 ≥10 字（不能只念文件标题）；
 *   - 应到人数 expectedAttendees ≥3（一人讲众人听不算组织生活）；
 *   - 必须有 hostId（谁牵头办，责任到人）；
 *   - 必须有议定落地事项 actionItems（会后要办的实事，不是散会就完）。
 *
 * 任一校验不过 → formalRiskFlags 非空、status=needsImprovement，
 * 提醒"先把实事想清楚再办"，而不是照单登记。
 */
export function organizePartyActivity(input: OrganizePartyActivityInput): OrganizedPartyActivity {
  if (!input || typeof input !== 'object') {
    throw new Error('活动入参不能为空');
  }
  const topic = typeof input.topic === 'string' ? input.topic.trim() : '';
  if (!topic) throw new Error('活动主题 topic 不能为空');
  if (!input.hostId || typeof input.hostId !== 'string') {
    throw new Error('主持人 hostId 不能为空（责任到人）');
  }
  const plannedDate = normalizeDate(input.plannedDate);

  const agenda = typeof input.agendaNotes === 'string' ? input.agendaNotes.trim() : '';
  const attendees = Number(input.expectedAttendees);
  const items = Array.isArray(input.actionItems)
    ? input.actionItems.filter((s) => typeof s === 'string').map((s) => s.trim()).filter((s) => s.length > 0)
    : [];

  // ---- 反形式主义硬校验（务实：不替走过场的活动背书）----
  const checklist: PragmatismCheckItem[] = [];

  const agendaOk = agenda.length >= 10;
  checklist.push({
    item: '议程要点不得仅为标题（≥10字，讲清学什么、议什么）',
    passed: agendaOk,
    reason: agendaOk ? '' : '议程过简，有签到拍照就散会的形式主义风险',
  });

  const attendeesOk = Number.isFinite(attendees) && attendees >= 3;
  checklist.push({
    item: '应到人数≥3（避免一人讲众人听）',
    passed: attendeesOk,
    reason: attendeesOk ? '' : `应到人数 ${attendees} 不足，组织生活会易流于形式`,
  });

  const itemsOk = items.length >= 1;
  checklist.push({
    item: '至少一项会后落地事项（议了要办）',
    passed: itemsOk,
    reason: itemsOk ? '' : '没有议定事项，容易学完就散、无人跟进',
  });

  const riskFlags = checklist.filter((c) => !c.passed).map((c) => c.reason);
  const status: OrganizedPartyActivity['status'] =
    riskFlags.length === 0 ? 'organized' : 'needsImprovement';

  const activity: OrganizedPartyActivity = {
    id: randomUUID(),
    pillar: input.pillar,
    topic,
    themeType: input.themeType,
    plannedDate,
    location: typeof input.location === 'string' ? input.location.trim() : '',
    hostId: input.hostId,
    expectedAttendees: attendeesOk ? attendees : 0,
    budget: Number.isFinite(Number(input.budget)) ? Number(input.budget) : 0,
    agendaNotes: agenda,
    pragmatismChecklist: checklist,
    formalRiskFlags: riskFlags,
    actionItems: items,
    status,
    createdAt: new Date().toISOString(),
  };

  activityLedger.set(activity.id, activity);
  return activity;
}

/* ------------------------------------------------------------------ */
/* 对外纯函数 2：医德考评（证据加权，查实一票否决）                      */
/* ------------------------------------------------------------------ */

/**
 * 登记一名职工某周期的医德证据（来自投诉/表扬/培训/退红包真实记录）。
 * 由路由层在产生记录时调用；单测也用它喂数据。
 * 同 staffId+period 重复登记为覆盖更新（不回改入参对象）。
 */
export function recordEthicsEvidence(staffId: string, period: string, evidence: EthicsEvidence): void {
  if (!staffId) throw new Error('staffId 不能为空');
  if (!period || typeof period !== 'string') throw new Error('考评周期 period 不能为空');
  const key = `${staffId}__${period}`;
  ethicsEvidenceLedger.set(key, {
    complaints: Math.max(0, Number(evidence.complaints) || 0),
    verifiedViolations: Math.max(0, Number(evidence.verifiedViolations) || 0),
    commendations: Math.max(0, Number(evidence.commendations) || 0),
    redEnvelopeReturned: Math.max(0, Number(evidence.redEnvelopeReturned) || 0),
    trainingAttended: Math.max(0, Number(evidence.trainingAttended) || 0),
    trainingRequired: Math.max(0, Number(evidence.trainingRequired) || 0),
  });
}

/**
 * 【财务人力行政党建】医德考评。
 *
 * 务实口径：不搞年终填表"人人优秀"。
 *   - 基础分 80；
 *   - 每条表扬 +2，每次拒收/退回红包 +3（单项加分封顶 +15）；
 *   - 每起有效投诉 -5；经查实违规每起 -15，并触发一票否决（等次封顶 C）；
 *   - 医德培训出勤率 = attended/required：100% 不加减，每缺一次 -2。
 *   - 等次：≥90 A优秀 / 75-89 B良好 / 60-74 C合格 / <60 D不合格。
 *
 * 无证据时按"待考评"返回 C（合格）基线，并在 basis 注明暂无记录，
 * 绝不凭空给 A。
 */
export function evaluateMedicalEthics(staffId: string, period: string): MedicalEthicsEvaluation {
  if (!staffId) throw new Error('staffId 不能为空');
  if (!period || typeof period !== 'string') throw new Error('考评周期 period 不能为空');

  const key = `${staffId}__${period}`;
  const cached = ethicsResultLedger.get(key);
  if (cached) return { ...cached, basis: [...cached.basis] };

  const e = ethicsEvidenceLedger.get(key);
  const basis: string[] = [];

  let score = 80;
  if (!e) {
    basis.push('本周期暂无投诉/表扬/培训等考评证据，按合格基线 C 计，待补真实记录');
  } else {
    const plusCommendation = Math.min(15, e.commendations * 2);
    const plusRed = Math.min(15, e.redEnvelopeReturned * 3);
    score += plusCommendation + plusRed;

    if (e.commendations > 0) basis.push(`获表扬 ${e.commendations} 次（+${plusCommendation}）`);
    if (e.redEnvelopeReturned > 0) basis.push(`拒收/退回红包 ${e.redEnvelopeReturned} 次（+${plusRed}）`);

    score -= e.complaints * 5;
    if (e.complaints > 0) basis.push(`有效投诉 ${e.complaints} 起（-${e.complaints * 5}）`);

    const violations = e.verifiedViolations;
    score -= violations * 15;
    if (violations > 0) basis.push(`经查实违规 ${violations} 起（-${violations * 15}，一票否决）`);

    if (e.trainingRequired > 0) {
      const absent = Math.max(0, e.trainingRequired - e.trainingAttended);
      score -= absent * 2;
      if (absent > 0) basis.push(`医德培训缺训 ${absent} 次（-${absent * 2}）`);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const vetoed = (e?.verifiedViolations ?? 0) > 0;
  let grade: 'A' | 'B' | 'C' | 'D';
  if (!e) {
    // 无任何真实证据：不凭 80 基线送 B（良好），务实按 C（合格）待补记录
    grade = 'C';
  } else if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else grade = 'D';

  // 查实违规一票否决：等次封顶 C（不能拿优秀/良好）
  if (vetoed && (grade === 'A' || grade === 'B')) {
    grade = 'C';
    basis.push('经查实违规，医德等次一票否决，封顶为 C（合格）');
  }

  const gradeLabel = grade === 'A' ? '优秀' : grade === 'B' ? '良好' : grade === 'C' ? '合格' : '不合格';
  basis.unshift(`加权得分 ${score}，等次 ${grade}（${gradeLabel}）`);

  const result: MedicalEthicsEvaluation = {
    staffId,
    period,
    score,
    grade,
    gradeLabel,
    vetoed,
    basis,
    evaluatedAt: new Date().toISOString(),
  };
  ethicsResultLedger.set(key, { ...result, basis: [...result.basis] });
  return result;
}

/* ------------------------------------------------------------------ */
/* 对外纯函数 3：医院文化活动跟踪（问效，不数场次）                      */
/* ------------------------------------------------------------------ */

/**
 * 【财务人力行政党建】跟踪一场医院文化活动。
 *
 * 务实问效口径：
 *   - 给了实际覆盖人数/实际花费 → 自动算人均成本 costPerReach；
 *   - 给了满意度与成效小结 → 标记 closed（办成了、办得怎么样有数）；
 *   - 只给计划信息 → status=planned，等待问效。
 * 不奖励"办了多少场"，只看"覆盖了多少人、花得值不值、大家满不满意"。
 */
export function trackHospitalCultureEvent(input: CultureEventInput): TrackedCultureEvent {
  if (!input || typeof input !== 'object') throw new Error('文化活动入参不能为空');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) throw new Error('活动名称 name 不能为空');
  const eventDate = normalizeDate(input.eventDate);

  const actualReach = Math.max(0, Number(input.actualReach) || 0);
  const actualSpend = Math.max(0, Number(input.actualSpend) || 0);
  const satisfaction =
    input.satisfaction === undefined || input.satisfaction === null
      ? null
      : Math.max(0, Math.min(100, Number(input.satisfaction)));
  const outcomeSummary =
    typeof input.outcomeSummary === 'string' ? input.outcomeSummary.trim() : '';

  const hasOutcome = actualReach > 0 && outcomeSummary.length > 0;
  const status: TrackedCultureEvent['status'] = hasOutcome ? 'closed' : actualReach > 0 || actualSpend > 0 ? 'executing' : 'planned';
  const costPerReach = actualReach > 0 ? Math.round((actualSpend / actualReach) * 100) / 100 : null;

  const evt: TrackedCultureEvent = {
    id: randomUUID(),
    name,
    category: input.category,
    eventDate,
    organizer: typeof input.organizer === 'string' ? input.organizer.trim() : '',
    plannedReach: Math.max(0, Number(input.plannedReach) || 0),
    actualReach,
    budget: Math.max(0, Number(input.budget) || 0),
    actualSpend,
    satisfaction,
    outcomeSummary,
    status,
    costPerReach,
    createdAt: new Date().toISOString(),
  };

  cultureEventLedger.set(evt.id, evt);
  return evt;
}

/* ------------------------------------------------------------------ */
/* 对外纯函数 4：深度党建文化总览                                       */
/* ------------------------------------------------------------------ */

function buildPillarStat(name: CulturePillar, activities: OrganizedPartyActivity[]): PillarStat {
  const mine = activities.filter((a) => a.pillar === name);
  return {
    name,
    activityCount: mine.length,
    riskCount: mine.filter((a) => a.status === 'needsImprovement').length,
    coveredTopics: [...new Set(mine.map((a) => a.themeType))],
  };
}

/**
 * 【财务人力行政党建】拼装深度党建文化看板。
 * 四维度各自统计已组织活动数、形式主义风险数、子项覆盖；
 * 并汇总文化活动跟踪数、医德考评等次分布。
 * 不修改任何台账；返回新对象，调用方无法借此篡改留痕。
 */
export function buildDeepPartyCulture(): DeepPartyCulture {
  const activities = [...activityLedger.values()];
  const cultureEvents = [...cultureEventLedger.values()];
  const evaluations = [...ethicsResultLedger.values()];

  const dist = emptyGradeDist();
  for (const ev of evaluations) dist[ev.grade] += 1;

  return {
    updatedAt: new Date().toISOString(),
    motto: HOSPITAL_MOTTO,
    spirit: HOSPITAL_SPIRIT,
    pillars: {
      partyBuilding: buildPillarStat('党建工作', activities),
      union: buildPillarStat('工会工作', activities),
      medicalEthics: buildPillarStat('医德医风', activities),
      hospitalCulture: buildPillarStat('医院文化', activities),
    },
    activitiesOrganized: activities.length,
    activitiesNeedingImprovement: activities.filter((a) => a.status === 'needsImprovement').length,
    cultureEventsTracked: cultureEvents.length,
    ethicsEvaluated: evaluations.length,
    ethicsGradeDistribution: dist,
  };
}

/* ------------------------------------------------------------------ */
/* 只读列表（供路由/页面调试用）                                        */
/* ------------------------------------------------------------------ */

/** 已组织活动列表（副本，按计划日期倒序） */
export function listOrganizedActivities(): OrganizedPartyActivity[] {
  const out = [...activityLedger.values()].map((a) => ({
    ...a,
    pragmatismChecklist: a.pragmatismChecklist.map((c) => ({ ...c })),
    formalRiskFlags: [...a.formalRiskFlags],
    actionItems: [...a.actionItems],
  }));
  out.sort((x, z) => z.plannedDate.localeCompare(x.plannedDate));
  return out;
}

/** 文化活动跟踪列表（副本，按日期倒序） */
export function listCultureEvents(): TrackedCultureEvent[] {
  const out = [...cultureEventLedger.values()].map((e) => ({ ...e }));
  out.sort((x, z) => z.eventDate.localeCompare(x.eventDate));
  return out;
}
