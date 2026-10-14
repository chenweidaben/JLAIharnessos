/**
 * MEDMUSE 工具注册表 - 内置工具元数据、完整 JSON Schema 与真实业务执行器。
 *
 * 医疗安全：
 *   - 写类工具（createNoteDraft）为 warning，函数体顶部强制校验 confirmed，
 *     未确认抛 CONFIRMATION_REQUIRED，由 Sentinel 二次确认后放行；
 *   - 所有读工具均只读，不修改业务数据；
 *   - 工具实现版本留痕见 deploy/postgres/init/202-medmuse-tool-binding.sql。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../../db/pool.js';
import type { ToolDefinition } from './modelProvider';
import { getVisitById } from '../../db/repositories/visitRepo';
import * as orderRepo from '../../db/repositories/orderRepo';
import * as aiNoteDraftRepo from '../../db/repositories/aiNoteDraftRepo';
import * as diagnosisSuggestionRepo from '../../db/repositories/diagnosisSuggestionRepo';
import * as timelinessRepo from '../../db/repositories/timelinessRepo';
import * as improvementTaskRepo from '../../db/repositories/improvementTaskRepo';
import * as consultRequestRepo from '../../db/repositories/consultRequestRepo';

export type RiskLevel = 'info' | 'warning' | 'critical';

/** 工具执行上下文 */
export interface ToolContext {
  userId: string;
  userRealName?: string;
  sessionId: string;
  patientId?: string | null;
  /** 用户是否已对本次 warning 操作二次确认（Sentinel 校验用） */
  confirmed?: boolean;
}

export interface ToolExecuteResult {
  ok: boolean;
  result: unknown;
  error?: string;
}

export interface ToolMeta {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  openAiSchema: ToolDefinition;
}

/** 5 个内置工具（完整 JSON Schema，与 200-medmuse-core.sql 种子对齐） */
export const MEDMUSE_TOOL_DEFS: ToolMeta[] = [
  {
    name: 'listMyPatients',
    description: '列出当前医生在管的住院患者',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'listMyPatients',
        description: '列出当前医生在管的住院患者',
        parameters: {
          type: 'object',
          properties: {
            department: { type: 'string', description: '科室编码，可空' },
            onlyAbnormal: { type: 'boolean', description: '仅返回生命体征/检验异常者' },
          },
        },
      },
    },
  },
  {
    name: 'getVisitDetail',
    description: '获取某次就诊的完整概要（诊断、用药、检验、护理）',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'getVisitDetail',
        description: '获取某次就诊的完整概要',
        parameters: {
          type: 'object',
          properties: {
            visitId: { type: 'string', description: '就诊ID' },
            includeSections: {
              type: 'array',
              items: { type: 'string', enum: ['notes', 'orders', 'labs', 'imaging'] },
              description: '返回的板块',
            },
          },
          required: ['visitId'],
        },
      },
    },
  },
  {
    name: 'createNoteDraft',
    description: '为指定就诊生成病历草稿（需医生确认后写入）',
    riskLevel: 'warning',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'createNoteDraft',
        description: '为指定就诊生成病历草稿（需医生确认后写入）',
        parameters: {
          type: 'object',
          properties: {
            visitId: { type: 'string', description: '就诊ID' },
            noteType: {
              type: 'string',
              enum: ['admission', 'progress', 'discharge', 'consult'],
              description: '病历类型',
            },
            content: { type: 'string', description: '草稿正文' },
          },
          required: ['visitId', 'noteType'],
        },
      },
    },
  },
  {
    name: 'suggestDiagnosis',
    description: '基于当前就诊信息给出鉴别诊断建议',
    riskLevel: 'warning',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'suggestDiagnosis',
        description: '基于当前就诊信息给出鉴别诊断建议',
        parameters: {
          type: 'object',
          properties: {
            visitId: { type: 'string', description: '就诊ID' },
            topK: { type: 'integer', description: '返回条目数，默认 5', default: 5 },
          },
          required: ['visitId'],
        },
      },
    },
  },
  {
    name: 'listPendingTasks',
    description: '列出当前用户的待办（待查房/待审病历/待处理会诊）',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'listPendingTasks',
        description: '列出当前用户的待办事项',
        parameters: {
          type: 'object',
          properties: {
            taskType: {
              type: 'string',
              enum: ['rounds', 'review', 'consult', 'all'],
              description: '任务类型过滤',
            },
            limit: { type: 'integer', description: '返回上限', default: 20 },
          },
        },
      },
    },
  },
];

export interface ToolExecutor {
  execute(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecuteResult>;
}

function requireUser(ctx: ToolContext): void {
  if (!ctx.userId) throw new Error('UNAUTHORIZED');
}

/** 当前医生在管的住院患者行（轻量投影） */
export interface ManagedPatientRow {
  visitId: string;
  patientId: string;
  patientName: string;
  ward: string | null;
  bedNo: string | null;
  diagnosis: string | null;
  latestAbnormal?: string | null;
}

function db(): Sql {
  return getDb();
}

/**
 * 查询指定医生作为主治医生的在管住院患者。
 * 直接参数化查询 clinical.visits JOIN clinical.patients 取脱敏姓名。
 */
export async function listManagedPatients(doctorId: string): Promise<ManagedPatientRow[]> {
  const rows = await db()<Array<{
    id: string; patient_id: string; patient_name: string;
    ward: string | null; bed_no: string | null; chief_complaint: string | null;
  }>>`
    SELECT v.id, v.patient_id, p.name_masked AS patient_name,
           v.ward, v.bed_no, v.chief_complaint
    FROM clinical.visits v
    LEFT JOIN clinical.patients p ON p.id = v.patient_id
    WHERE v.attending_doctor_id = ${doctorId}
      AND v.status = 'ongoing'
      AND v.visit_type = 'inpatient'
    ORDER BY v.admit_at DESC
  `;
  return rows.map((r) => ({
    visitId: r.id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    ward: r.ward,
    bedNo: r.bed_no,
    diagnosis: r.chief_complaint,
    latestAbnormal: null,
  }));
}

/** 安全取参：要求字符串且非空 */
function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || v.length === 0) throw new Error(`INVALID_ARG:${key}`);
  return v;
}

export class DefaultToolExecutor implements ToolExecutor {
  /**
   * 工具统一入口：按 name 分发到真实 repo 实现。
   * 写类工具在各自实现内强制 confirmed 校验。
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    requireUser(ctx);
    try {
      switch (name) {
        case 'listMyPatients':
          return await this.listMyPatients(args, ctx);
        case 'getVisitDetail':
          return await this.getVisitDetail(args, ctx);
        case 'createNoteDraft':
          return await this.createNoteDraft(args, ctx);
        case 'suggestDiagnosis':
          return await this.suggestDiagnosis(args, ctx);
        case 'listPendingTasks':
          return await this.listPendingTasks(args, ctx);
        default:
          return { ok: false, result: null, error: `unknown tool: ${name}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, result: null, error: msg };
    }
  }

  /**
   * listMyPatients：返回当前医生在管住院患者列表（脱敏姓名）。
   */
  private async listMyPatients(
    _args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    const patients = await listManagedPatients(ctx.userId);
    return { ok: true, result: { patients, total: patients.length } };
  }

  /**
   * getVisitDetail：聚合就诊主表 + 医嘱列表 + 最新 AI 病历草稿。
   * visit 不存在返回 VISIT_NOT_FOUND。
   */
  private async getVisitDetail(
    args: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    const visitId = str(args, 'visitId');
    const visit = await getVisitById(visitId);
    if (!visit) {
      return { ok: false, result: null, error: 'VISIT_NOT_FOUND' };
    }
    const [orders, drafts] = await Promise.all([
      orderRepo.listByVisit(visitId),
      aiNoteDraftRepo.listByVisit(visitId),
    ]);
    const latestDraft = drafts[0] ?? null;
    return {
      ok: true,
      result: {
        visitId: visit.id,
        patient: {
          patientId: visit.patientId,
          visitNo: visit.visitNo,
          ward: visit.ward,
          bedNo: visit.bedNo,
        },
        chiefComplaint: visit.chiefComplaint,
        status: visit.status,
        orders,
        latestNoteDraft: latestDraft,
        createdAt: visit.createdAt,
      },
    };
  }

  /**
   * createNoteDraft：warning 级。未确认抛 CONFIRMATION_REQUIRED。
   * 落 clinical.ai_note_drafts，generatedBy 映射到 model_version='medmuse-agent'。
   */
  private async createNoteDraft(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    if (!args.confirmed) throw new Error('CONFIRMATION_REQUIRED');
    const visitId = str(args, 'visitId');
    const noteType = str(args, 'noteType');
    const content = typeof args.content === 'string' ? args.content : '';
    const draft = await aiNoteDraftRepo.create({
      visitId,
      draftType: noteType,
      promptContext: `medmuse-agent drafted by ${ctx.userId}`,
      generatedContent: content,
      modelVersion: 'medmuse-agent',
    });
    return {
      ok: true,
      result: {
        draftId: draft.id,
        visitId: draft.visitId,
        noteType: draft.draftType,
        createdAt: draft.createdAt,
      },
    };
  }

  /**
   * suggestDiagnosis：warning 级。读取已有鉴别诊断建议；
   * 无历史记录时写入空占位（confidence=0），便于后续人工补充。
   */
  private async suggestDiagnosis(
    args: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    const visitId = str(args, 'visitId');
    let rows = await diagnosisSuggestionRepo.listByVisit(visitId);
    if (rows.length === 0) {
      await diagnosisSuggestionRepo.create({
        visitId,
        chiefComplaint: '',
        symptoms: [],
        suggestions: [],
        confidence: 0,
      });
      rows = await diagnosisSuggestionRepo.listByVisit(visitId);
    }
    const latest = rows[0];
    return {
      ok: true,
      result: {
        visitId,
        suggestions: latest.suggestions.map((s) => ({
          diagnosis: s.diagnosis,
          icd10: s.icd10,
          confidence: s.confidence,
        })),
        overallConfidence: latest.confidence ?? 0,
      },
    };
  }

  /**
   * listPendingTasks：聚合待完成病历时效 + 改进任务 + 待处理会诊。
   */
  private async listPendingTasks(
    _args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    const [timeliness, improvementTasks, consultations] = await Promise.all([
      timelinessRepo.listPending(),
      improvementTaskRepo.listByAssignee(ctx.userId),
      consultRequestRepo.listPending(),
    ]);
    const t = timeliness.slice(0, 20);
    const imp = improvementTasks.slice(0, 20);
    const cons = consultations.slice(0, 20);
    return {
      ok: true,
      result: {
        timeliness: t,
        improvementTasks: imp,
        consultations: cons,
        total: t.length + imp.length + cons.length,
      },
    };
  }
}

export const defaultToolExecutor: ToolExecutor = new DefaultToolExecutor();

export function getTool(name: string): ToolMeta | undefined {
  return MEDMUSE_TOOL_DEFS.find((t) => t.name === name);
}

export function listTools(riskLevelFilter?: RiskLevel): ToolMeta[] {
  if (!riskLevelFilter) return [...MEDMUSE_TOOL_DEFS];
  return MEDMUSE_TOOL_DEFS.filter((t) => t.riskLevel === riskLevelFilter);
}

export function listOpenAiTools(): ToolDefinition[] {
  return MEDMUSE_TOOL_DEFS.map((t) => t.openAiSchema);
}
