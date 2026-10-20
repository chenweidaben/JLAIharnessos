/**
 * 健澜科技 jlmedaios - 双向转诊管理聚合器（M143-C）【互联网医院与远程医疗】
 *
 * 业务目标：双向转诊要跟踪到底，不能转出去就不管了。
 *   三个纯函数围绕「转诊单」状态机展开：
 *     - createReferral(patientId, fromDept, toDept, reason, expectedDate)：
 *         发起一张转诊单，登记患者、转出/转入科室、转诊原因与预计接诊日期；
 *         新单默认「待接收」，方向按科室自动识别：
 *           上转（基层→三甲）/ 下转（三甲→基层康复）/ 院内转科；
 *     - acceptReferral(referralId, acceptingDoctor)：
 *         目标科室接诊医生接收转诊，登记接收人，状态由「待接收」推进到「已接收」；
 *     - completeReferral(referralId, outcome)：
 *         诊疗闭环，登记转归结局，状态推进到「已完成」。
 *   配套生命周期纯函数：
 *     - listIncoming(toDept?)：转入队列——待目标科室接收的转诊单，
 *         按预计接诊日期升序，最急（最可能超时）的排最前；
 *     - getReferralReport(now?)：按三态统计转诊单量，并把「已过预计接诊日期
 *         仍未闭环」的单子抛成超时预警清单——这就是「转出去没人接」的兜底落点。
 *
 * 设计说明：
 *   本模块为无库依赖的纯函数内核（与 logisticsAggregator 同思路），状态收敛在模块级
 *   内存台账中，id 由确定性计数器生成（rf_0001 …），同一序列恒等输出，便于单测与重放；
 *   生产环境可在路由层把同名函数对接到 clinical.referral_record 表（见
 *   deploy/postgres/init/285-referral.sql），函数内核口径保持不变。
 *   expectedDate / now 可注入以便测试，缺省取系统当前时间。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 转诊方向：上转（基层→三甲）/ 下转（三甲→基层康复）/ 院内转科 */
export type ReferralDirection = '上转' | '下转' | '院内转科';

/** 转诊状态机：待接收 → 已接收 → 已完成 */
export type ReferralStatus = '待接收' | '已接收' | '已完成';

/** 双向转诊单 */
export interface Referral {
  id: string;
  patientId: string;
  fromDept: string;
  toDept: string;
  direction: ReferralDirection;
  reason: string;
  /** 预计接诊日期（ISO 8601） */
  expectedDate: string;
  status: ReferralStatus;
  /** 接诊医生工号；null = 目标科室尚未接收 */
  acceptingDoctor: string | null;
  acceptedAt: string | null;
  /** 转归结局；null = 尚未闭环 */
  outcome: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** 单条超时预警 */
export interface ReferralAlert {
  referralId: string;
  patientId: string;
  fromDept: string;
  toDept: string;
  direction: ReferralDirection;
  reason: string;
  expectedDate: string;
  /** 已超时小时数（正数） */
  overdueHours: number;
}

/** 双向转诊完成统计报告 */
export interface ReferralReport {
  total: number;
  byStatus: Record<ReferralStatus, number>;
  /** 已完成闭环数 */
  completedCount: number;
  /** 未闭环数（待接收 + 已接收） */
  openCount: number;
  /** 超时未闭环预警清单（超时最久排最前） */
  overdueAlerts: ReferralAlert[];
  overdueCount: number;
}

/** 允许的转诊方向白名单 */
export const REFERRAL_DIRECTIONS: readonly ReferralDirection[] = ['上转', '下转', '院内转科'];

const HOUR_MS = 60 * 60 * 1000;

// ---- 模块级内存台账（纯函数内核的状态载体，可被 resetReferralStore 清空） ---------
const referralStore: Referral[] = [];
let referralSeq = 0;

/**
 * M198 空数据修复：DEMO_MODE 下播种确定性演示转诊单，避免页面「暂无数据」。
 * 覆盖三态：待接收 / 已接收 / 已完成，三种方向各一。
 */
function seedDemoReferrals(): void {
  const seeds: Array<Omit<Referral, 'id'>> = [
    { patientId: 'P001', fromDept: '社区卫生服务中心', toDept: '心血管内科', direction: '上转', reason: '胸痛待查，需上级医院冠脉评估', expectedDate: '2026-10-20', status: '待接收', acceptingDoctor: null, acceptedAt: null, outcome: null, completedAt: null, createdAt: '2026-10-18 09:00' },
    { patientId: 'P002', fromDept: '普外科', toDept: '康复医学科', direction: '下转', reason: '术后恢复期康复治疗', expectedDate: '2026-10-19', status: '已接收', acceptingDoctor: 'u_2001', acceptedAt: '2026-10-18 15:00', outcome: null, completedAt: null, createdAt: '2026-10-17 10:00' },
    { patientId: 'P003', fromDept: '呼吸内科', toDept: 'ICU', direction: '院内转科', reason: '呼吸衰竭需转入 ICU 监护', expectedDate: '2026-10-18', status: '已完成', acceptingDoctor: 'u_2002', acceptedAt: '2026-10-18 08:00', outcome: '病情稳定转回普通病房', completedAt: '2026-10-19 10:00', createdAt: '2026-10-17 16:00' },
    { patientId: 'P004', fromDept: '乡镇卫生院', toDept: '神经内科', direction: '上转', reason: '突发肢体乏力，疑似脑卒中', expectedDate: '2026-10-20', status: '待接收', acceptingDoctor: null, acceptedAt: null, outcome: null, completedAt: null, createdAt: '2026-10-19 08:30' },
  ];
  for (const s of seeds) {
    referralSeq += 1;
    referralStore.push({ ...s, id: `rf_${String(referralSeq).padStart(4, '0')}` });
  }
}

if (process.env.DEMO_MODE === '1') {
  seedDemoReferrals();
}

/** 测试辅助：清空台账与计数器，保证用例之间互不污染（不对外暴露为业务 API） */
export function resetReferralStore(): void {
  referralStore.length = 0;
  referralSeq = 0;
}

function isValidIso(s: string): boolean {
  if (typeof s !== 'string' || !s) return false;
  return !Number.isNaN(new Date(s).getTime());
}

/**
 * 方向自动识别：
 *   转出是基层（社区/卫生院/康复机构）且转入不是基层 → 上转；
 *   转出不是基层且转入是基层康复机构       → 下转；
 *   其余（双方都是本院科室）                 → 院内转科。
 */
function classifyDirection(from: string, to: string): ReferralDirection {
  const GRASSROOTS = ['社区卫生服务中心', '社区卫生服务站', '卫生院', '社区', '基层', '康复'];
  const fromGrass = GRASSROOTS.some((k) => from.includes(k));
  const toGrass = GRASSROOTS.some((k) => to.includes(k));
  if (fromGrass && !toGrass) return '上转';
  if (!fromGrass && toGrass) return '下转';
  return '院内转科';
}

/** 只读视图：按参考时间判断转诊单是否已超时（超过预计接诊日期且未闭环） */
export function isReferralOverdue(r: Referral, now: Date = new Date()): boolean {
  if (r.status === '已完成') return false;
  const exp = new Date(r.expectedDate).getTime();
  if (Number.isNaN(exp)) return false;
  return now.getTime() > exp;
}

/**
 * 创建一张转诊单（纯函数）。
 * 新单默认「待接收」，接收医生为空——必须由目标科室显式接收，
 * 从流程上杜绝「转出去就不管了」。方向按转出/转入科室自动识别。
 */
export function createReferral(
  patientId: string,
  fromDept: string,
  toDept: string,
  reason: string,
  expectedDate: string,
): Referral {
  const pid = (patientId ?? '').trim();
  if (!pid) throw new Error('患者 ID 不能为空');
  const from = (fromDept ?? '').trim();
  if (!from) throw new Error('转出科室不能为空');
  const to = (toDept ?? '').trim();
  if (!to) throw new Error('转入科室不能为空');
  if (from === to) throw new Error('转出科室与转入科室不能相同');
  const rsn = (reason ?? '').trim();
  if (!rsn) throw new Error('转诊原因不能为空');
  if (!isValidIso(expectedDate)) {
    throw new Error(`预计接诊日期格式非法：${expectedDate}（应为 ISO 8601 时间串）`);
  }

  referralSeq += 1;
  const ref: Referral = {
    id: `rf_${String(referralSeq).padStart(4, '0')}`,
    patientId: pid,
    fromDept: from,
    toDept: to,
    direction: classifyDirection(from, to),
    reason: rsn,
    expectedDate,
    status: '待接收',
    acceptingDoctor: null,
    acceptedAt: null,
    outcome: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  referralStore.push(ref);
  return { ...ref };
}

/**
 * 接收转诊：目标科室接诊医生接管病人（纯函数）。
 * 仅「待接收」转诊单可接收；接收后状态推进到「已接收」，登记接诊医生与接收时间。
 */
export function acceptReferral(referralId: string, acceptingDoctor: string): Referral {
  const ref = referralStore.find((r) => r.id === referralId);
  if (!ref) throw new Error(`转诊单不存在：${referralId}`);
  if (ref.status !== '待接收') {
    throw new Error(`转诊单当前状态为「${ref.status}」，仅「待接收」转诊单可接收`);
  }
  const doctor = (acceptingDoctor ?? '').trim();
  if (!doctor) throw new Error('接诊医生不能为空');

  ref.status = '已接收';
  ref.acceptingDoctor = doctor;
  ref.acceptedAt = new Date().toISOString();
  return { ...ref };
}

/**
 * 完成转诊：诊疗闭环，登记转归结局（纯函数）。
 * 仅「已接收」转诊单可完成——未接收直接完成即视同「没人接就结案」，禁止。
 */
export function completeReferral(referralId: string, outcome: string): Referral {
  const ref = referralStore.find((r) => r.id === referralId);
  if (!ref) throw new Error(`转诊单不存在：${referralId}`);
  if (ref.status !== '已接收') {
    throw new Error(`转诊单当前状态为「${ref.status}」，仅「已接收」转诊单可完成闭环`);
  }
  const out = (outcome ?? '').trim();
  if (!out) throw new Error('转归结局不能为空');

  ref.status = '已完成';
  ref.outcome = out;
  ref.completedAt = new Date().toISOString();
  return { ...ref };
}

/**
 * 转入队列（纯函数）：待目标科室接收的转诊单。
 * @param toDept 指定转入科室时只看该科室的待收单；不传则看全部待收单。
 *   按预计接诊日期升序——最急（最早到期）的排最前，协调员先催最可能超时的。
 */
export function listIncoming(toDept?: string): Referral[] {
  const target = (toDept ?? '').trim();
  return referralStore
    .filter((r) => r.status === '待接收')
    .filter((r) => !target || r.toDept === target)
    .map((r) => ({ ...r }))
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.id.localeCompare(b.id));
}

/** 只读视图：全部转诊单（供医联体协调员看板；不暴露内部可变引用） */
export function listAllReferrals(): Referral[] {
  return referralStore.map((r) => ({ ...r }));
}

/**
 * 完成统计 + 超时预警（纯函数）。
 * 核心：把「已过预计接诊日期仍未闭环」的转诊单抛成预警清单，落实
 * 「双向转诊要跟踪到底，不能转出去就不管了」。
 * @param now 参考时间，测试可注入；缺省取系统当前时间
 */
export function getReferralReport(now: Date = new Date()): ReferralReport {
  const byStatus: Record<ReferralStatus, number> = {
    待接收: 0, 已接收: 0, 已完成: 0,
  };
  const alerts: ReferralAlert[] = [];
  const nowMs = now.getTime();

  for (const r of referralStore) {
    byStatus[r.status] += 1;
    if (!isReferralOverdue(r, now)) continue;
    const overdueHours = (nowMs - new Date(r.expectedDate).getTime()) / HOUR_MS;
    alerts.push({
      referralId: r.id,
      patientId: r.patientId,
      fromDept: r.fromDept,
      toDept: r.toDept,
      direction: r.direction,
      reason: r.reason,
      expectedDate: r.expectedDate,
      overdueHours: Math.round(overdueHours * 10) / 10,
    });
  }

  // 超时最久的排最前，协调员先催拖得最久的单子
  alerts.sort((a, b) => b.overdueHours - a.overdueHours);

  return {
    total: referralStore.length,
    byStatus,
    completedCount: byStatus['已完成'],
    openCount: byStatus['待接收'] + byStatus['已接收'],
    overdueAlerts: alerts,
    overdueCount: alerts.length,
  };
}
