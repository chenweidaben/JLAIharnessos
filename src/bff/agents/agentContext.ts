/**
 * 健澜科技 jlmedaios - MEDMUSE agent 学习上下文装配（依据宪法第三章）
 *
 * 依据宪法第三章（医疗数据安全与患者权益）：agent 每轮调用模型前，异步读取
 * 三路「自学习」数据并拼装为 system prompt 上下文——
 *   1. 医生偏好：medmuse.doctor_preference（doctorPreferenceAggregator 已沉淀）；
 *   2. 患者画像：medmuse.patient_learning_profile（patientProfileAggregator 已沉淀）；
 *   3. 科室知识：medmuse.dept_knowledge（deptKnowledgeAggregator 已沉淀）。
 *
 * 医疗安全 / 降级口径：
 *  - 三路读取各自独立 try/catch，任一断库 / 表未迁移 / 无记录时该路降级为空，
 *    不阻断、不污染主诊疗流程；
 *  - 患者数据只取已沉淀的脱敏标签，绝不在本层二次拉取原始临床数据；
 *  - agent 回答后由 recordAgentTurnFeedback 把本回合以 fire-and-forget 方式
 *    记入 medmuse.ai_feedback_log（222），写失败仅告警，绝不阻塞主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import {
  getStoredPreference,
  type DoctorPreference,
} from '../aggregators/doctorPreferenceAggregator';
import { buildAgentContext } from '../aggregators/agentContextAggregator';
import type { PatientProfile } from '../aggregators/patientProfileAggregator';
import type {
  DeptKnowledgeEntry,
  KnowledgeType,
} from '../aggregators/deptKnowledgeAggregator';
import { createCache } from '../utils/queryCache.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** getAgentContext 返回值 */
export interface AgentContextBundle {
  /** 拼装好、可直接拼到 system prompt 的学习上下文文本（空数据时为兜底文案） */
  contextText: string;
  /** 三路学习数据是否全部为空（观测冷启动场景用） */
  empty: boolean;
}

/** medmuse.patient_learning_profile 行（postgres.js 返回形态） */
interface PatientProfileRow {
  chronic_conditions: string[] | null;
  drug_reactions: string[] | null;
  preferred_treatment: string | null;
  recent_visits_summary: string | null;
  risk_flags: string[] | null;
  updated_at: string | Date;
}

/** medmuse.dept_knowledge 行（只取上下文渲染所需列） */
interface DeptKnowledgeRow {
  title: string | null;
  content: string | null;
  knowledge_type: string;
}

/* ------------------------------------------------------------------ */
/* 读取缓存：同一 doctor+patient 组合 30s 内不重复聚合                    */
/* ------------------------------------------------------------------ */

/**
 * 学习上下文读取缓存 TTL：30 秒。
 *
 * 学习快照（患者画像 / 医生偏好 / 科室知识）按学习节奏异步沉淀，
 * 30s 窗口内视为不变；同一会话内连续多轮 agent 调用直接复用上次
 * 聚合结果，避免三路重复打库。缓存的是已脱敏快照，不触碰患者直接标识符。
 */
const AGENT_CONTEXT_TTL_MS = 30_000;

/** 进程级读取缓存（闭包私有 Map，进程重启即回收） */
const agentContextCache = createCache<AgentContextBundle>(AGENT_CONTEXT_TTL_MS);

/**
 * 归一化缓存键：把可空入参 trim 后拼接，空值统一按空串处理。
 *
 * 去重主单元为「医生 + 患者」；科室编码一并折入键——同一 doctor+patient
 * 但切换科室时必须重聚合科室知识路，避免跨科室串味。
 *
 * @param doctorId 医生用户 ID（可空）
 * @param patientId 院内脱敏患者主键（可空）
 * @param deptCode 科室编码（可空）
 * @returns 稳定字符串键
 */
function contextCacheKey(
  doctorId: string | null | undefined,
  patientId: string | null | undefined,
  deptCode: string | null | undefined,
): string {
  const norm = (s: string | null | undefined): string => (s ?? '').trim();
  return `${norm(doctorId)}|${norm(patientId)}|${norm(deptCode)}`;
}

/**
 * 清空学习上下文读取缓存（学习数据手动重算沉淀后调用，强制下轮重聚合）。
 */
export function clearAgentContextCache(): void {
  agentContextCache.clear();
}

/* ------------------------------------------------------------------ */
/* 三路读取：各自降级为空，绝不抛错                                     */
/* ------------------------------------------------------------------ */

/**
 * 读取医生已沉淀偏好。
 *
 * 复用 doctorPreferenceAggregator.getStoredPreference——其内部已对断库 / 表未
 * 迁移做了 try/catch 降级（返回 null）；此处仅在 doctorId 为空时短路。
 */
async function safeStoredPreference(
  doctorId: string | null | undefined,
): Promise<DoctorPreference | null> {
  if (!doctorId || !doctorId.trim()) return null;
  try {
    return await getStoredPreference(doctorId.trim());
  } catch (e) {
    console.warn(
      '[agent-context] 医生偏好读取失败，降级为空:',
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * 读取患者已沉淀学习画像（medmuse.patient_learning_profile）。
 *
 * 只读不重建：画像由 patientProfileAggregator 按学习节奏异步刷新，
 * agent 侧直接读快照，避免每轮对话都对原始就诊 / 医嘱 / 检验做 N+1 重算。
 * 失败（断库 / 表未迁移 / 无记录）一律返回 null。
 */
async function safePatientProfile(
  patientId: string | null | undefined,
): Promise<PatientProfile | null> {
  if (!patientId || !patientId.trim()) return null;
  try {
    const rows = await getDb()<PatientProfileRow[]>`
      SELECT chronic_conditions, drug_reactions, preferred_treatment,
             recent_visits_summary, risk_flags, updated_at
      FROM medmuse.patient_learning_profile
      WHERE patient_id = ${patientId.trim()}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      patientId: patientId.trim(),
      chronicConditions: row.chronic_conditions ?? [],
      drugReactions: row.drug_reactions ?? [],
      preferredTreatment: row.preferred_treatment ?? '',
      recentVisitsSummary: row.recent_visits_summary ?? '',
      riskFlags: row.risk_flags ?? [],
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    };
  } catch (e) {
    console.warn(
      '[agent-context] 患者画像读取失败，降级为空:',
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * 读取科室沉淀知识（medmuse.dept_knowledge，三类合并按成功率取 TOP6）。
 *
 * 不走路由层 getDeptKnowledge——该入口带 dept_knowledge:view 权限断言，
 * 而 agent 引擎是系统内部装配、无 AuthView；此处为内部只读视图，
 * 沿用「断库降级空列表」口径。
 */
async function safeDeptKnowledge(
  deptCode: string | null | undefined,
): Promise<DeptKnowledgeEntry[]> {
  if (!deptCode || !deptCode.trim()) return [];
  try {
    const rows = await getDb()<DeptKnowledgeRow[]>`
      SELECT title, content, knowledge_type
      FROM medmuse.dept_knowledge
      WHERE dept_code = ${deptCode.trim()}
      ORDER BY success_rate DESC, usage_count DESC
      LIMIT 6
    `;
    return rows.map((r) => ({
      id: '',
      deptCode: deptCode.trim(),
      knowledgeType: (r.knowledge_type as KnowledgeType) ?? 'pathway',
      title: r.title ?? '',
      content: r.content ?? '',
      source: 'system',
      usageCount: 0,
      successRate: 0,
      updatedAt: '',
    }));
  } catch (e) {
    console.warn(
      '[agent-context] 科室知识读取失败，降级为空:',
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* getAgentContext：三路并发读取 + 拼装                                 */
/* ------------------------------------------------------------------ */

/**
 * getAgentContext：异步读取三路学习数据并拼装为 agent system prompt 上下文。
 *
 * 并发口径：三路读取 Promise.all 并发，任一失败降级为空（见 safe* 系列），
 *   整体绝不抛出——agent 编排层可直接 await 并拼到 system prompt。
 *
 * 脱敏（依据宪法第三章）：只读取已沉淀的脱敏快照，输出文本由
 *   buildAgentContext 保证不含患者直接标识符。
 *
 * 缓存口径：同一 doctor+patient（+deptCode）组合 30s 内直接复用上一次
 *   聚合结果（含冷启动兜底），不重复打库三路读取；学习数据重算沉淀后可
 *   调用 clearAgentContextCache() 强制失效。
 *
 * @param doctorId 医生用户 ID（可空；空则医生偏好路降级为空）
 * @param patientId 院内脱敏患者主键（可空；空则患者画像路降级为空）
 * @param deptCode 科室编码（可空；空则科室知识路降级为空）
 * @returns 上下文文本与是否冷启动标志
 */
export async function getAgentContext(
  doctorId: string | null | undefined,
  patientId: string | null | undefined,
  deptCode: string | null | undefined,
): Promise<AgentContextBundle> {
  const cacheKey = contextCacheKey(doctorId, patientId, deptCode);

  // 30s 内同一组合直接命中，跳过三路聚合
  const hit = agentContextCache.get(cacheKey);
  if (hit) return hit;

  const [pref, profile, knowledge] = await Promise.all([
    safeStoredPreference(doctorId),
    safePatientProfile(patientId),
    safeDeptKnowledge(deptCode),
  ]);

  const contextText = buildAgentContext(pref, profile, knowledge);
  const empty =
    pref === null && profile === null && knowledge.length === 0;
  const bundle: AgentContextBundle = { contextText, empty };

  // 写缓存失败绝不影响主流程（缓存仅为性能优化，旁路语义）
  try {
    agentContextCache.set(cacheKey, bundle);
  } catch (e) {
    console.warn('[agent-context] 学习上下文缓存写入失败（已忽略）:', e);
  }

  return bundle;
}

/* ------------------------------------------------------------------ */
/* agent 回合反馈：fire-and-forget 写 medmuse.ai_feedback_log（222）    */
/* ------------------------------------------------------------------ */

/** 自动反馈行的建议类型：独立成桶，绝不混入 diagnosis/drug/pathway 等临床类型 */
export const AUTO_FEEDBACK_SUGGESTION_TYPE = 'agent_turn';

/**
 * recordAgentTurnFeedback 入参（快照只放脱敏元信息，不放原文 / 患者标识）。
 */
export interface AgentTurnFeedbackInput {
  /** agent 角色码（medmuse_agents.role_code） */
  agentRole: string;
  /** 院内脱敏患者主键（可空） */
  patientId?: string | null;
  /** 脱敏后的上下文快照元信息（如 deptCode / contextLength / 是否冷启动） */
  contextSnapshot?: Record<string, unknown> | null;
}

/**
 * recordAgentTurnFeedback：agent 回答落库后，自动把本回合以 fire-and-forget
 * 方式记入 medmuse.ai_feedback_log（222），作为学习闭环的回合级样本。
 *
 * 口径（依据宪法第三章，不阻塞主流程）：
 *  - 不 await、不阻塞主诊疗链路；任何异常吞掉仅 console.warn；
 *  - suggestion_type 固定为 'agent_turn'，独立成桶——
 *    evolveWeights 只对现有权重表里的临床类型加权，自动行绝不污染
 *    diagnosis / drug / pathway 等临床建议的推荐权重；
 *  - doctor_decision 取 'modified'（三值中唯一半权、折算采纳率恰为 0.5
 *    的中性基线），modification_note 标注「auto: 非医生裁决」，
 *    避免被误读为真实的医生采纳 / 拒绝信号。
 */
export function recordAgentTurnFeedback(
  input: AgentTurnFeedbackInput,
): void {
  void (async () => {
    try {
      const snapshot = input.contextSnapshot ?? null;
      await getDb()`
        INSERT INTO medmuse.ai_feedback_log
          (agent_role, suggestion_type, patient_id, context_snapshot,
           doctor_decision, modification_note)
        VALUES (
          ${input.agentRole || null},
          ${AUTO_FEEDBACK_SUGGESTION_TYPE},
          ${input.patientId ?? null},
          ${snapshot == null ? null : JSON.stringify(snapshot)}::jsonb,
          'modified',
          'auto:agent_turn 基线样本（非医生裁决）'
        )
      `;
    } catch (e) {
      // fire-and-forget：反馈是旁路学习信号，绝不反向影响主流程
      console.warn(
        '[agent-context] agent 回合反馈落库失败（已忽略）:',
        e instanceof Error ? e.message : e,
      );
    }
  })();
}
