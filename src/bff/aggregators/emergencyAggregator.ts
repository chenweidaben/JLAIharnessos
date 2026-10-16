/**
 * 健澜科技 jlmedaios - 急诊核心事务聚合器（M1-B1）
 *
 * 编排急诊真实工作流：接诊 → 分诊分级 → 绿色通道 / 抢救 / 留观 → 转归。
 *  - 去 mock：全部读写经 Repository 真落 PostgreSQL；
 *  - DataScope：仅急诊医护（科室=急诊科）与全院范围管理员可访问；
 *  - 审计：每个关键动作写 audit.audit_logs 哈希链；
 *  - AI 仅辅助：规则引擎给确定性建议级别，AI 建议单独标注，最终分级由护士确认。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { withTx, type DbExecutor } from '@/db/pool.js';
import * as triageRepo from '@/db/repositories/triageRepo.js';
import * as gcRepo from '@/db/repositories/greenChannelRepo.js';
import * as resusRepo from '@/db/repositories/resuscitationRepo.js';
import * as obsRepo from '@/db/repositories/observationRepo.js';
import * as patientRepo from '@/db/repositories/patientRepo.js';
import * as userRepo from '@/db/repositories/userRepo.js';
import { recordChainAudit } from '@/db/repositories/auditChainRepo.js';
import {
  assessTriage,
  type Consciousness,
  type GcsComponents,
  type StrokeScaleInput,
  type TriageAssessment,
  type TriageLevel,
} from '@/emergency/scoring.js';
import {
  assertTransition,
  type EmergencyStatus,
} from '@/emergency/stateMachine.js';
import {
  listChannelTypes,
  type GreenChannelType,
} from '@/emergency/greenChannelTemplate.js';

/* ============================ 错误类型 ============================ */

export class EmergencyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmergencyValidationError';
  }
}
export class EmergencyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmergencyNotFoundError';
  }
}
export class EmergencyForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmergencyForbiddenError';
  }
}
export class EmergencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmergencyConflictError';
  }
}

/* ============================== Actor ============================= */

export interface EmergencyActor {
  userId: string;
  name: string;
  isAdmin: boolean;
  permissions: Set<string>;
  /** 最宽数据范围 */
  dataScope: 'self' | 'department' | 'hospital';
  /** 科室（user_roles.scope_value 或 users.department） */
  department: string | null;
}

/** 由登录用户加载急诊 Actor（含 DataScope） */
export async function loadActor(user: {
  id: string;
  name: string;
  roles: string[];
  permissions?: string[];
}): Promise<EmergencyActor> {
  const isAdmin = user.roles.includes('admin');
  const dbUser = await userRepo.getUserById(user.id);
  const links = await userRepo.getUserRoleLinks(user.id);

  // 取最宽数据范围
  let dataScope: EmergencyActor['dataScope'] = 'self';
  let scopeDept: string | null = null;
  for (const l of links) {
    if (l.dataScope === 'hospital') {
      dataScope = 'hospital';
      scopeDept = null;
    } else if (l.dataScope === 'department' && dataScope !== 'hospital') {
      dataScope = 'department';
      scopeDept = l.scopeValue ?? scopeDept;
    }
  }
  const department = scopeDept ?? dbUser?.department ?? null;

  return {
    userId: user.id,
    name: user.name,
    isAdmin,
    permissions: new Set(user.permissions ?? []),
    dataScope,
    department,
  };
}

/** 急诊 DataScope：全院范围 / admin / 急诊科人员，否则拒绝 */
function assertEmergencyDataScope(actor: EmergencyActor, permission: string): void {
  if (actor.isAdmin) return;
  if (!actor.permissions.has(permission)) {
    throw new EmergencyForbiddenError(`权限不足：需要 ${permission}`);
  }
  const inEmergencyDept = actor.department === '急诊科';
  if (actor.dataScope === 'hospital') return;
  if (actor.dataScope === 'department' && inEmergencyDept) return;
  throw new EmergencyForbiddenError('急诊数据范围受限：仅急诊科医护与全院范围管理员可访问');
}

/* ============================ 常量 ============================== */

/** 各级别响应时限（分钟）：I 立即 / II 10 / III 30 / IV 120 */
export const RESPONSE_MINUTES: Record<number, number> = { 1: 0, 2: 10, 3: 30, 4: 120 };

export const LEVEL_META: Record<number, { label: string; color: string }> = {
  1: { label: 'I级濒危', color: '#cf1322' },
  2: { label: 'II级危重', color: '#fa541c' },
  3: { label: 'III级急症', color: '#faad14' },
  4: { label: 'IV级非急症', color: '#52c41a' },
};

/* ============================ 队列 ============================== */

export interface QueueItem {
  visitId: string;
  patientId: string;
  triageNo: string;
  patientName: string;
  gender: string;
  age: string;
  chiefComplaint: string | null;
  arriveTime: string;
  triageTime: string | null;
  level: number | null;
  levelLabel: string | null;
  emStatus: EmergencyStatus;
  greenChannelActive: boolean;
  vitals: Record<string, unknown>;
  newsScore: number | null;
  gcsTotal: number | null;
  /** 已等待/已耗时（分钟） */
  waitMinutes: number;
  /** 响应截止时间 */
  deadline: string | null;
  /** 距响应截止剩余分钟（负为超时） */
  remainingMinutes: number | null;
  overdue: boolean;
}

/** 急诊分诊台队列（在急诊区内的全部患者） */
export async function getQueue(actor: EmergencyActor): Promise<QueueItem[]> {
  assertEmergencyDataScope(actor, 'emergency:view');
  const triages = await triageRepo.listTriage({ activeOnly: true });

  const patientIds = Array.from(new Set(triages.map((t) => t.patientId)));
  const patientMap = new Map<string, patientRepo.Patient>();
  for (const pid of patientIds) {
    const p = await patientRepo.getPatientById(pid);
    if (p) patientMap.set(pid, p);
  }

  const now = Date.now();
  return triages.map((t) => {
    const p = patientMap.get(t.patientId);
    const arriveMs = new Date(t.arriveTime).getTime();
    const waitMinutes = Math.max(0, Math.round((now - arriveMs) / 60000));

    let deadline: string | null = null;
    let remainingMinutes: number | null = null;
    let overdue = false;
    if (t.level != null && t.triageTime) {
      const resp = RESPONSE_MINUTES[t.level] ?? 0;
      const dl = new Date(t.triageTime).getTime() + resp * 60000;
      deadline = new Date(dl).toISOString();
      remainingMinutes = Math.round((dl - now) / 60000);
      overdue = now > dl;
    } else if (t.emStatus === 'waiting_triage') {
      // 未分诊患者应尽快处理；等待超 10 分钟即提示
      overdue = waitMinutes > 10;
    }

    return {
      visitId: t.visitId,
      patientId: t.patientId,
      triageNo: t.triageNo,
      patientName: p?.nameMasked ?? '未知',
      gender: p?.gender ?? '未知',
      age: p?.birthDate ? inferAge(p.birthDate) : '未知',
      chiefComplaint: t.chiefComplaint,
      arriveTime: t.arriveTime,
      triageTime: t.triageTime,
      level: t.level,
      levelLabel: t.level != null ? LEVEL_META[t.level]?.label ?? null : null,
      emStatus: t.emStatus,
      greenChannelActive: t.greenChannelActive,
      vitals: t.vitals,
      newsScore: t.newsScore,
      gcsTotal: t.gcsTotal,
      waitMinutes,
      deadline,
      remainingMinutes,
      overdue,
    };
  });
}

/* ============================ 接诊 ============================== */

/** 接诊：新患者/已有患者进入急诊，生成并发安全的分诊号 */
export async function arrive(
  actor: EmergencyActor,
  input: triageRepo.ArrivalInput,
): Promise<{ triage: triageRepo.EmergencyTriage }> {
  assertEmergencyDataScope(actor, 'emergency:triage');
  const result = await withTx(async (tx) => triageRepo.createArrival(input, tx));
  await audit(
    actor,
    'emergency.arrive',
    'emergency_triage',
    result.triage.id,
    { triageNo: result.triage.triageNo, visitId: result.visitId },
    result.patientId,
  );
  return { triage: result.triage };
}

/* ========================== 分诊分级 ============================ */

export interface TriageForm {
  vitals: {
    temperature?: number | null;
    pulse?: number | null;
    respiration?: number | null;
    systolic?: number | null;
    diastolic?: number | null;
    spo2?: number | null;
    consciousness?: Consciousness | null;
    painScore?: number | null;
    supplementalO2?: boolean | null;
  };
  gcs?: GcsComponents | null;
  stroke?: StrokeScaleInput | null;
  chiefComplaint?: string | null;
  cardiacArrest?: boolean | null;
  catastrophe?: boolean | null;
  /** 护士最终确认级别（可与建议不同） */
  level: TriageLevel;
  basis?: string;
  /** 可选 AI 建议（由 AI 辅助端点取得） */
  aiSuggestedLevel?: TriageLevel | null;
  aiAdvice?: Record<string, unknown> | null;
}

/** 分诊分级：计算客观评分，护士确认最终级别 */
export async function triage(
  actor: EmergencyActor,
  visitId: string,
  form: TriageForm,
): Promise<{ triage: triageRepo.EmergencyTriage; assessment: TriageAssessment }> {
  assertEmergencyDataScope(actor, 'emergency:triage');
  if (!form.level || form.level < 1 || form.level > 4) {
    throw new EmergencyValidationError('分诊级别必须为 I–IV（1–4）');
  }

  const assessmentInput = {
    vitals: form.vitals,
    gcs: form.gcs ?? null,
    stroke: form.stroke ?? null,
    chiefComplaint: form.chiefComplaint ?? null,
    cardiacArrest: form.cardiacArrest ?? null,
    catastrophe: form.catastrophe ?? null,
  };
  const assessment = assessTriage(assessmentInput);

  // 濒危/危重级别与客观建议严重背离时，要求护士填写依据（医疗安全）
  const basis = (form.basis ?? '').trim() || buildBasis(assessment);
  if (form.level > assessment.rule.level && assessment.rule.level <= 2 && !form.basis?.trim()) {
    throw new EmergencyValidationError(
      `客观评分提示 ${LEVEL_META[assessment.rule.level]?.label}，下调级别必须填写临床依据`,
    );
  }

  const result = await withTx(async (tx) =>
    triageRepo.completeTriage(
      visitId,
      {
        vitals: form.vitals as Record<string, unknown>,
        gcsEye: assessment.gcs?.eye ?? null,
        gcsVerbal: assessment.gcs?.verbal ?? null,
        gcsMotor: assessment.gcs?.motor ?? null,
        gcsTotal: assessment.gcs?.total ?? null,
        newsScore: assessment.news.score,
        strokeScale: {
          fast: assessment.fast,
          lams: assessment.lams,
        },
        level: form.level,
        ruleSuggestedLevel: assessment.rule.level,
        aiSuggestedLevel: form.aiSuggestedLevel ?? null,
        aiAdvice: form.aiAdvice ?? {},
        vitalScore: assessment.vitalScore,
        complaintScore: assessment.complaintScore,
        totalScore: assessment.totalScore,
        basis,
      },
      actor.userId,
      tx,
    ),
  );

  await audit(
    actor,
    'emergency.triage',
    'emergency_triage',
    result.id,
    {
      level: form.level,
      news: assessment.news.score,
      gcs: assessment.gcs?.total ?? null,
      ruleLevel: assessment.rule.level,
    },
    result.patientId,
  );

  return { triage: result, assessment };
}

/* ========================== AI 辅助建议 ========================== */

export interface AiTriageAdvice {
  source: 'deepseek' | 'rule_fallback';
  suggestedLevel: TriageLevel;
  advice: {
    immediate: string;
    workup: string;
    differential: string;
    risk: string;
  };
}

/** 从模型输出中提取 JSON（兼容 ```json 包裹） */
function extractJson(raw: string): string {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fence ? fence[1] : raw;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text.trim();
}

async function chatOnce(system: string, user: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('未配置 LLM_API_KEY');
  const baseURL = (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL ?? 'deepseek-chat';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS) || 45_000);
  if (timer.unref) timer.unref();
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        max_tokens: 1200,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`LLM ${response.status}`);
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI 分诊辅助建议。AI 不可用时回落到规则引擎（明确标注 source），
 * 绝不以 AI 结果直接定级。
 */
export async function aiTriageAdvice(
  actor: EmergencyActor,
  form: Omit<TriageForm, 'level'>,
): Promise<AiTriageAdvice> {
  assertEmergencyDataScope(actor, 'emergency:triage');
  const assessment = assessTriage({
    vitals: form.vitals,
    gcs: form.gcs ?? null,
    stroke: form.stroke ?? null,
    chiefComplaint: form.chiefComplaint ?? null,
    cardiacArrest: form.cardiacArrest ?? null,
    catastrophe: form.catastrophe ?? null,
  });

  const fallback: AiTriageAdvice = {
    source: 'rule_fallback',
    suggestedLevel: assessment.rule.level,
    advice: {
      immediate: assessment.rule.objectiveReasons.join('；') || '生命体征平稳，按常规急诊流程处理',
      workup: '结合主诉完善血常规、生化等基础检查',
      differential: form.chiefComplaint ?? '待评估',
      risk: assessment.news.risk === 'low' ? '低风险' : '需密切观察',
    },
  };

  try {
    const system = [
      '你是急诊科资深分诊专家。依据急诊预检分诊四级标准（I濒危/II危重/III急症/IV非急症），',
      '结合生命体征与主诉给出分诊建议。最终分级由护士决定，你仅提供建议。',
      '只输出 JSON 对象，键：level(1-4整数), immediate(即刻处置), workup(建议检查), differential(鉴别方向), risk(风险提示)。',
    ].join('');
    const user = JSON.stringify({
      主诉: form.chiefComplaint,
      生命体征: form.vitals,
      GCS: assessment.gcs?.total,
      NEWS2: assessment.news.score,
      FAST: assessment.fast.positive,
      LAMS: assessment.lams.total,
    });
    const raw = await chatOnce(system, user);
    const parsed = JSON.parse(extractJson(raw)) as {
      level?: number;
      immediate?: string;
      workup?: string;
      differential?: string;
      risk?: string;
    };
    const level = (Number(parsed.level) >= 1 && Number(parsed.level) <= 4
      ? Number(parsed.level)
      : assessment.rule.level) as TriageLevel;
    return {
      source: 'deepseek',
      suggestedLevel: level,
      advice: {
        immediate: String(parsed.immediate ?? fallback.advice.immediate),
        workup: String(parsed.workup ?? fallback.advice.workup),
        differential: String(parsed.differential ?? fallback.advice.differential),
        risk: String(parsed.risk ?? fallback.advice.risk),
      },
    };
  } catch {
    return fallback;
  }
}

/* ========================== 绿色通道 ============================ */

/** 启动绿色通道 */
export async function startGreenChannel(
  actor: EmergencyActor,
  visitId: string,
  input: { type: GreenChannelType; subtype?: string },
): Promise<{ channel: gcRepo.GreenChannel }> {
  assertEmergencyDataScope(actor, 'emergency:green_channel');
  const triage = await triageRepo.getTriageByVisit(visitId);
  if (!triage) throw new EmergencyNotFoundError('急诊患者不存在');
  if (triage.emStatus === 'waiting_triage') {
    throw new EmergencyConflictError('请先完成分诊分级，再启动绿色通道');
  }

  const channel = await withTx(async (tx) => {
    const created = await gcRepo.startChannel(
      {
        visitId,
        patientId: triage.patientId,
        type: input.type,
        subtype: input.subtype,
        arriveTime: triage.arriveTime,
      },
      tx,
    );
    await triageRepo.setGreenChannelFlag(visitId, true, tx);
    // 候诊患者启动通道即进入处置
    if (triage.emStatus === 'triaged') {
      assertTransition(triage.emStatus, 'in_treatment');
      await triageRepo.updateEmStatus(visitId, 'in_treatment', tx);
    }
    return created;
  });

  await audit(
    actor,
    'emergency.green_channel.start',
    'green_channels',
    channel.id,
    { type: input.type, subtype: channel.subtype },
    channel.patientId,
  );
  return { channel };
}

/** 记录绿色通道节点时间 */
export async function recordGreenChannelNode(
  actor: EmergencyActor,
  channelId: string,
  nodeKey: string,
  actualTime?: string,
): Promise<{ channel: gcRepo.GreenChannel }> {
  assertEmergencyDataScope(actor, 'emergency:green_channel');
  const channel = await gcRepo.recordNode(channelId, nodeKey, actualTime);
  await audit(
    actor,
    'emergency.green_channel.node',
    'green_channel_nodes',
    channelId,
    { nodeKey, actualTime: actualTime ?? new Date().toISOString() },
    channel.patientId,
  );
  return { channel };
}

/** 关闭绿色通道 */
export async function closeGreenChannel(
  actor: EmergencyActor,
  channelId: string,
  input: { outcome: string; qualityNote?: string | null },
): Promise<{ channel: gcRepo.GreenChannel }> {
  assertEmergencyDataScope(actor, 'emergency:green_channel');
  const existing = await gcRepo.getChannelById(channelId);
  if (!existing) throw new EmergencyNotFoundError('绿色通道不存在');

  const channel = await withTx(async (tx) => {
    const closed = await gcRepo.closeChannel(
      channelId,
      { outcome: input.outcome, qualityNote: input.qualityNote ?? null },
      tx,
    );
    // 若无其他活动通道，清除叠加标志
    const stillActive = await gcRepo.getActiveChannelByVisit(existing.visitId, tx);
    if (!stillActive) await triageRepo.setGreenChannelFlag(existing.visitId, false, tx);
    return closed;
  });

  await audit(
    actor,
    'emergency.green_channel.close',
    'green_channels',
    channelId,
    {
      status: channel.status,
      dct: channel.dctMinutes,
      dnt: channel.dntMinutes,
      dbn: channel.dbnMinutes,
    },
    channel.patientId,
  );
  return { channel };
}

/* ============================ 抢救 ============================== */

/** 启动抢救 */
export async function startResuscitation(
  actor: EmergencyActor,
  visitId: string,
  input: { bedNo?: string; diagnosis?: string },
): Promise<{ resuscitation: resusRepo.Resuscitation }> {
  assertEmergencyDataScope(actor, 'emergency:resuscitation');
  const triage = await triageRepo.getTriageByVisit(visitId);
  if (!triage) throw new EmergencyNotFoundError('急诊患者不存在');

  assertTransition(triage.emStatus, 'resuscitation');
  const resuscitation = await withTx(async (tx) => {
    const created = await resusRepo.startResuscitation(
      {
        visitId,
        patientId: triage.patientId,
        bedNo: input.bedNo ?? null,
        diagnosis: input.diagnosis ?? triage.chiefComplaint ?? null,
        leadDoctorId: actor.userId,
      },
      tx,
    );
    await triageRepo.updateEmStatus(visitId, 'resuscitation', tx);
    return created;
  });

  await audit(
    actor,
    'emergency.resuscitation.start',
    'resuscitations',
    resuscitation.id,
    { bedNo: input.bedNo ?? null, diagnosis: resuscitation.diagnosis },
    resuscitation.patientId,
  );
  return { resuscitation };
}

/**
 * 抢救事件录入边界类型：time 缺省时由服务端补当前时间，
 * operator 缺省取 Actor 姓名；落库后的 resusRepo.ResusEvent 仍保证 time 必填。
 */
export type ResusEventInput = Omit<resusRepo.ResusEvent, 'time' | 'operator'> & {
  time?: string;
  operator?: string;
};

/**
 * 抢救用药录入边界类型：time 缺省时由服务端补当前时间；
 * 落库后的 resusRepo.ResusMedication 仍保证 time 必填。
 */
export type ResusMedicationInput = Omit<resusRepo.ResusMedication, 'time'> & {
  time?: string;
};

/** 追加抢救事件 */
export async function addResusEvent(
  actor: EmergencyActor,
  resusId: string,
  event: ResusEventInput,
): Promise<{ resuscitation: resusRepo.Resuscitation }> {
  assertEmergencyDataScope(actor, 'emergency:resuscitation');
  const resuscitation = await resusRepo.appendEvent(resusId, {
    time: event.time ?? new Date().toISOString(),
    type: event.type,
    content: event.content,
    operator: event.operator ?? actor.name,
  });
  await audit(
    actor,
    'emergency.resuscitation.event',
    'resuscitations',
    resusId,
    event as unknown as Record<string, unknown>,
    resuscitation.patientId,
  );
  return { resuscitation };
}

/** 追加抢救用药 */
export async function addResusMedication(
  actor: EmergencyActor,
  resusId: string,
  med: ResusMedicationInput,
): Promise<{ resuscitation: resusRepo.Resuscitation }> {
  assertEmergencyDataScope(actor, 'emergency:resuscitation');
  const resuscitation = await resusRepo.appendMedication(resusId, {
    ...med,
    time: med.time ?? new Date().toISOString(),
  });
  await audit(
    actor,
    'emergency.resuscitation.medication',
    'resuscitations',
    resusId,
    med as unknown as Record<string, unknown>,
    resuscitation.patientId,
  );
  return { resuscitation };
}

/** 结束抢救 */
export async function completeResuscitation(
  actor: EmergencyActor,
  resusId: string,
  input: {
    status: 'stabilized' | 'transferred_icu' | 'deceased';
    outcome: string;
    summary?: string | null;
    /** 病情稳定后转入的主状态（默认 observation） */
    nextStatus?: EmergencyStatus;
  },
): Promise<{ resuscitation: resusRepo.Resuscitation }> {
  assertEmergencyDataScope(actor, 'emergency:resuscitation');
  const current = await resusRepo.getResuscitationById(resusId);
  if (!current) throw new EmergencyNotFoundError('抢救记录不存在');

  const targetMain: EmergencyStatus =
    input.status === 'deceased'
      ? 'deceased'
      : input.status === 'transferred_icu'
        ? 'transferred'
        : (input.nextStatus ?? 'observation');

  // 活动抢救对应主状态 resuscitation；断言 resuscitation → targetMain 合法
  assertTransition('resuscitation', targetMain);

  const resuscitation = await withTx(async (tx) => {
    const completed = await resusRepo.completeResuscitation(
      resusId,
      {
        status: input.status,
        outcome: input.outcome,
        summary: input.summary ?? null,
      },
      tx,
    );
    await triageRepo.updateEmStatus(current.visitId, targetMain, tx);
    await syncVisitStatus(current.visitId, targetMain, tx);
    return completed;
  });

  await audit(
    actor,
    'emergency.resuscitation.complete',
    'resuscitations',
    resusId,
    { status: input.status, targetMain, outcome: input.outcome },
    resuscitation.patientId,
  );
  return { resuscitation };
}

/* ============================ 留观 ============================== */

/** 开始留观 */
export async function startObservation(
  actor: EmergencyActor,
  visitId: string,
  input: {
    bedNo?: string;
    diagnosis?: string;
    nursingLevel?: string;
    expectedOutcome?: string;
    pendingTasks?: obsRepo.ObsTask[];
  },
): Promise<{ observation: obsRepo.Observation }> {
  assertEmergencyDataScope(actor, 'emergency:observation');
  const triage = await triageRepo.getTriageByVisit(visitId);
  if (!triage) throw new EmergencyNotFoundError('急诊患者不存在');

  assertTransition(triage.emStatus, 'observation');
  const observation = await withTx(async (tx) => {
    const created = await obsRepo.startObservation(
      {
        visitId,
        patientId: triage.patientId,
        bedNo: input.bedNo ?? null,
        diagnosis: input.diagnosis ?? triage.chiefComplaint ?? null,
        nursingLevel: input.nursingLevel ?? 'level2',
        pendingTasks: input.pendingTasks ?? [],
        expectedOutcome: input.expectedOutcome ?? null,
        vitals: triage.vitals,
      },
      tx,
    );
    await triageRepo.updateEmStatus(visitId, 'observation', tx);
    return created;
  });

  await audit(
    actor,
    'emergency.observation.start',
    'observations',
    observation.id,
    { bedNo: input.bedNo ?? null, nursingLevel: observation.nursingLevel },
    observation.patientId,
  );
  return { observation };
}

/** 更新留观 */
export async function updateObservation(
  actor: EmergencyActor,
  obsId: string,
  patch: {
    status?: obsRepo.ObsStatus;
    vitals?: Record<string, unknown>;
    ivStatus?: string;
    pendingTasks?: obsRepo.ObsTask[];
    nursingLevel?: string;
  },
): Promise<{ observation: obsRepo.Observation }> {
  assertEmergencyDataScope(actor, 'emergency:observation');
  const observation = await obsRepo.updateObservation(obsId, patch);
  await audit(
    actor,
    'emergency.observation.update',
    'observations',
    obsId,
    patch as Record<string, unknown>,
    observation.patientId,
  );
  return { observation };
}

/** 结束留观（入院/离院） */
export async function endObservation(
  actor: EmergencyActor,
  obsId: string,
  input: { status: 'discharged' | 'admitted' },
): Promise<{ observation: obsRepo.Observation }> {
  assertEmergencyDataScope(actor, 'emergency:observation');
  const current = await obsRepo.getObservationById(obsId);
  if (!current) throw new EmergencyNotFoundError('留观记录不存在');

  const targetMain: EmergencyStatus = input.status === 'admitted' ? 'admitted' : 'discharged';
  assertTransition('observation', targetMain);

  const observation = await withTx(async (tx) => {
    const ended = await obsRepo.endObservation(obsId, { status: input.status }, tx);
    await triageRepo.updateEmStatus(current.visitId, targetMain, tx);
    await syncVisitStatus(current.visitId, targetMain, tx);
    return ended;
  });

  await audit(
    actor,
    'emergency.observation.end',
    'observations',
    obsId,
    { status: input.status },
    observation.patientId,
  );
  return { observation };
}

/* ============================ 转归 ============================== */

/** 记录终末转归并同步就诊状态 */
export async function recordDisposition(
  actor: EmergencyActor,
  visitId: string,
  input: {
    disposition: triageRepo.DispositionCode;
    destination?: string | null;
    wardId?: string | null;
    bedId?: string | null;
    remark?: string | null;
  },
): Promise<{ disposition: triageRepo.Disposition }> {
  assertEmergencyDataScope(actor, 'emergency:disposition');
  const triage = await triageRepo.getTriageByVisit(visitId);
  if (!triage) throw new EmergencyNotFoundError('急诊患者不存在');

  const targetMain = mapDispositionToStatus(input.disposition);
  if (targetMain !== 'observation') {
    assertTransition(triage.emStatus, targetMain);
  }

  const disposition = await withTx(async (tx) => {
    const created = await triageRepo.createDisposition(
      visitId,
      {
        disposition: input.disposition,
        destination: input.destination ?? null,
        wardId: input.wardId ?? null,
        bedId: input.bedId ?? null,
        remark: input.remark ?? null,
      },
      actor.userId,
      tx,
    );
    await triageRepo.updateEmStatus(visitId, targetMain, tx);
    if (targetMain !== 'observation') await syncVisitStatus(visitId, targetMain, tx);
    return created;
  });

  await audit(
    actor,
    'emergency.disposition',
    'emergency_dispositions',
    disposition.id,
    { disposition: input.disposition, destination: input.destination },
    disposition.patientId,
  );
  return { disposition };
}

/* ============================ 统计 ============================== */

export interface EmergencyStats {
  activeCount: number;
  waitingCount: number;
  resusCount: number;
  obsCount: number;
  greenChannelCount: number;
  levelCounts: Record<number, number>;
  dispositionCounts: Record<string, number>;
}

/** 当日急诊统计 */
export async function getStats(actor: EmergencyActor): Promise<EmergencyStats> {
  assertEmergencyDataScope(actor, 'emergency:view');
  const active = await triageRepo.listTriage({ activeOnly: true });
  const channels = await gcRepo.listChannels({ activeOnly: true });
  const allDispositions = await triageRepo.listTriage({}); // 含终态
  const dispositionCounts: Record<string, number> = {};
  for (const t of allDispositions) {
    if (['admitted', 'transferred', 'discharged', 'deceased'].includes(t.emStatus)) {
      dispositionCounts[t.emStatus] = (dispositionCounts[t.emStatus] ?? 0) + 1;
    }
  }
  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const t of active) if (t.level != null) levelCounts[t.level] = (levelCounts[t.level] ?? 0) + 1;

  return {
    activeCount: active.length,
    waitingCount: active.filter((t) => t.emStatus === 'waiting_triage').length,
    resusCount: active.filter((t) => t.emStatus === 'resuscitation').length,
    obsCount: active.filter((t) => t.emStatus === 'observation').length,
    greenChannelCount: channels.length,
    levelCounts,
    dispositionCounts,
  };
}

/* ============================ 辅助 ============================== */

/** 写哈希链审计（适配 recordChainAudit，业务变更后调用） */
async function audit(
  actor: EmergencyActor,
  action: string,
  resourceType: string,
  resourceId: string | null,
  detail: Record<string, unknown>,
  patientRef?: string | null,
): Promise<void> {
  await recordChainAudit({
    actorId: actor.userId,
    actorName: actor.name,
    actorDept: actor.department,
    action,
    resourceType,
    resourceId,
    patientRef: patientRef ?? null,
    result: 'success',
    detail,
  });
}

function mapDispositionToStatus(code: triageRepo.DispositionCode): EmergencyStatus {
  switch (code) {
    case 'admitted':
      return 'admitted';
    case 'surgery':
      return 'transferred';
    case 'observation':
      return 'observation';
    case 'transferred':
      return 'transferred';
    case 'deceased':
      return 'deceased';
    case 'discharged':
    default:
      return 'discharged';
  }
}

/** 同步 visits.status（急诊终态 → discharged/transferred） */
async function syncVisitStatus(
  visitId: string,
  main: EmergencyStatus,
  tx: DbExecutor,
): Promise<void> {
  const visitStatus =
    main === 'discharged' || main === 'deceased'
      ? 'discharged'
      : main === 'admitted' || main === 'transferred'
        ? 'transferred'
        : null;
  if (!visitStatus) return;
  await tx`UPDATE clinical.visits SET status = ${visitStatus} WHERE id = ${visitId}`;
}

function buildBasis(assessment: TriageAssessment): string {
  const parts: string[] = [];
  parts.push(`NEWS2 ${assessment.news.score}（${assessment.news.risk}）`);
  if (assessment.gcs) parts.push(`GCS ${assessment.gcs.total}`);
  if (assessment.fast.positive) parts.push('FAST阳性');
  if (assessment.lams.total > 0) parts.push(`LAMS ${assessment.lams.total}`);
  if (assessment.rule.objectiveReasons.length) parts.push(assessment.rule.objectiveReasons.join('；'));
  return parts.join('；');
}

function inferAge(birthDate: string): string {
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return '未知';
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 ? `${age}岁` : '未知';
}

export { listChannelTypes };
// 向路由层再导出 Repository 命名空间（类型与查询复用）
export { triageRepo, gcRepo, resusRepo, obsRepo };


// ============================================================================
// M162-A 医院安全与应急管理「医院全场景」——纯函数预案/演练/评估
//
// 【应急预案要真能用，不能纸上谈兵】覆盖五类突发情景：
//   mass_casualty 批量伤员（交通事故/工伤）/ fire_evacuation 火灾疏散 /
//   power_outage 停电应急 / it_failure 信息系统故障 / outbreak 传染病暴发。
// 以下四个函数纯数据、无 I/O、无 DB，对非法输入安全降级：
//   buildEmergencyPlan / emergencyResponseChecklist /
//   scheduleEmergencyDrill / evaluateDrillResult。
// 与上方急诊临床（M1-B1）流程无关，仅同文件便于路由统一挂载。
// Copyright (c) 2026 杭州健澜科技有限公司
// ============================================================================

/** 指挥体系岗位与职责 */
export interface EmergencyCommandRole {
  role: string;
  duty: string;
}

/** 响应阶段：预警 → 启动 → 处置 → 恢复 */
export interface EmergencyPhaseStep {
  phase: string;
  goal: string;
  deadline: string;
}

/** 分阶段关键动作（可直接照做） */
export interface EmergencyActionStep {
  order: number;
  phase: string;
  action: string;
  owner: string;
  critical: boolean;
}

/** 物资/资源需求 */
export interface EmergencyResource {
  category: string;
  items: string[];
  qty?: string;
}

/** 对外通报链条 */
export interface EmergencyComm {
  target: string;
  channel: string;
  deadline: string;
}

/** 生成的应急预案骨架 */
export interface EmergencyPlan {
  scenario: string;
  scenarioName: string;
  matched: boolean;
  level: string;
  objectives: string[];
  command: EmergencyCommandRole[];
  phases: EmergencyPhaseStep[];
  actions: EmergencyActionStep[];
  resources: EmergencyResource[];
  communication: EmergencyComm[];
  drillFrequency: string;
  disclaimer: string;
}

/** 现场处置核对表条目 */
export interface EmergencyChecklistItem {
  order: number;
  phase: string;
  action: string;
  responsible: string;
  critical: boolean;
}

/** 演练排期结果 */
export interface EmergencyDrillSchedule {
  drillId: string;
  planId: string;
  scenario: string;
  scheduledDate: string;
  drillType: 'tabletop' | 'functional' | 'full_scale';
  expectedDurationMin: number;
  participants: string[];
  objectives: string[];
  remindAt: string;
  status: 'scheduled';
}

/** 演练实测指标（仅填本次有记录项） */
export interface EmergencyDrillMetrics {
  responseTimeSec?: number | null;
  arrivalTimeSec?: number | null;
  evacuationRate?: number | null;
  communicationSuccessRate?: number | null;
  equipmentReadyRate?: number | null;
  simulatedCasualties?: number | null;
  resolvedCount?: number | null;
  issuesFound?: number | null;
}

/** 演练评估结果 */
export interface EmergencyDrillEvaluation {
  drillId: string;
  score: number;
  grade: '优秀' | '合格' | '不合格';
  passed: boolean;
  breakdown: Record<string, number>;
  bottlenecks: string[];
  improvements: string[];
}

interface EmergencyPlanTemplate {
  scenarioName: string;
  level: string;
  objectives: string[];
  command: EmergencyCommandRole[];
  phases: EmergencyPhaseStep[];
  actions: EmergencyActionStep[];
  resources: EmergencyResource[];
  communication: EmergencyComm[];
  drillFrequency: string;
}

/** 情景键归一化：去空白、转小写 */
function normEmergencyScenario(s: string): string {
  return (typeof s === 'string' ? s : '').replace(/\s+/g, '').toLowerCase();
}

/** 内置预案库（演示/单测基线；生产期结合本院建筑布局与床位规模细化——远期深化） */
const EMERGENCY_PLAN_LIBRARY: Record<string, EmergencyPlanTemplate> = {
  mass_casualty: {
    scenarioName: '批量伤员（交通事故/工伤群伤）',
    level: 'Ⅱ级',
    objectives: [
      '5 分钟内启动批量伤员应急预案，开辟绿色通道',
      '按检伤分类（红/黄/绿/黑）快速分流，危重者优先',
      '30 分钟内完成首批伤员收治与床位/血源/手术台调度',
    ],
    command: [
      { role: '总指挥', duty: '分管医疗副院长，统一指挥与对外通报决策' },
      { role: '现场指挥', duty: '急诊科主任，负责检伤分区与分流' },
      { role: '医疗救治组', duty: '急诊/外科/麻醉ICU，分区施救' },
      { role: '血液与物资组', duty: '输血科/药房/设备科，保障血源与耗材' },
      { role: '联络转运组', duty: '医务处/120对接，协调转院与家属通知' },
    ],
    phases: [
      { phase: '预警接报', goal: '问清事件地点/伤员数/伤情，初步分级', deadline: '5 分钟内' },
      { phase: '预案启动', goal: '总指挥下令启动Ⅱ级响应，开放急诊全部通道', deadline: '10 分钟内' },
      { phase: '检伤分流', goal: '红区危重抢救/黄区留观/绿区轻伤处置', deadline: '伤员到院即刻' },
      { phase: '联动收治', goal: '调度床位、手术台、血源，必要时向上级医院转诊', deadline: '30 分钟内' },
      { phase: '恢复总结', goal: '清点伤员、补录病历、48 小时内复盘', deadline: '事件后 48 小时' },
    ],
    actions: [
      { order: 1, phase: '预警接报', action: '急诊科接 120/公安来电，记录地点、预计伤员数与主要伤情', owner: '急诊分诊护士', critical: true },
      { order: 2, phase: '预案启动', action: '立即报告值班医生与医务处，由总指挥宣布启动批量伤员预案', owner: '急诊值班医生', critical: true },
      { order: 3, phase: '预案启动', action: '广播启动绿色通道，暂停非急诊择期手术，腾空急诊与ICU床位', owner: '医务处', critical: true },
      { order: 4, phase: '检伤分流', action: '按 START 检伤法分区：红区/黄区/绿区/黑区', owner: '急诊高年资医师', critical: true },
      { order: 5, phase: '联动收治', action: '输血科备血、药房备急救药品、设备科调配监护与呼吸机', owner: '相应科室', critical: false },
      { order: 6, phase: '联动收治', action: '联络 120/兄弟医院，超出本院承载时成批转诊', owner: '联络转运组', critical: false },
      { order: 7, phase: '恢复总结', action: '逐一核对伤员去向，补记急诊病历，48 小时内开复盘会', owner: '医务处', critical: false },
    ],
    resources: [
      { category: '急救与检伤', items: ['检伤分类带', '急救箱', '颈托', '止血带', '氧气瓶'], qty: '按一次 20 人份' },
      { category: '床位与监护', items: ['平车', '监护仪', '呼吸机', '除颤仪'], qty: '急诊+ICU 至少 10 张腾空床位' },
      { category: '血液与药品', items: ['O 型悬浮红细胞', '平衡液', '止血药', '破伤风抗毒素'], qty: '输血科常备扩容至平日 3 倍' },
    ],
    communication: [
      { target: '院总值班/分管院长', channel: '内线+应急对讲', deadline: '接报后 5 分钟内' },
      { target: '120 急救中心', channel: '专线电话', deadline: '同步伤员预估数量' },
      { target: '属地卫生健康委', channel: '值班电话+书面', deadline: 'Ⅱ级响应后 1 小时内' },
      { target: '伤员家属', channel: '专门接待处登记通知', deadline: '伤员到院后即启动' },
    ],
    drillFrequency: '每半年一次批量伤员检伤分流实战演练',
  },
  fire_evacuation: {
    scenarioName: '火灾疏散',
    level: 'Ⅰ级',
    objectives: [
      '3 分钟内确认火情并报警，1 分钟内启动本院应急广播',
      '着火层及上层人员 6 分钟内疏散至安全集合点，危重患者优先转移',
      '确保灭火器/消火栓在初起火灾 3 分钟内投入使用',
    ],
    command: [
      { role: '总指挥', duty: '院长或值班院领导，决定全院疏散与对外报警' },
      { role: '灭火行动组', duty: '义务消防队，初起火灾扑救与切断气源电源' },
      { role: '疏散引导组', duty: '各楼层护士长/安全员，引导就近楼梯疏散' },
      { role: '患者转移组', duty: '医护+护工，危重患者平车/轮椅转移' },
      { role: '警戒联络组', duty: '保卫处，引导消防车进入、清点人数' },
    ],
    phases: [
      { phase: '发现报警', goal: '确认火情、按下手动报警按钮、拨打 119', deadline: '3 分钟内' },
      { phase: '初期扑救', goal: '就近灭火器/消火栓控制初起火灾，切断病区电/气', deadline: '3 分钟内' },
      { phase: '组织疏散', goal: '着火层及上层沿安全楼梯疏散，禁止乘电梯', deadline: '6 分钟内' },
      { phase: '清点接应', goal: '集合点清点在院人员与患者，接应消防车', deadline: '疏散后即刻' },
      { phase: '善后', goal: '排查复燃、安置患者、配合消防调查', deadline: '事件后 24 小时' },
    ],
    actions: [
      { order: 1, phase: '发现报警', action: '发现人按下手动火灾报警按钮并电话报消防控制室', owner: '最先发现员工', critical: true },
      { order: 2, phase: '发现报警', action: '消控室确认后拨打 119，讲清地址/着火层/有无被困人员', owner: '消控室值班员', critical: true },
      { order: 3, phase: '初期扑救', action: '义务消防队用就近灭火器扑救初起火灾，同时切断该层电源与供氧总阀', owner: '灭火行动组', critical: true },
      { order: 4, phase: '组织疏散', action: '启动应急广播，疏散引导组打开安全出口，指引低姿捂鼻走楼梯', owner: '疏散引导组', critical: true },
      { order: 5, phase: '组织疏散', action: '患者转移组按「先重后轻、先着火层后上层」用平车/轮椅转移危重患者', owner: '患者转移组', critical: true },
      { order: 6, phase: '组织疏散', action: '关闭防火门形成防火分隔，防止烟火蔓延', owner: '各层安全员', critical: false },
      { order: 7, phase: '清点接应', action: '在户外集合点按病区清点患者与员工，向保卫处报数', owner: '护士长', critical: true },
      { order: 8, phase: '善后', action: '专业消防队确认安全前任何人不得返回楼内', owner: '警戒联络组', critical: true },
    ],
    resources: [
      { category: '灭火器材', items: ['灭火器', '室内消火栓', '灭火毯', '消防应急照明'], qty: '按消防验收配置并月检' },
      { category: '疏散转运', items: ['平车', '轮椅', '疏散指示灯', '防烟面罩'], qty: '每病区常备' },
      { category: '通讯', items: ['应急对讲机', '手摇警报器', '扩音喇叭'], qty: '保卫处统一调配' },
    ],
    communication: [
      { target: '119', channel: '电话', deadline: '确认火情后立即' },
      { target: '全院在院人员', channel: '消防应急广播', deadline: '报警后 1 分钟内' },
      { target: '院领导/总值班', channel: '内线+对讲', deadline: '同步启动响应' },
    ],
    drillFrequency: '每季度一次楼层疏散演练，每年一次全院综合消防演练',
  },
  power_outage: {
    scenarioName: '停电应急',
    level: 'Ⅱ级',
    objectives: [
      '市电中断后 15 秒内应急发电机自启动，保障生命支持与手术室供电',
      'ICU/急诊/手术/产房等关键科室切换至 UPS 不中断供电',
      '30 分钟内恢复市电或切换备用电源并安抚在院患者',
    ],
    command: [
      { role: '总指挥', duty: '分管后勤副院长，决定切换备用电源与外部抢修' },
      { role: '动力保障组', duty: '总务/电工班，发电机切换与配电盘监护' },
      { role: '临床保障组', duty: 'ICU/手术/急诊护士长，监护与呼吸支持不中断' },
      { role: '信息保障组', duty: '信息科，保障 UPS 供电与核心业务不宕机' },
    ],
    phases: [
      { phase: '断电确认', goal: '判断是全停/局部停，启动应急照明', deadline: '1 分钟内' },
      { phase: '电源切换', goal: 'UPS 无缝承载 → 发电机自启动带关键负荷', deadline: '15 秒~5 分钟' },
      { phase: '临床守护', goal: '生命支持设备切换备用电源，医护床旁守护危重患者', deadline: '切换全程' },
      { phase: '抢修恢复', goal: '联系供电公司抢修，预计长时间停电时有序转诊高危患者', deadline: '30 分钟内' },
      { phase: '复电核查', goal: '逐科室确认设备正常，记录停电事件与影响', deadline: '复电后 2 小时' },
    ],
    actions: [
      { order: 1, phase: '断电确认', action: '电工班确认市电进线状态，开启走廊应急照明', owner: '电工班', critical: true },
      { order: 2, phase: '电源切换', action: '确认 UPS 自动承载 ICU/手术室/急诊/信息机房负荷', owner: '信息+动力组', critical: true },
      { order: 3, phase: '电源切换', action: '启动应急发电机，按优先级带关键科室负荷，避免并机冲击', owner: '动力保障组', critical: true },
      { order: 4, phase: '临床守护', action: '呼吸机/监护/输液泵切换备用电源，医护对拔管风险患者床旁守护', owner: 'ICU/手术护士长', critical: true },
      { order: 5, phase: '抢修恢复', action: '联系供电公司问明原因与恢复时间，超 2 小时启动高危患者转诊', owner: '总务科', critical: false },
      { order: 6, phase: '复电核查', action: '市电恢复后逐科核对设备参数，补录停电期间手工记录', owner: '各科室', critical: false },
    ],
    resources: [
      { category: '电源保障', items: ['应急柴油发电机', 'UPS 不间断电源', '双回路市电'], qty: '发电机满载≥8 小时' },
      { category: '照明与监测', items: ['应急照明灯', '手电', '手持监护仪', '简易呼吸器'], qty: '每病区/每手术间' },
    ],
    communication: [
      { target: '供电公司', channel: '抢修热线', deadline: '确认非本院故障后立即' },
      { target: '临床关键科室', channel: '对讲+内线', deadline: '切换同时' },
      { target: '在院患者', channel: '护士站口头安抚+告示', deadline: '持续' },
    ],
    drillFrequency: '每半年一次发电机切换与 ICU 不停电演练',
  },
  it_failure: {
    scenarioName: '信息系统故障（HIS/EMR/PACS 宕机）',
    level: 'Ⅱ级',
    objectives: [
      '5 分钟内判定故障范围，启动手工应急流程，门诊/住院不停诊',
      '核心数据在故障期间零丢失（操作留痕、事后补录）',
      '30 分钟内定位故障，4 小时内恢复或切换灾备',
    ],
    command: [
      { role: '总指挥', duty: '分管信息副院长，决定启动手工流程与对外通报' },
      { role: '故障处置组', duty: '信息科运维，数据库/网络/机房抢修' },
      { role: '业务应急组', duty: '门诊/住院/收费/药房护士长与主任，切换手工单' },
      { role: '数据保障组', duty: 'DBA，保障备份与恢复点目标（RPO≤15 分钟）' },
    ],
    phases: [
      { phase: '故障判定', goal: '确认是终端/网络/服务器/数据库哪一层，影响哪些科室', deadline: '5 分钟内' },
      { phase: '应急切换', goal: '启动手工纸质流程，启用应急处方/申请单/收据', deadline: '10 分钟内' },
      { phase: '抢修恢复', goal: '定位根因，必要时切换灾备或回滚最近备份', deadline: '30 分钟~4 小时' },
      { phase: '补录核对', goal: '系统恢复后集中补录故障期间手工单据，双人核对', deadline: '恢复后当日' },
      { phase: '复盘加固', goal: '输出故障报告，优化高可用与预案', deadline: '3 个工作日内' },
    ],
    actions: [
      { order: 1, phase: '故障判定', action: '信息科接报后 5 分钟内判定故障层级与影响面，报总值班', owner: '信息科值班', critical: true },
      { order: 2, phase: '应急切换', action: '门诊启用手工处方与挂号条，住院启用纸质医嘱单，收费开手工收据', owner: '业务应急组', critical: true },
      { order: 3, phase: '应急切换', action: '检验/放射改为手工登记申请，报告先口头/电话通知临床', owner: '医技科室', critical: false },
      { order: 4, phase: '抢修恢复', action: 'DBA 检查数据库主从状态，必要时切换灾备节点', owner: '数据保障组', critical: true },
      { order: 5, phase: '补录核对', action: '系统恢复后各科室集中补录手工单据，收费与药房双人核对金额', owner: '业务应急组', critical: true },
      { order: 6, phase: '复盘加固', action: '复盘故障时间线，更新 RTO/RPO 指标与值班联络表', owner: '信息科', critical: false },
    ],
    resources: [
      { category: '应急单据', items: ['应急处方笺', '手工住院医嘱单', '手工挂号/收据', '检验检查申请单'], qty: '门诊药房各备 1 周量' },
      { category: 'IT 高可用', items: ['数据库主从热备', '灾备机房', 'UPS+柴油发电', '离线最近备份'], qty: 'RPO≤15 分钟 / RTO≤4 小时' },
    ],
    communication: [
      { target: '全院临床/医技', channel: '应急通知群+广播', deadline: '判定故障后 5 分钟内' },
      { target: '系统集成商/运维', channel: '400+值班手机', deadline: '同步抢修' },
      { target: '就诊患者', channel: '导诊台告示+口头解释', deadline: '持续' },
    ],
    drillFrequency: '每半年一次 HIS 宕机手工流程切换演练',
  },
  outbreak: {
    scenarioName: '传染病暴发',
    level: 'Ⅰ级',
    objectives: [
      '10 分钟内启动预检分诊与发热门诊闭环，疑似病例单人单间隔离',
      '2 小时内完成网络直报与属地疾控通报，划定密接管理范围',
      '严防院内交叉感染，落实分级防护与环境终末消毒',
    ],
    command: [
      { role: '总指挥', duty: '院长，决定启动传染病应急响应与停诊/病区封闭' },
      { role: '医疗救治组', duty: '感染科/呼吸/急诊，病例诊断与隔离救治' },
      { role: '院感防控组', duty: '院感科，防护督导、密接追踪、终末消毒' },
      { role: '检验报告组', duty: '检验/微生物，核酸与病原快速检测' },
      { role: '保障联络组', duty: '后勤/护理部，防护物资调配与疾控对接' },
    ],
    phases: [
      { phase: '监测预警', goal: '发热门诊发现聚集/异常病例，立即采样上报', deadline: '发现即报' },
      { phase: '隔离管控', goal: '疑似病例单人单间，落实分级防护与闭环转运', deadline: '10 分钟内' },
      { phase: '报告流调', goal: '2 小时内网络直报，配合疾控开展密接流调', deadline: '2 小时内' },
      { phase: '区域管控', goal: '必要时封闭相关病区/楼栋，暂停非急诊探视', deadline: '疾控指导下' },
      { phase: '终末解除', goal: '环境终末消毒、密接解除医学观察后恢复常态', deadline: '疾控评估后' },
    ],
    actions: [
      { order: 1, phase: '监测预警', action: '发热门诊发现聚集性发热/异常肺炎，立即采样并报告院感科', owner: '发热门诊医生', critical: true },
      { order: 2, phase: '隔离管控', action: '疑似病例转入隔离病房单人单间，医护按二级以上防护', owner: '感染科', critical: true },
      { order: 3, phase: '隔离管控', action: '启用专用转运路线与电梯，避免与普通患者交叉', owner: '保卫+后勤', critical: false },
      { order: 4, phase: '报告流调', action: '法定传染病 2 小时内完成网络直报，同步电话报属地疾控', owner: '院感科', critical: true },
      { order: 5, phase: '报告流调', action: '配合疾控摸排密接，登记并落实医学观察', owner: '院感科+护理部', critical: true },
      { order: 6, phase: '区域管控', action: '按疾控意见封闭涉事区域、暂停探视，公示就诊安排', owner: '总指挥', critical: false },
      { order: 7, phase: '终末解除', action: '对隔离区域终末消毒，采样合格后解除管控', owner: '院感+后勤', critical: false },
    ],
    resources: [
      { category: '防护用品', items: ['N95 口罩', '防护服', '护目镜/面屏', '手卫生设施'], qty: '不少于 30 天用量' },
      { category: '隔离救治', items: ['负压/隔离病房', '专用转运车床', '空气消毒机'], qty: '按本院定点要求' },
      { category: '检测报告', items: ['核酸/抗原检测', '快速病原试剂', '网络直报账号'], qty: '24 小时可读' },
    ],
    communication: [
      { target: '属地疾控中心', channel: '网络直报+电话', deadline: '发现后 2 小时内' },
      { target: '卫生健康委', channel: '值班电话', deadline: '同步上报' },
      { target: '全院职工/患者', channel: '应急通知+公示', deadline: '持续' },
    ],
    drillFrequency: '每季度一次发热门诊闭环与穿脱防护用品演练',
  },
};

/** 情景别名：中英文别名均可命中 */
const EMERGENCY_SCENARIO_ALIASES: Record<string, string> = {
  mass_casualty: 'mass_casualty',
  casualty: 'mass_casualty',
  批量伤员: 'mass_casualty',
  群伤: 'mass_casualty',
  交通事故: 'mass_casualty',
  工伤: 'mass_casualty',
  fire_evacuation: 'fire_evacuation',
  fire: 'fire_evacuation',
  火灾: 'fire_evacuation',
  火灾疏散: 'fire_evacuation',
  疏散: 'fire_evacuation',
  power_outage: 'power_outage',
  outage: 'power_outage',
  停电: 'power_outage',
  断电: 'power_outage',
  it_failure: 'it_failure',
  system_failure: 'it_failure',
  信息系统故障: 'it_failure',
  系统故障: 'it_failure',
  outbreak: 'outbreak',
  传染病暴发: 'outbreak',
  疫情: 'outbreak',
  感染暴发: 'outbreak',
};

/**
 * M162-A 纯函数①：按情景生成「能直接照做」的应急预案骨架。
 * 命中内置库返回完整指挥/阶段/动作/物资/通报；未命中返回 matched=false 兜底骨架。
 */
export function buildEmergencyPlan(scenario: string): EmergencyPlan {
  const disclaimer =
    '本预案为系统依据内置基线生成的辅助骨架，落地须经医务处/保卫处/后勤会签，结合本院建筑布局与床位规模细化印发（医院全场景）。';
  const key = EMERGENCY_SCENARIO_ALIASES[normEmergencyScenario(scenario)];
  const tpl = key ? EMERGENCY_PLAN_LIBRARY[key] : undefined;

  if (!tpl) {
    return {
      scenario: typeof scenario === 'string' && scenario.trim() ? scenario.trim() : 'unknown',
      scenarioName: '未知情景',
      matched: false,
      level: 'Ⅲ级',
      objectives: [],
      command: [],
      phases: [],
      actions: [],
      resources: [],
      communication: [],
      drillFrequency: '按本院演练制度执行',
      disclaimer,
    };
  }

  return {
    scenario: key,
    scenarioName: tpl.scenarioName,
    matched: true,
    level: tpl.level,
    objectives: [...tpl.objectives],
    command: tpl.command.map((r) => ({ ...r })),
    phases: tpl.phases.map((p) => ({ ...p })),
    actions: tpl.actions.map((a) => ({ ...a })),
    resources: tpl.resources.map((r) => ({ category: r.category, items: [...r.items], qty: r.qty })),
    communication: tpl.communication.map((c) => ({ ...c })),
    drillFrequency: tpl.drillFrequency,
    disclaimer,
  };
}

/**
 * M162-A 纯函数②：现场处置逐条核对表（关键项 critical=true，现场可逐条打勾）。
 */
export function emergencyResponseChecklist(scenario: string): EmergencyChecklistItem[] {
  const key = EMERGENCY_SCENARIO_ALIASES[normEmergencyScenario(scenario)];
  const tpl = key ? EMERGENCY_PLAN_LIBRARY[key] : undefined;
  if (!tpl) return [];
  return tpl.actions.map((a) => ({
    order: a.order,
    phase: a.phase,
    action: a.action,
    responsible: a.owner,
    critical: a.critical,
  }));
}

/** 安全解析日期 */
function parseEmergencyDate(input: string | Date | null | undefined): Date | null {
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : null;
  if (typeof input !== 'string' || !input.trim()) return null;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** 生成业务演练编号 DRILL-YYYYMMDD-xxxx */
function makeEmergencyDrillId(date: Date, planId: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const suffix = (planId || 'PLAN').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'PLAN';
  return `DRILL-${y}${m}${d}-${suffix}`;
}

/** 各情景默认演练形式/时长/参演部门/目标 */
const EMERGENCY_DRILL_PROFILE: Record<
  string,
  { drillType: EmergencyDrillSchedule['drillType']; durationMin: number; participants: string[]; objectives: string[] }
> = {
  mass_casualty: { drillType: 'functional', durationMin: 90, participants: ['急诊科', '外科', 'ICU', '输血科', '医务处'], objectives: ['检伤分类正确率', '绿色通道开通时长', '批量血源与床位调度'] },
  fire_evacuation: { drillType: 'full_scale', durationMin: 45, participants: ['保卫处', '护理部', '后勤保障处', '义务消防队', '各临床科室'], objectives: ['着火层疏散时长', '危重患者转移', '初期灭火器使用'] },
  power_outage: { drillType: 'functional', durationMin: 60, participants: ['总务科', '电工班', 'ICU', '手术室', '信息科'], objectives: ['发电机切换时长', 'UPS 无缝承载', '临床生命支持不中断'] },
  it_failure: { drillType: 'tabletop', durationMin: 120, participants: ['信息科', '门诊办', '住院处', '收费处', '药剂科'], objectives: ['手工流程切换时长', '补录数据零差错', '灾备切换 RTO'] },
  outbreak: { drillType: 'functional', durationMin: 60, participants: ['发热门诊', '院感科', '检验科', '护理部', '预防保健科'], objectives: ['隔离启动时长', '2 小时直报合规', '防护穿脱规范'] },
};

/**
 * M162-A 纯函数③：排定一次演练。date 为空/非法默认今天+30 天；remindAt 固定演练前 3 天。
 * planId 仅回传留痕，并据此推断情景。
 */
export function scheduleEmergencyDrill(planId: string, date: string | Date): EmergencyDrillSchedule {
  const safePlanId = typeof planId === 'string' && planId.trim() ? planId.trim() : 'PLAN-UNKNOWN';
  let d = parseEmergencyDate(date);
  if (!d) {
    d = new Date();
    d.setDate(d.getDate() + 30);
  }
  const lower = safePlanId.toLowerCase();
  let scenario = 'mass_casualty';
  for (const key of Object.keys(EMERGENCY_DRILL_PROFILE)) {
    if (lower.includes(key)) { scenario = key; break; }
  }
  const profile = EMERGENCY_DRILL_PROFILE[scenario];
  const remind = new Date(d);
  remind.setDate(remind.getDate() - 3);

  return {
    drillId: makeEmergencyDrillId(d, safePlanId),
    planId: safePlanId,
    scenario,
    scheduledDate: d.toISOString(),
    drillType: profile.drillType,
    expectedDurationMin: profile.durationMin,
    participants: [...profile.participants],
    objectives: [...profile.objectives],
    remindAt: remind.toISOString(),
    status: 'scheduled',
  };
}

/** 限幅到 0~100 */
function clampScore100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * M162-A 纯函数④：演练实测指标加权打分定级。
 * 权重：响应时长 0.20(目标≤120s) / 到达时长 0.15(目标≤180s) / 疏散率 0.25 /
 * 通讯成功率 0.20 / 设备完好率 0.20。<70 列为瓶颈并给整改建议。
 */
export function evaluateDrillResult(drillId: string, metrics: EmergencyDrillMetrics): EmergencyDrillEvaluation {
  const m = metrics ?? {};
  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const rt = num(m.responseTimeSec);
  const at = num(m.arrivalTimeSec);
  const ev = num(m.evacuationRate);
  const cs = num(m.communicationSuccessRate);
  const eq = num(m.equipmentReadyRate);

  const breakdown: Record<string, number> = {};
  if (rt != null) breakdown.responseTime = clampScore100((120 / Math.max(rt, 1)) * 100);
  if (at != null) breakdown.arrivalTime = clampScore100((180 / Math.max(at, 1)) * 100);
  if (ev != null) breakdown.evacuationRate = clampScore100(ev);
  if (cs != null) breakdown.communication = clampScore100(cs);
  if (eq != null) breakdown.equipmentReady = clampScore100(eq);

  const WEIGHTS: Record<string, number> = {
    responseTime: 0.2,
    arrivalTime: 0.15,
    evacuationRate: 0.25,
    communication: 0.2,
    equipmentReady: 0.2,
  };

  let weighted = 0;
  let weightSum = 0;
  for (const [k, score] of Object.entries(breakdown)) {
    weighted += score * WEIGHTS[k];
    weightSum += WEIGHTS[k];
  }
  const score = weightSum > 0 ? Math.round(weighted / weightSum) : 0;
  const grade: EmergencyDrillEvaluation['grade'] = score >= 90 ? '优秀' : score >= 70 ? '合格' : '不合格';

  const bottlenecks: string[] = [];
  const improvements: string[] = [];
  const DIM_LABEL: Record<string, string> = {
    responseTime: '接报启动响应时长',
    arrivalTime: '救援力量到达现场时长',
    evacuationRate: '人员疏散率',
    communication: '关键指令通讯成功率',
    equipmentReady: '应急设备完好率',
  };
  const FIX: Record<string, string> = {
    responseTime: '优化值班呼叫链与一键启动广播，缩短接报到指挥启动时间',
    arrivalTime: '按楼层/分区预置救援力量与器材点位，减少到场距离',
    evacuationRate: '复核疏散路线与集合点，对卧床患者预设转移路线与陪人',
    communication: '检修应急对讲与广播，开展口令与频次训练',
    equipmentReady: '落实灭火器/UPS/应急灯月度点检与标签化管理',
  };
  for (const [k, s] of Object.entries(breakdown)) {
    if (s < 70) {
      bottlenecks.push(`${DIM_LABEL[k]}（${s} 分，<70 未达标）`);
      improvements.push(FIX[k]);
    }
  }
  const issues = num(m.issuesFound);
  if (issues != null && issues > 0) {
    improvements.push(`本次演练暴露 ${issues} 个问题，须逐项落实责任科室与整改期限并复查闭环`);
  }

  const safeDrillId = typeof drillId === 'string' && drillId.trim() ? drillId.trim() : 'DRILL-UNKNOWN';
  return {
    drillId: safeDrillId,
    score,
    grade,
    passed: grade !== '不合格',
    breakdown,
    bottlenecks,
    improvements,
  };
}
