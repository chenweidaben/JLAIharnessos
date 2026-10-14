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
import * as nursingRecordRepo from '../../db/repositories/nursingRecordRepo';
import * as pharmacyTaskRepo from '../../db/repositories/pharmacyTaskRepo';
import * as prescriptionRepo from '../../db/repositories/prescriptionRepo';
import * as drgRepo from '../../db/repositories/drgRepo';
import * as dipRepo from '../../db/repositories/dipRepo';

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
  {
    name: 'listPendingOrders',
    description: '列出护士所在科室病区待执行的医嘱',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'listPendingOrders',
        description: '列出当前护士待执行的医嘱',
        parameters: {
          type: 'object',
          properties: {
            wardId: { type: 'string', description: '病区ID，可空，默认当前护士科室' },
          },
        },
      },
    },
  },
  {
    name: 'createNursingNote',
    description: '为指定就诊生成护理记录草稿（需责任护士确认后写入）',
    riskLevel: 'warning',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'createNursingNote',
        description: '为指定就诊生成护理记录草稿（需责任护士确认后写入）',
        parameters: {
          type: 'object',
          properties: {
            visitId: { type: 'string', description: '就诊ID' },
            content: { type: 'string', description: '护理记录草稿正文' },
          },
          required: ['visitId', 'content'],
        },
      },
    },
  },
  {
    name: 'getPendingPrescriptions',
    description: '列出待药师前置审核的处方',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'getPendingPrescriptions',
        description: '列出待药师前置审核的处方队列',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'integer', description: '返回上限，默认 20', default: 20 },
          },
        },
      },
    },
  },
  {
    name: 'reviewPrescription',
    description: '药师审核处方（approve/reject），需执业药师本人二次确认',
    riskLevel: 'warning',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'reviewPrescription',
        description: '药师审核处方，执行前先做配伍禁忌检查，最终决定需二次确认',
        parameters: {
          type: 'object',
          properties: {
            prescriptionId: { type: 'string', description: '处方ID' },
            decision: {
              type: 'string',
              enum: ['approve', 'reject'],
              description: '审核结论',
            },
            comment: { type: 'string', description: '审核意见，可空' },
          },
          required: ['prescriptionId', 'decision'],
        },
      },
    },
  },
  {
    name: 'listOverbudgetCases',
    description: '列出 DRG 已结算超支病例，并聚合 DIP 月度点值（医保办只读）',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'listOverbudgetCases',
        description: '列出实际费用 > DRG 支付标准的超支病例，同时返回 DIP 最新点值',
        parameters: {
          type: 'object',
          properties: {
            deptName: { type: 'string', description: '科室名过滤，可空' },
            limit: { type: 'integer', description: '返回上限，默认 30', default: 30 },
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
        case 'listPendingOrders':
          return await this.listPendingOrders(args, ctx);
        case 'createNursingNote':
          return await this.createNursingNote(args, ctx);
        case 'getPendingPrescriptions':
          return await this.getPendingPrescriptions(args, ctx);
        case 'reviewPrescription':
          return await this.reviewPrescription(args, ctx);
        case 'listOverbudgetCases':
          return await this.listOverbudgetCases(args, ctx);
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

  /**
   * listPendingOrders（护士，info）：列出当前护士所在科室待执行医嘱。
   * 说明：iam.users 无 ward_id 列，故按护士 department 关联 visits.department；
   * orders.status='active' 即待执行（DB 无 'pending' 状态）。
   */
  private async listPendingOrders(
    _args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    const rows = await db()<Array<{
      id: string; visit_id: string; patient_name: string;
      content: string; created_at: string; priority: string;
    }>>`
      SELECT o.id, o.visit_id, p.name_masked AS patient_name,
             o.content, o.created_at, o.priority
      FROM clinical.orders o
      JOIN clinical.visits v ON o.visit_id = v.id
      LEFT JOIN clinical.patients p ON p.id = v.patient_id
      WHERE o.status = 'active'
        AND v.status = 'ongoing'
        AND v.department = (SELECT department FROM iam.users WHERE id = ${ctx.userId})
      ORDER BY CASE o.priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
               o.created_at ASC
      LIMIT 50
    `;
    const orders = rows.map((r) => ({
      orderId: r.id,
      visitId: r.visit_id,
      patientName: r.patient_name,
      content: r.content,
      orderedAt: r.created_at,
      priority: r.priority,
    }));
    return { ok: true, result: { orders, total: orders.length } };
  }

  /**
   * createNursingNote（护士，warning）：未确认抛 CONFIRMATION_REQUIRED。
   * 落 clinical.nursing_records，record_type='nursing_note_draft'，
   * recordedBy 为责任护士本人。
   */
  private async createNursingNote(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    if (!args.confirmed) throw new Error('CONFIRMATION_REQUIRED');
    const visitId = str(args, 'visitId');
    const content = typeof args.content === 'string' ? args.content : '';
    const rec = await nursingRecordRepo.create({
      visitId,
      recordType: 'nursing_note_draft',
      content,
      recordedBy: ctx.userId,
    });
    return {
      ok: true,
      result: {
        noteId: rec.id,
        visitId: rec.visitId,
        createdAt: rec.recordedAt,
      },
    };
  }

  /**
   * getPendingPrescriptions（药师，info）：列出待前置审核的处方。
   * 通过 pharmacy_task JOIN prescriptions/visits/patients 拿到脱敏患者姓名、
   * 首个药品名与剂量，便于药师快速分诊。
   */
  private async getPendingPrescriptions(
    args: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.min(args.limit, 50) : 20;
    const tasks = await pharmacyTaskRepo.listPending();
    const top = tasks.slice(0, limit);
    if (top.length === 0) {
      return { ok: true, result: { tasks: [], total: 0 } };
    }
    const ids = top.map((t) => t.prescriptionId);
    const rows = await db()<Array<{
      task_id: string; prescription_id: string; visit_id: string;
      patient_name: string; drug_name: string | null; dosage: string | null;
      status: string; created_at: string;
    }>>`
      SELECT t.id AS task_id, t.prescription_id, r.visit_id,
             p.name_masked AS patient_name,
             (SELECT item.drug_name FROM clinical.prescription_items item
               WHERE item.prescription_id = r.id ORDER BY item.created_at ASC LIMIT 1) AS drug_name,
             (SELECT item.dosage FROM clinical.prescription_items item
               WHERE item.prescription_id = r.id ORDER BY item.created_at ASC LIMIT 1) AS dosage,
             t.status, t.created_at
      FROM clinical.pharmacy_dispense_tasks t
      JOIN clinical.prescriptions r ON r.id = t.prescription_id
      JOIN clinical.visits v ON v.id = r.visit_id
      LEFT JOIN clinical.patients p ON p.id = v.patient_id
      WHERE t.prescription_id = ANY(${ids})
      ORDER BY t.created_at ASC
    `;
    const list = rows.map((r) => ({
      taskId: r.task_id,
      prescriptionId: r.prescription_id,
      visitId: r.visit_id,
      patientName: r.patient_name,
      drugName: r.drug_name,
      dosage: r.dosage,
      status: r.status,
      createdAt: r.created_at,
    }));
    return { ok: true, result: { tasks: list, total: list.length } };
  }

  /**
   * reviewPrescription（药师，warning）：
   *  - 函数体顶部强制 confirmed 校验，未确认抛 CONFIRMATION_REQUIRED；
   *  - 执行前先在 clinical.medmuse_drug_interactions 做配伍禁忌粗筛，
   *    将 major/contraindicated 组合作为 interactionWarnings 返回给药师参考；
   *  - 最终落库走 prescriptionRepo.auditPrescription，审计意见写入 audit_result。
   */
  private async reviewPrescription(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    if (!args.confirmed) throw new Error('CONFIRMATION_REQUIRED');
    const prescriptionId = str(args, 'prescriptionId');
    const decisionRaw = str(args, 'decision');
    const decision: 'approved' | 'rejected' = decisionRaw === 'approve' ? 'approved' : 'rejected';
    const comment = typeof args.comment === 'string' ? args.comment : '';

    // 配伍禁忌粗筛：取该处方所有药品名，两两比对规则表
    const items = await db()<Array<{ drug_name: string }>>`
      SELECT drug_name FROM clinical.prescription_items
      WHERE prescription_id = ${prescriptionId}
    `;
    const drugNames = Array.from(new Set(items.map((i) => i.drug_name)));
    const interactionWarnings: Array<{
      drugA: string; drugB: string; severity: string; description: string; recommendation: string | null;
    }> = [];
    if (drugNames.length >= 2) {
      const rules = await db()<Array<{
        drug_a: string; drug_b: string; severity: string;
        description: string; recommendation: string | null;
      }>>`
        SELECT drug_a, drug_b, severity, description, recommendation
        FROM clinical.medmuse_drug_interactions
      `;
      for (let i = 0; i < drugNames.length; i++) {
        for (let j = i + 1; j < drugNames.length; j++) {
          const a = drugNames[i];
          const b = drugNames[j];
          const hit = rules.find(
            (r) =>
              (r.drug_a === a && r.drug_b === b) || (r.drug_a === b && r.drug_b === a),
          );
          if (hit && hit.severity !== 'minor') {
            interactionWarnings.push({
              drugA: hit.drug_a,
              drugB: hit.drug_b,
              severity: hit.severity,
              description: hit.description,
              recommendation: hit.recommendation,
            });
          }
        }
      }
    }

    const updated = await prescriptionRepo.auditPrescription(
      prescriptionId,
      decision,
      ctx.userId,
      {
        comment,
        reviewedBy: ctx.userId,
        interactionWarnings,
        reviewedAt: new Date().toISOString(),
      },
    );
    if (!updated) {
      return { ok: false, result: null, error: 'PRESCRIPTION_NOT_FOUND_OR_NOT_PENDING' };
    }
    return {
      ok: true,
      result: {
        prescriptionId: updated.id,
        decision: updated.status,
        reviewedAt: updated.updatedAt,
        interactionWarnings,
      },
    };
  }

  /**
   * listOverbudgetCases（医保办，info，只读）：
   *  - 拉取已 confirmed 的 DRG 结果，过滤 totalFee > estimatedPayment 的超支病例；
   *  - 可选科室名过滤；
   *  - 同时取 DIP 最新月度点值，便于医保办整体控费分析。
   * 注意：drgRepo.listDrgResults 仅接受 status 枚举（grouped/confirmed/rejected），
   * 已结算语义对应 'confirmed'。
   */
  private async listOverbudgetCases(
    args: Record<string, unknown>,
    _ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.min(args.limit, 100) : 30;
    const deptFilter = typeof args.deptName === 'string' && args.deptName ? args.deptName : null;

    const [rows, dipPoints] = await Promise.all([
      drgRepo.listDrgResults('confirmed'),
      dipRepo.listMonthlyPoints(),
    ]);

    const enriched = rows
      .map((r) => {
        const weight = Number(r.weight);
        const payment = Number(r.estimatedPayment);
        const actualCost = r.totalFee == null ? null : Number(r.totalFee);
        const overbudget = actualCost != null && actualCost > payment;
        return {
          visitId: r.visitId,
          patientName: r.patientName,
          deptName: r.department,
          drgGroup: r.groupCode,
          drgGroupName: r.groupName,
          weight,
          payment,
          actualCost,
          overbudget,
          updatedAt: r.updatedAt,
        };
      })
      .filter((r) => r.overbudget)
      .filter((r) => (deptFilter ? r.deptName === deptFilter : true))
      .sort((a, b) => (b.actualCost ?? 0) - (a.actualCost ?? 0))
      .slice(0, limit);

    const latestDip = dipPoints[dipPoints.length - 1] ?? null;
    const totalOverbudget = enriched.reduce(
      (acc, r) => acc + Math.max(0, (r.actualCost ?? 0) - r.payment),
      0,
    );

    return {
      ok: true,
      result: {
        drgCases: enriched,
        dipPointValue: latestDip ? latestDip.pointValue : null,
        period: latestDip ? latestDip.period : null,
        totalOverbudget,
        overbudgetCount: enriched.length,
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
