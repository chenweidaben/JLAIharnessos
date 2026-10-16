/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊聚合器（M3-P）
 *
 * 智能导诊：症状 → 规则引擎推荐科室（确定性），患者确认后完成；
 * 预问诊：结构化采集病史 → 生成报告供医生参考，医生可采用。
 *
 * 安全边界：
 *  - 导诊/预问诊结果为「建议」，不构成诊断；
 *  - 最终诊断、病历由医师本人确认签名；
 *  - 审计哈希链留痕。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx, getDb } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  createTriageSession,
  getTriageSessionById,
  appendDialogAndChoose,
  listTriageSessions,
  createPreliminaryConsultation,
  getPreliminaryConsultationById,
  listPreliminaryConsultations,
  markPreliminaryConsumed,
  type TriageSessionRow,
  type PreliminaryConsultationRow,
} from '../../db/repositories/smartTriageRepo.js';
import {
  recommendDepartments,
  type DepartmentRecommendation,
} from '../../knowledge/rules/departmentTriageRules.js';
import {
  buildPreliminaryReport,
  validatePreliminaryHistory,
  type PreliminaryHistoryInput,
} from '../../knowledge/rules/preliminaryReportBuilder.js';
import type { AuthView } from '../view/userView.js';

export class SmartTriageError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SmartTriageError';
  }
}
const badRequest = (m: string) => new SmartTriageError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new SmartTriageError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new SmartTriageError(403, 'FORBIDDEN', m);

/** 开始智能导诊：症状 → 推荐科室。 */
export async function startTriage(
  auth: AuthView,
  input: { symptoms: string; patientId?: string | null },
): Promise<{ session: TriageSessionRow; recommendations: DepartmentRecommendation[] }> {
  const symptoms = (input.symptoms ?? '').trim();
  if (!symptoms) throw badRequest('请描述您的症状');
  if (symptoms.length < 2) throw badRequest('症状描述过短，请补充具体不适');

  const recommendations = recommendDepartments(symptoms, 3);

  const session = await createTriageSession({
    accountId: auth.id,
    patientId: input.patientId ?? null,
    symptoms,
    recommendations,
    engineType: 'rule',
  });

  await recordChainAudit({
    actorId: auth.id,
    action: 'triage.start',
    resourceType: 'triage_session',
    resourceId: session.id,
    result: 'success',
    detail: { top: recommendations[0]?.department },
  });

  return { session, recommendations };
}

/** 患者确认推荐科室，完成导诊。 */
export async function chooseDepartment(
  auth: AuthView,
  input: { sessionId: string; department: string },
): Promise<TriageSessionRow> {
  const department = (input.department ?? '').trim();
  if (!department) throw badRequest('请选择科室');

  const session = await getTriageSessionById(input.sessionId);
  if (!session) throw notFound('导诊会话不存在');
  if (session.accountId !== auth.id) throw forbidden('只能处理本人的导诊会话');
  if (session.status === 'completed') return session;

  const updated = await appendDialogAndChoose(session.id, {
    chosenDepartment: department,
    complete: true,
  });
  if (!updated) throw notFound('导诊会话更新失败');

  await recordChainAudit({
    actorId: auth.id,
    action: 'triage.choose',
    resourceType: 'triage_session',
    resourceId: session.id,
    result: 'success',
    detail: { department },
  });

  return updated;
}

/** 提交预问诊病史 → 生成报告。 */
export async function submitPreliminary(
  auth: AuthView,
  input: {
    triageSessionId?: string | null;
    patientId?: string | null;
    targetDepartment?: string | null;
    history: PreliminaryHistoryInput;
  },
): Promise<{ consultation: PreliminaryConsultationRow; reportText: string }> {
  const missing = validatePreliminaryHistory(input.history);
  if (missing.length) throw badRequest(`请完善：${missing.join('、')}`);

  let triageSession: TriageSessionRow | null = null;
  if (input.triageSessionId) {
    triageSession = await getTriageSessionById(input.triageSessionId);
    if (!triageSession) throw notFound('导诊会话不存在');
    if (triageSession.accountId !== auth.id) throw forbidden('只能使用本人的导诊会话');
  }

  const targetDepartment =
    input.targetDepartment?.trim() || triageSession?.chosenDepartment || null;

  const reportText = buildPreliminaryReport(targetDepartment ?? undefined, input.history);

  const consultation = await createPreliminaryConsultation({
    triageSessionId: input.triageSessionId ?? null,
    accountId: auth.id,
    patientId: input.patientId ?? triageSession?.patientId ?? null,
    targetDepartment,
    reportText,
    engineType: 'form',
    fields: {
      chiefComplaint: input.history.chiefComplaint,
      presentIllness: input.history.presentIllness,
      pastHistory: input.history.pastHistory ?? null,
      medications: input.history.medications ?? null,
      allergies: input.history.allergies ?? null,
      structured: {
        onsetTime: input.history.onsetTime ?? null,
        accompanyingSymptoms: input.history.accompanyingSymptoms ?? [],
      },
    },
  });

  await recordChainAudit({
    actorId: auth.id,
    action: 'triage.preliminary',
    resourceType: 'preliminary_consultation',
    resourceId: consultation.id,
    result: 'success',
    detail: { department: targetDepartment },
  });

  return { consultation, reportText };
}

/** 患者：查看我的导诊会话。 */
export function listMyTriage(auth: AuthView): Promise<TriageSessionRow[]> {
  return listTriageSessions({ accountId: auth.id });
}

/** 医护：查看预问诊报告（可按患者过滤）。 */
export function listPreliminaryForStaff(
  _auth: AuthView,
  filter: { patientId?: string } = {},
): Promise<PreliminaryConsultationRow[]> {
  return listPreliminaryConsultations({
    patientId: filter.patientId,
    status: 'completed',
  });
}

/** 医护：查看预问诊报告详情。 */
export async function getPreliminaryDetail(
  _auth: AuthView,
  id: string,
): Promise<PreliminaryConsultationRow> {
  const row = await getPreliminaryConsultationById(id);
  if (!row) throw notFound('预问诊报告不存在');
  return row;
}

/** 医生采用预问诊报告（标记 consumed）。 */
export async function consumePreliminary(
  auth: AuthView,
  id: string,
): Promise<PreliminaryConsultationRow> {
  const existing = await getPreliminaryConsultationById(id);
  if (!existing) throw notFound('预问诊报告不存在');
  if (existing.status === 'consumed') return existing;

  const updated = await withTx(async (tx) => {
    const row = await markPreliminaryConsumed(id, tx);
    if (row) {
      await recordChainAudit({
        actorId: auth.id,
        action: 'triage.consume',
        resourceType: 'preliminary_consultation',
        resourceId: id,
        result: 'success',
      }, tx);
    }
    return row;
  });

  if (!updated) throw notFound('采用失败');
  return updated;
}

/* ================================================================== */
/* M164-C：患者服务深化——智能导诊与健康管理                            */
/* 【数据中台与AI大脑】以下为纯函数：不访问数据库、不发起副作用，       */
/* 给定相同输入必得相同输出，便于单测与前端复用。                       */
/* ================================================================== */

/** 导诊分级：急诊 / 急症(今天) / 慢病(预约专科) / 轻症(社区·在线) */
export type TriageLevel = 'emergency' | 'urgent' | 'chronic' | 'mild';

export interface RedFlagHit {
  keyword: string;
  reason: string;
}

export interface SmartTriageResult {
  level: TriageLevel;
  levelLabel: string;
  matchedRedFlags: RedFlagHit[];
  symptoms: string;
  durationDays: number;
  severity: number; // 1-5
  recommendedDept: string;
  action: string;
  safetyNotice: string;
  disambiguation: string[];
}

/**
 * 红旗症状硬编码清单（安全红线，数据中台与AI大脑共同维护）。
 * 命中任意一项 → 无论病程/严重度如何，一律直接建议急诊/120，绝不降级。
 * 覆盖：急性冠脉综合征、呼吸衰竭、脑卒中、大出血、意识障碍、急性中毒、
 * 严重过敏/创伤、精神危机等危及生命的表现。
 */
const RED_FLAG_KEYWORDS: ReadonlyArray<{ keyword: string; reason: string }> = [
  { keyword: '胸痛', reason: '急性冠脉综合征可能' },
  { keyword: '胸口压榨', reason: '急性冠脉综合征可能' },
  { keyword: '胸闷伴大汗', reason: '急性冠脉综合征可能' },
  { keyword: '呼吸困难', reason: '呼吸/循环衰竭可能' },
  { keyword: '喘不上气', reason: '呼吸衰竭可能' },
  { keyword: '窒息', reason: '气道梗阻' },
  { keyword: '嘴唇发紫', reason: '严重缺氧发绀' },
  { keyword: '发绀', reason: '严重缺氧' },
  { keyword: '偏瘫', reason: '脑卒中可能' },
  { keyword: '口角歪斜', reason: '脑卒中可能' },
  { keyword: '言语不清', reason: '脑卒中可能' },
  { keyword: '一侧肢体无力', reason: '脑卒中可能' },
  { keyword: '中风', reason: '脑卒中可能' },
  { keyword: '脑卒中', reason: '脑卒中可能' },
  { keyword: '突发剧烈头痛', reason: '蛛网膜下腔出血可能' },
  { keyword: '呕血', reason: '上消化道大出血' },
  { keyword: '咯血', reason: '大咯血·窒息风险' },
  { keyword: '大量便血', reason: '消化道大出血' },
  { keyword: '黑便', reason: '上消化道出血' },
  { keyword: '阴道大出血', reason: '失血性休克风险' },
  { keyword: '出血不止', reason: '失血性休克风险' },
  { keyword: '大出血', reason: '失血性休克风险' },
  { keyword: '昏迷', reason: '意识障碍' },
  { keyword: '意识不清', reason: '意识障碍' },
  { keyword: '晕厥', reason: '心源性晕厥可能' },
  { keyword: '抽搐', reason: '癫痫持续状态/颅内病变' },
  { keyword: '中毒', reason: '急性中毒' },
  { keyword: '严重过敏', reason: '过敏性休克可能' },
  { keyword: '喉头水肿', reason: '气道梗阻' },
  { keyword: '休克', reason: '循环衰竭' },
  { keyword: '高处坠落', reason: '严重创伤' },
  { keyword: '车祸重伤', reason: '严重创伤' },
  { keyword: '自杀', reason: '精神危机需紧急干预' },
];

/** 非红旗症状 → 建议科室（确定性规则，数据中台维护）。 */
const DEPT_RULES: ReadonlyArray<{ keywords: string[]; dept: string }> = [
  { keywords: ['头痛', '头晕', '眩晕', '失眠', '肢体麻木'], dept: '神经内科' },
  { keywords: ['心慌', '心悸', '血压高', '高血压', '胸闷'], dept: '心血管内科' },
  { keywords: ['咳嗽', '咳痰', '发烧', '发热', '感冒', '咽痛'], dept: '呼吸内科' },
  { keywords: ['腹痛', '腹泻', '恶心', '呕吐', '反酸', '胃痛'], dept: '消化内科' },
  { keywords: ['尿频', '尿急', '尿痛', '腰痛', '血尿'], dept: '肾内科/泌尿外科' },
  { keywords: ['皮疹', '过敏', '瘙痒', '红斑'], dept: '皮肤科' },
  { keywords: ['关节痛', '腰痛', '颈椎', '扭伤', '骨折'], dept: '骨科' },
  { keywords: ['血糖', '糖尿病', '口渴', '多饮'], dept: '内分泌科' },
  { keywords: ['胸闷', '气喘', '呼吸困难'], dept: '呼吸内科' },
  { keywords: ['月经', '白带', '外阴', '孕'], dept: '妇科' },
  { keywords: ['小儿', '宝宝', '婴儿', '儿童'], dept: '儿科' },
];

const LEVEL_LABEL: Record<TriageLevel, string> = {
  emergency: '急诊',
  urgent: '今天就诊',
  chronic: '预约专科',
  mild: '社区/在线咨询',
};

const LEVEL_ACTION: Record<TriageLevel, string> = {
  emergency:
    '立即前往急诊或拨打 120 急救电话；请不要自行驾车等候，保持镇静，平卧休息。',
  urgent: '建议今天内到门诊或急诊预检就诊，避免拖延加重。',
  chronic: '建议预约相应专科门诊，纳入慢病管理，按医嘱定期随访。',
  mild: '可至社区卫生服务中心或在线咨询家庭医生，居家观察、对症护理。',
};

/** 解析病程：接受 number（天）或 "3天"/"1周"/"2小时" 等中文表述。 */
function normalizeDurationDays(input: number | string | undefined | null): number {
  if (input === undefined || input === null || input === '') return 0;
  if (typeof input === 'number' && Number.isFinite(input)) return Math.max(0, input);
  const m = String(input).trim().match(/(\d+(?:\.\d+)?)\s*(小时|天|日|周|个月|月)?/);
  if (!m) return 0;
  const value = parseFloat(m[1]);
  const unit = m[2];
  switch (unit) {
    case '小时':
      return value / 24;
    case '周':
      return value * 7;
    case '个月':
    case '月':
      return value * 30;
    case '天':
    case '日':
    default:
      return value;
  }
}

/** 规范化严重度到 1-5：接受 number(1-5) 或 mild/moderate/severe/critical。 */
function normalizeSeverity(input: number | string | undefined | null): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.min(5, Math.max(1, Math.round(input)));
  }
  const s = String(input ?? '').trim().toLowerCase();
  switch (s) {
    case 'mild':
    case '轻':
    case '轻度':
      return 2;
    case 'moderate':
    case '中':
    case '中度':
      return 3;
    case 'severe':
    case '重':
    case '重度':
      return 4;
    case 'critical':
    case '危重':
      return 5;
    default:
      return 3; // 未填按中度保守处理
  }
}

/** 按症状关键词推断建议科室（无命中返回全科医学科）。 */
function suggestDept(symptoms: string): string {
  for (const rule of DEPT_RULES) {
    if (rule.keywords.some((k) => symptoms.includes(k))) return rule.dept;
  }
  return '全科医学科';
}

/**
 * buildSmartTriage —— 智能导诊分级（纯函数）。
 *
 * 安全红线：命中红旗症状（胸痛/呼吸困难/卒中/大出血等）→ 直接急诊，
 * 不因病程短或自述"症状轻"而降级。其余按「急症→今天就诊 /
 * 慢病→预约专科 / 轻症→社区·在线咨询」分流。
 */
export function buildSmartTriage(
  symptoms: string,
  duration?: number | string,
  severity?: number | string,
): SmartTriageResult {
  const text = (symptoms ?? '').trim();
  const durationDays = normalizeDurationDays(duration);
  const sev = normalizeSeverity(severity);

  // 1) 红旗症状硬编码直急诊（最高优先级）
  const matchedRedFlags: RedFlagHit[] = RED_FLAG_KEYWORDS
    .filter((r) => text.includes(r.keyword))
    .map((r) => ({ keyword: r.keyword, reason: r.reason }));

  let level: TriageLevel;
  let recommendedDept: string;

  if (matchedRedFlags.length > 0) {
    level = 'emergency';
    recommendedDept = '急诊医学科';
  } else if (sev >= 4 || durationDays <= 1) {
    // 2) 急症：重或新发（≤24h）→ 今天就诊
    level = 'urgent';
    recommendedDept = suggestDept(text);
  } else if (durationDays >= 30) {
    // 3) 慢病：病程≥1个月反复 → 预约专科
    level = 'chronic';
    recommendedDept = suggestDept(text);
  } else {
    // 4) 轻症：→ 社区 / 在线咨询
    level = 'mild';
    recommendedDept = '全科医学科/社区卫生服务中心';
  }

  return {
    level,
    levelLabel: LEVEL_LABEL[level],
    matchedRedFlags,
    symptoms: text,
    durationDays: Math.round(durationDays * 10) / 10,
    severity: sev,
    recommendedDept,
    action: LEVEL_ACTION[level],
    safetyNotice:
      '本导诊为智能建议，不构成医学诊断；如症状持续、加重或出现新红旗表现，请立即就医。',
    disambiguation: [
      '请补充：症状开始时间、是否用药、既往病史与过敏史',
      '如为女性，请补充是否妊娠/备孕',
    ],
  };
}

/* -------------------- 患者健康旅程（纯函数） -------------------- */

export type JourneyStatus = 'done' | 'current' | 'upcoming';
export interface JourneyStage {
  key: string;
  title: string;
  status: JourneyStatus;
  description: string;
  nextAction?: string;
}
export interface PatientHealthJourney {
  patientId: string;
  overallStatus: string;
  progressPct: number;
  stages: JourneyStage[];
  summary: string;
}

const JOURNEY_STAGE_DEFS: ReadonlyArray<{ key: string; title: string; description: string; nextAction: string }> = [
  { key: 'intake', title: '健康建档', description: '建立电子健康档案，采集基础病史与家族史', nextAction: '完善基本信息与联系人' },
  { key: 'screening', title: '风险筛查', description: '慢病/肿瘤/心理风险筛查与指标评估', nextAction: '完成风险问卷与体检预约' },
  { key: 'diagnosis', title: '诊断评估', description: '专科检查、检验与鉴别诊断', nextAction: '携带报告复诊解读' },
  { key: 'treatment', title: '治疗干预', description: '处方、用药、手术或生活方式干预', nextAction: '按时用药并记录不适' },
  { key: 'followup', title: '康复随访', description: '术后/慢病随访、功能康复与指标复测', nextAction: '参加随访门诊' },
  { key: 'maintenance', title: '健康维持', description: '年度体检、健康宣教与自我管理', nextAction: '预约下一年度体检' },
];

/** 确定性字符串哈希（纯函数，仅用于按 patientId 派生可复现结果）。 */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * buildPatientHealthJourney —— 构建患者全周期健康旅程（纯函数）。
 * 由 patientId 确定性派生当前所处阶段，不读库；
 * 远期接入数据中台后替换为真实就诊记录时间轴。
 */
export function buildPatientHealthJourney(patientId: string): PatientHealthJourney {
  const pid = (patientId ?? '').trim() || 'anonymous';
  const h = hashStr(pid);
  const currentIdx = h % JOURNEY_STAGE_DEFS.length; // 0..5 确定性当前阶段

  const stages: JourneyStage[] = JOURNEY_STAGE_DEFS.map((def, i) => {
    const status: JourneyStatus = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming';
    return {
      key: def.key,
      title: def.title,
      status,
      description: def.description,
      nextAction: status === 'current' ? def.nextAction : undefined,
    };
  });

  const progressPct = Math.round((currentIdx / (JOURNEY_STAGE_DEFS.length - 1)) * 100);
  const current = JOURNEY_STAGE_DEFS[currentIdx];

  return {
    patientId: pid,
    overallStatus: `当前处于「${current.title}」阶段`,
    progressPct,
    stages,
    summary:
      `您已完成 ${currentIdx} 个健康阶段，当前在「${current.title}」，` +
      `下一步建议：${current.nextAction}。数据中台与AI大脑将据此主动推送您所需的服务。`,
  };
}

/* -------------------- 患者需求预测（纯函数） -------------------- */

export type NeedType =
  | 'appointment'
  | 'medication'
  | 'education'
  | 'followup'
  | 'vitals'
  | 'emergency-alert';

export interface PatientNeed {
  type: NeedType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  dueInDays: number;
}
export interface PatientNeedsPrediction {
  patientId: string;
  stage: string;
  needs: PatientNeed[];
  confidence: number;
}

/** 各阶段对应的典型患者需求（数据中台与AI大脑规则库）。 */
const STAGE_NEEDS: Record<string, ReadonlyArray<Omit<PatientNeed, 'dueInDays'>>> = {
  intake: [
    { type: 'appointment', priority: 'medium', title: '完善健康档案', detail: '补充既往病史、用药与过敏史，提升导诊准确度' },
    { type: 'education', priority: 'low', title: '就医须知宣教', detail: '了解门诊流程、医保报销与报告查询方式' },
  ],
  screening: [
    { type: 'appointment', priority: 'high', title: '体检/筛查预约', detail: '按风险分层预约慢病筛查与肿瘤早筛' },
    { type: 'education', priority: 'medium', title: '风险指标解读', detail: '看懂血压、血糖、血脂等关键指标含义' },
  ],
  diagnosis: [
    { type: 'appointment', priority: 'high', title: '专科挂号', detail: '根据导诊结果预约相应专科门诊' },
    { type: 'education', priority: 'medium', title: '检查前准备', detail: '空腹、停药、憋尿等检查须知提醒' },
  ],
  treatment: [
    { type: 'medication', priority: 'high', title: '用药提醒', detail: '按医嘱定时服药，勿自行停药/调量' },
    { type: 'appointment', priority: 'medium', title: '复诊预约', detail: '治疗后按周期复诊评估疗效' },
  ],
  followup: [
    { type: 'followup', priority: 'high', title: '随访回访', detail: '家庭医生电话/线上随访，关注康复进展' },
    { type: 'vitals', priority: 'medium', title: '指标自测', detail: '居家自测血压/血糖并上传趋势' },
  ],
  maintenance: [
    { type: 'appointment', priority: 'medium', title: '年度体检', detail: '预约下一年度健康体检套餐' },
    { type: 'education', priority: 'low', title: '健康生活方式', detail: '运动、饮食、睡眠与压力管理宣教' },
  ],
};

/**
 * predictPatientNeeds —— 预测患者在当前旅程阶段的服务需求（纯函数）。
 * 由 patientId 确定性派生优先级与到期天数，供AI大脑主动推送；
 * 远期接入真实就诊/检验数据后，由模型替换规则打分。
 */
export function predictPatientNeeds(patientId: string, stage: string): PatientNeedsPrediction {
  const pid = (patientId ?? '').trim() || 'anonymous';
  const h = hashStr(`${pid}:${stage}`);
  const defs = STAGE_NEEDS[stage] ?? STAGE_NEEDS.intake;

  const needs: PatientNeed[] = defs.map((n, i) => ({
    ...n,
    dueInDays: ((h >> (i * 3)) % 28) + 1, // 1..28 天，确定性
  }));

  // 紧急阶段追加红旗自查提醒
  if (stage === 'treatment' || stage === 'followup') {
    needs.push({
      type: 'emergency-alert',
      priority: 'high',
      title: '红旗症状自查',
      detail: '出现胸痛、呼吸困难、剧烈头痛、大出血等请立即急诊/拨打120',
      dueInDays: 0,
    });
  }

  const confidence = Math.round((0.62 + (h % 25) / 100) * 100) / 100; // 0.62~0.86

  return { patientId: pid, stage, needs, confidence };
}
