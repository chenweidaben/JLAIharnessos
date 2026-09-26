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
