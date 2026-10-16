/**
 * 健澜科技 jlmedaios - 【患者服务与体验深化】深度患者体验聚合器（M180-C · 质量与体验）
 *
 * 集团与科学：患者体验要真改进，不能只是登记投诉。
 *   - 四大体验维度：预约体验 / 就诊体验 / 缴费体验 / 投诉体验；
 *   - 纯函数度量一次就诊旅程的体验得分（0-100）；
 *   - 从患者反馈文本中识别痛点代码（关键词命中 + 维度归属）；
 *   - 按痛点代码生成可执行改进措施（禁止只写"已处理"）；
 *   - patientId 出参即脱敏（P0****23），不接触患者明文 PII。
 *
 * 纯函数约定（与全仓聚合器一致）：
 *   - buildDeepPatientExperience / measurePatientExperience /
 *     identifyExperiencePainPoint / generateExperienceImprovement
 *     均为纯计算，不改写入参；
 *   - 入参非法一律抛错，由路由层捕获为 400 结构化错误；
 *   - 落库 best-effort（断库/表未迁移时降级，不阻断服务主流程）。
 *
 * 不触碰 WebSocket，不新增依赖。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                            */
/* ------------------------------------------------------------------ */

/** 四大体验维度 */
export type ExperienceDimension = 'appointment' | 'visit' | 'payment' | 'complaint';

/** 痛点代码（与 370-patient-exp.sql 注释口径一致） */
export type PainPointCode =
  | 'appt_wait'
  | 'appt_channel'
  | 'triage_long'
  | 'wait_long'
  | 'consult_short'
  | 'exam_fragmented'
  | 'pharmacy_slow'
  | 'payment_window'
  | 'self_service_down'
  | 'mobile_pay_fail'
  | 'receipt_dup'
  | 'complaint_slow'
  | 'no_feedback'
  | 'low_satisfaction'
  | 'unknown';

/** 一条就诊旅程各环节耗时（分钟）与结果，供 measurePatientExperience 打分 */
export interface PatientJourney {
  /** 预约渠道：window 窗口 / phone 电话 / wechat 微信 / app 本院APP / mini 小程序 */
  appointmentChannel?: string;
  /** 预约是否成功 */
  appointmentSuccess?: boolean;
  /** 预约等待时长（分钟：从挂号到确认号源） */
  appointmentWaitMin?: number;
  /** 分诊耗时（分钟） */
  triageMin?: number;
  /** 候诊时长（分钟） */
  waitingMin?: number;
  /** 医生实际接诊时长（分钟） */
  consultMin?: number;
  /** 检查次数（重复开单视为碎片化） */
  examCount?: number;
  /** 取药等待时长（分钟） */
  pharmacyWaitMin?: number;
  /** 缴费渠道：window 窗口 / self 自助机 / mobile 移动支付 */
  paymentChannel?: string;
  /** 移动支付是否失败过 */
  mobilePayFailed?: boolean;
  /** 是否重复排队打印票据 */
  receiptRequeue?: boolean;
  /** 投诉受理时长（小时） */
  complaintAcceptHours?: number;
  /** 投诉是否给患者回过处理结果 */
  complaintReplied?: boolean;
  /** 患者本次满意度自评分 1-5（0 表示未评） */
  selfScore?: number;
}

/** 单维度得分 */
export interface DimensionScore {
  dimension: ExperienceDimension;
  label: string;
  /** 0-100 */
  score: number;
  /** 该维度的关键问题点（空数组表示达标） */
  issues: string[];
}

/** 一次就诊旅程的体验度量结果 */
export interface ExperienceMeasurement {
  patientId: string;
  overallScore: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  dimensions: DimensionScore[];
  bottleneck: ExperienceDimension;
}

/** 痛点识别结果 */
export interface PainPoint {
  code: PainPointCode;
  dimension: ExperienceDimension;
  label: string;
  desc: string;
  /** 命中的关键词 */
  hits: string[];
}

/** 改进措施 */
export interface ImprovementAction {
  code: string;
  painPoint: PainPointCode;
  dimension: ExperienceDimension;
  title: string;
  action: string;
  owner: string;
  dueDays: number;
}

/** 深度患者体验目录（看板静态口径） */
export interface DeepExperienceCatalog {
  dimensions: Array<{
    code: ExperienceDimension;
    label: string;
    subItems: Array<{ code: string; label: string; target: string }>;
  }>;
  scoreBand: Array<{ min: number; level: string; label: string }>;
}

/* ------------------------------------------------------------------ */
/* 常量：关键词 → 痛点映射                                              */
/* ------------------------------------------------------------------ */

const PAIN_KEYWORDS: Array<{
  code: PainPointCode;
  dimension: ExperienceDimension;
  label: string;
  keywords: string[];
}> = [
  { code: 'appt_wait', dimension: 'appointment', label: '预约等待过长', keywords: ['预约等', '挂号等', '号源抢不到', '约不上', '放号太慢'] },
  { code: 'appt_channel', dimension: 'appointment', label: '预约渠道不畅', keywords: ['只能窗口', '电话打不通', '线上约不了', '没有小程序'] },
  { code: 'triage_long', dimension: 'visit', label: '分诊排队久', keywords: ['分诊排队', '分诊台慢', '先分诊再排队'] },
  { code: 'wait_long', dimension: 'visit', label: '候诊时间过长', keywords: ['候诊', '等了两小时', '等太久', '叫号慢', '排队看诊'] },
  { code: 'consult_short', dimension: 'visit', label: '接诊时间过短', keywords: ['一句话打发', '问诊太短', '没说两句', '排队两小时看病五分钟'] },
  { code: 'exam_fragmented', dimension: 'visit', label: '检查碎片化', keywords: ['重复检查', '分开缴费', '楼上楼下跑', '检查排队', '多趟跑'] },
  { code: 'pharmacy_slow', dimension: 'visit', label: '取药等待过长', keywords: ['取药等', '药房慢', '排很久拿药'] },
  { code: 'payment_window', dimension: 'payment', label: '缴费窗口排队', keywords: ['缴费排队', '收费窗口', '交钱排队'] },
  { code: 'self_service_down', dimension: 'payment', label: '自助机不可用', keywords: ['自助机坏', '自助机用不了', '自助机排队', '自助机没人'] },
  { code: 'mobile_pay_fail', dimension: 'payment', label: '移动支付失败', keywords: ['手机付不了', '微信付不了', '支付宝失败', '支付报错', '扫码付不了'] },
  { code: 'receipt_dup', dimension: 'payment', label: '票据重复打印', keywords: ['发票重打', '票据丢了', '还要排队打票', '自助打票'] },
  { code: 'complaint_slow', dimension: 'complaint', label: '投诉受理慢', keywords: ['投诉没人理', '投诉无门', '反映了没用', '48小时'] },
  { code: 'no_feedback', dimension: 'complaint', label: '投诉无反馈', keywords: ['没回音', '处理结果没人告诉我', '投诉后没消息'] },
  { code: 'low_satisfaction', dimension: 'complaint', label: '总体满意度低', keywords: ['不满意', '体验差', '再也不来', '差评'] },
];

const IMPROVEMENT_MAP: Record<PainPointCode, Omit<ImprovementAction, 'painPoint' | 'dimension'>> = {
  appt_wait: { code: 'IMP-APPT-01', title: '放号节奏与预约提醒优化', action: '将号源分时段放开（早7点/午12点/晚8点三批），上线预约成功短信/微信提醒与到院前30分钟提醒；高峰科室开通候补队列，号源释放自动递补。', owner: '门诊办 + 信息科', dueDays: 14 },
  appt_channel: { code: 'IMP-APPT-02', title: '多端预约渠道补齐', action: '打通小程序/公众号/APP/电话/窗口五端号源实时同步；老年专线保留人工接听，电话等待>60秒回呼；线下自助预约机配志愿者引导。', owner: '门诊办 + 客服中心', dueDays: 14 },
  triage_long: { code: 'IMP-VISIT-01', title: '预分诊前置', action: '线上挂号时完成症状自评预分诊，现场扫码二次确认；高峰时段加开分诊台，预检指标（血压/体温）自助完成，分诊耗时目标≤5分钟。', owner: '门诊办', dueDays: 10 },
  wait_long: { code: 'IMP-VISIT-02', title: '候诊叫号与分时预约', action: '推行分时预约（15分钟粒度），叫号进度大屏+微信实时推送；候诊>40分钟自动触发科室主任提醒；复诊检查优先安排下午错峰。', owner: '门诊部 + 信息科', dueDays: 14 },
  consult_short: { code: 'IMP-VISIT-03', title: '医师接诊时长质控', action: '将平均接诊时长纳入科室月度质控（普通门诊≥8分钟、专家≥15分钟）；上线AI预问诊小结自动带入病历，减少医生打字时间，把时间还给问诊。', owner: '医务处', dueDays: 30 },
  exam_fragmented: { code: 'IMP-VISIT-04', title: '检查一站式预约', action: '医生开单后自动合并同日检查项目，一站式预约检查时段；推行检查集中缴费、院区直通通道；重复检查自动拦截并提示既往报告。', owner: '门诊部 + 检查科室', dueDays: 21 },
  pharmacy_slow: { code: 'IMP-VISIT-05', title: '药房预配药', action: '医生处方审核后预配药，患者缴费即触发药房配药；叫号取药与电子叫号同步；高峰时段开启机动窗口，取药等待目标≤10分钟。', owner: '药学部', dueDays: 14 },
  payment_window: { code: 'IMP-PAY-01', title: '缴费渠道分流', action: '收费窗口与自助机/移动支付比例公示，高峰加开移动支付引导岗；床位结算、出院结算推行床边结算与线上结算。', owner: '财务处 + 信息科', dueDays: 14 },
  self_service_down: { code: 'IMP-PAY-02', title: '自助机运维巡检', action: '自助机每2小时巡检一次，故障15分钟内响应；关键节点（门诊大厅/住院部）至少保留2台可用机；屏幕旁贴二维码一键报障。', owner: '后勤 + 信息科', dueDays: 7 },
  mobile_pay_fail: { code: 'IMP-PAY-03', title: '移动支付稳定性治理', action: '排查支付接口在弱网/高峰下的失败重试逻辑；失败自动回退到桌面端并推送缴费成功状态；每周监控支付失败率（目标<0.5%）。', owner: '信息科 + 财务处', dueDays: 10 },
  receipt_dup: { code: 'IMP-PAY-04', title: '电子票据推广', action: '全面推行电子票据（微信/短信推送），财政电子票据与纸质票等效；自助打票机保留但引导电子化，杜绝重复排队。', owner: '财务处', dueDays: 21 },
  complaint_slow: { code: 'IMP-CMP-01', title: '投诉48小时响应红线', action: '投诉工单自动分派至责任科室负责人，48小时未响应升级至分管院长；开通24小时投诉热线与在线投诉入口，响应时长纳入月度考核。', owner: '客服中心 + 质控办', dueDays: 7 },
  no_feedback: { code: 'IMP-CMP-02', title: '投诉闭环回访', action: '投诉处理完成后72小时内由客服中心电话/微信回访，记录二次满意度；未达4分自动升级；回访记录与工单永久关联可追溯。', owner: '客服中心', dueDays: 7 },
  low_satisfaction: { code: 'IMP-CMP-03', title: '满意度根因复盘', action: '月度满意度<3分的工单由质控办牵头根因分析（鱼骨图），形成PDCA改进项并跟踪闭环；同类痛点30天内重复出现触发院长周会通报。', owner: '质控办', dueDays: 30 },
  unknown: { code: 'IMP-GEN-00', title: '通用体验回访', action: '由客服中心在3个工作日内联系患者，当面或电话了解具体场景，明确痛点后转对应维度改进流程。', owner: '客服中心', dueDays: 3 },
};

/* ------------------------------------------------------------------ */
/* 工具函数                                                              */
/* ------------------------------------------------------------------ */

function toText(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v == null) return '';
  return String(v).trim();
}

function toNum(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** patientId 脱敏：P0001234 → P0****34 */
export function maskPatientId(raw: string): string {
  const t = toText(raw);
  if (t.length <= 4) return t;
  return `${t.slice(0, 1)}0****${t.slice(-2)}`;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/* ------------------------------------------------------------------ */
/* 纯函数 1：buildDeepPatientExperience                                  */
/* ------------------------------------------------------------------ */

/**
 * 【质量与体验】深度患者体验目录（看板静态口径）。
 * 四大维度 × 子项 × 目标值，前端与 BFF 共用同一份口径。
 */
export function buildDeepPatientExperience(): DeepExperienceCatalog {
  return {
    dimensions: [
      {
        code: 'appointment',
        label: '预约体验',
        subItems: [
          { code: 'appt_channel', label: '预约渠道', target: '五端号源实时同步' },
          { code: 'appt_success', label: '预约成功率', target: '≥95%' },
          { code: 'appt_wait', label: '预约等待', target: '放号后5分钟内确认' },
        ],
      },
      {
        code: 'visit',
        label: '就诊体验',
        subItems: [
          { code: 'triage', label: '分诊', target: '≤5分钟' },
          { code: 'waiting', label: '候诊', target: '≤40分钟' },
          { code: 'consult', label: '接诊', target: '普通≥8分钟/专家≥15分钟' },
          { code: 'exam', label: '检查', target: '一站式预约、当日完成' },
          { code: 'pharmacy', label: '取药', target: '≤10分钟' },
        ],
      },
      {
        code: 'payment',
        label: '缴费体验',
        subItems: [
          { code: 'window', label: '窗口缴费', target: '高峰≤15分钟' },
          { code: 'self', label: '自助机', target: '可用率≥98%' },
          { code: 'mobile', label: '移动支付', target: '失败率<0.5%' },
          { code: 'receipt', label: '票据', target: '电子票为主、免重复排队' },
        ],
      },
      {
        code: 'complaint',
        label: '投诉体验',
        subItems: [
          { code: 'accept', label: '投诉受理', target: '48小时内响应' },
          { code: 'process', label: '投诉处理', target: '7日内闭环' },
          { code: 'feedback', label: '结果反馈', target: '72小时内回访' },
          { code: 'satisfaction', label: '满意度', target: '二次回访≥4分' },
        ],
      },
    ],
    scoreBand: [
      { min: 90, level: 'excellent', label: '卓越' },
      { min: 75, level: 'good', label: '良好' },
      { min: 60, level: 'fair', label: '一般' },
      { min: 0, level: 'poor', label: '待改进' },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数 2：measurePatientExperience                                     */
/* ------------------------------------------------------------------ */

/**
 * 【质量与体验】度量一次就诊旅程的患者体验。
 * 各维度独立打分（0-100），加权汇总为综合分；同时指出瓶颈维度。
 */
export function measurePatientExperience(patientId: unknown, journey: unknown): ExperienceMeasurement {
  const rawId = toText(patientId);
  if (!rawId) throw new Error('患者标识 patientId 不能为空');
  const j = (journey ?? {}) as PatientJourney;

  // ---- 预约体验（权重 20%）----
  const apptIssues: string[] = [];
  let apptScore = 100;
  if (j.appointmentSuccess === false) { apptScore -= 40; apptIssues.push('预约未成功'); }
  if (j.appointmentChannel === 'window') { apptScore -= 10; apptIssues.push('仅窗口预约'); }
  const apptWait = toNum(j.appointmentWaitMin);
  if (apptWait != null) {
    if (apptWait > 10) { apptScore -= Math.min(30, (apptWait - 10) * 3); apptIssues.push(`预约等待${apptWait}分钟`); }
  }

  // ---- 就诊体验（权重 40%）----
  const visitIssues: string[] = [];
  let visitScore = 100;
  const triage = toNum(j.triageMin);
  if (triage != null && triage > 5) { visitScore -= Math.min(15, (triage - 5) * 2); visitIssues.push(`分诊${triage}分钟`); }
  const wait = toNum(j.waitingMin);
  if (wait != null) {
    if (wait > 40) { visitScore -= Math.min(30, (wait - 40) * 0.8); visitIssues.push(`候诊${wait}分钟`); }
  }
  const consult = toNum(j.consultMin);
  if (consult != null) {
    if (consult < 5) { visitScore -= 25; visitIssues.push(`接诊仅${consult}分钟`); }
    else if (consult < 8) { visitScore -= 10; }
  }
  const exam = toNum(j.examCount);
  if (exam != null && exam > 2) { visitScore -= 10; visitIssues.push(`检查${exam}次、疑似碎片化`); }
  const pharm = toNum(j.pharmacyWaitMin);
  if (pharm != null && pharm > 10) { visitScore -= Math.min(15, (pharm - 10)); visitIssues.push(`取药${pharm}分钟`); }

  // ---- 缴费体验（权重 20%）----
  const payIssues: string[] = [];
  let payScore = 100;
  if (j.paymentChannel === 'window') { payScore -= 15; payIssues.push('窗口缴费'); }
  if (j.mobilePayFailed) { payScore -= 25; payIssues.push('移动支付失败'); }
  if (j.receiptRequeue) { payScore -= 10; payIssues.push('票据重复排队'); }

  // ---- 投诉体验（权重 20%）----
  const cmpIssues: string[] = [];
  let cmpScore = 100;
  const accept = toNum(j.complaintAcceptHours);
  if (accept != null && accept > 48) { cmpScore -= 30; cmpIssues.push(`投诉${accept}小时才受理`); }
  if (j.complaintReplied === false) { cmpScore -= 30; cmpIssues.push('投诉未反馈结果'); }
  const self = toNum(j.selfScore);
  if (self != null && self > 0 && self <= 5) {
    cmpScore -= (5 - self) * 12;
    if (self <= 3) cmpIssues.push(`自评分${self}/5`);
  }

  const dimensions: DimensionScore[] = [
    { dimension: 'appointment', label: '预约体验', score: clamp(apptScore), issues: apptIssues },
    { dimension: 'visit', label: '就诊体验', score: clamp(visitScore), issues: visitIssues },
    { dimension: 'payment', label: '缴费体验', score: clamp(payScore), issues: payIssues },
    { dimension: 'complaint', label: '投诉体验', score: clamp(cmpScore), issues: cmpIssues },
  ];

  const overall = clamp(
    dimensions[0].score * 0.2 + dimensions[1].score * 0.4 + dimensions[2].score * 0.2 + dimensions[3].score * 0.2,
  );

  // 瓶颈 = 得分最低的维度
  const bottleneck = dimensions.reduce((a, b) => (a.score <= b.score ? a : b)).dimension;

  const band = buildDeepPatientExperience().scoreBand.find((b) => overall >= b.min)!;
  const level = band.level as 'excellent' | 'good' | 'fair' | 'poor';

  return {
    patientId: maskPatientId(rawId),
    overallScore: overall,
    level,
    dimensions,
    bottleneck,
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数 3：identifyExperiencePainPoint                                  */
/* ------------------------------------------------------------------ */

/**
 * 【质量与体验】从患者反馈文本中识别痛点。
 * 多关键词命中时取命中数最多者；平手取首次出现者。
 */
export function identifyExperiencePainPoint(feedback: unknown): PainPoint {
  const text = toText(feedback);
  if (!text) throw new Error('患者反馈 feedback 不能为空');

  let best: PainPoint | null = null;
  let bestHits = 0;

  for (const p of PAIN_KEYWORDS) {
    const hits = p.keywords.filter((k) => text.includes(k));
    if (hits.length > bestHits) {
      bestHits = hits.length;
      best = { code: p.code, dimension: p.dimension, label: p.label, desc: p.label, hits };
    }
  }

  if (!best || bestHits === 0) {
    return { code: 'unknown', dimension: 'complaint', label: '待人工确认', desc: '未命中已知痛点关键词，需客服回访明确场景', hits: [] };
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* 纯函数 4：generateExperienceImprovement                                */
/* ------------------------------------------------------------------ */

/**
 * 【质量与体验】按痛点代码生成可执行改进措施。
 * 禁止只写"已处理"：必须给出动作、责任部门、整改时限。
 */
export function generateExperienceImprovement(painPoint: unknown): ImprovementAction {
  const code = toText(painPoint) as PainPointCode;
  if (!code) throw new Error('痛点代码 painPoint 不能为空');

  const entry = IMPROVEMENT_MAP[code];
  if (!entry) {
    const fallback = IMPROVEMENT_MAP.unknown;
    return {
      ...fallback,
      painPoint: 'unknown',
      dimension: 'complaint',
    };
  }

  // 反查维度
  const meta = PAIN_KEYWORDS.find((p) => p.code === code);
  return {
    ...entry,
    painPoint: code,
    dimension: meta?.dimension ?? 'complaint',
  };
}

/* ------------------------------------------------------------------ */
/* 落库：best-effort，断库不阻断                                          */
/* ------------------------------------------------------------------ */

/**
 * 【质量与体验】把一次体验度量结果回写到工单扩展字段。
 * 路由层显式调用；断库/表未迁移时静默降级。
 */
export async function persistExperienceMeasurement(
  ticketId: string,
  measurement: ExperienceMeasurement,
  pain: PainPoint,
  improvement: ImprovementAction,
): Promise<void> {
  try {
    const db = getDb();
    await db`
      UPDATE clinical.patient_service_ticket
         SET experience_dimension = ${measurement.bottleneck},
             pain_point_code      = ${pain.code},
             pain_point_desc      = ${pain.desc},
             improvement_code     = ${improvement.code},
             improvement_action   = ${improvement.action},
             improvement_owner    = ${improvement.owner},
             improvement_due_at   = now() + make_interval(days => ${improvement.dueDays}),
             experience_score     = ${measurement.overallScore}
       WHERE id::text = ${ticketId}
    `;
  } catch {
    // 断库 / 表未迁移：服务主流程不受影响，待重连后补写
  }
}
