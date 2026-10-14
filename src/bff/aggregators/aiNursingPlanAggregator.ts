/**
 * 健澜科技 jlmedaios - M90-B AI护理计划推荐 Aggregator
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import * as repo from '@/db/repositories/aiNursingPlanRepo';
import * as diagnosisRepo from '@/db/repositories/diagnosisRepo';
import * as medicalHeaderRepo from '@/db/repositories/medicalHeaderRepo';

import type { AuthView } from '../view/userView.js';

export class AiNursingPlanError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface NursingPlanItem {
  item: string;
  category: string;
}

/**
 * 规则推荐引擎（纯函数）：诊断关键词匹配护理条目包，
 * 按命中关键词权重聚合为 low / medium / high 风险等级。
 */
export function recommendPlan(diagnosis: string): {
  plan: NursingPlanItem[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const d = diagnosis ?? '';
  const plan: NursingPlanItem[] = [];
  let weight = 0;

  if (d.includes('肺炎')) {
    plan.push({ item: '体位排痰（每2小时翻身拍背，指导有效咳嗽）', category: '呼吸道护理' });
    plan.push({ item: '体温监测（每4小时测量体温并记录热型）', category: '生命体征监测' });
    plan.push({ item: '氧疗护理（遵医嘱吸氧，保持气道湿化，观察SpO₂）', category: '氧疗管理' });
    weight += 2;
  }
  if (d.includes('术后') || d.includes('手术')) {
    plan.push({ item: '切口护理（观察敷料渗液/红肿，保持切口干燥）', category: '术后护理' });
    plan.push({ item: '疼痛评估（NRS评分，遵医嘱镇痛并记录）', category: '疼痛管理' });
    plan.push({ item: '早期活动（循序渐进床上活动→下床活动）', category: '康复促进' });
    weight += 2;
  }
  if (plan.length === 0) {
    // 默认通用监测包
    plan.push({ item: '生命体征监测（体温/脉搏/呼吸/血压）', category: '基础护理' });
    plan.push({ item: '饮食与排泄护理', category: '基础护理' });
    plan.push({ item: '健康宣教与心理护理', category: '基础护理' });
    weight += 1;
  }

  const riskLevel: 'low' | 'medium' | 'high' =
    weight >= 4 ? 'high' : weight >= 2 ? 'medium' : 'low';
  return { plan, riskLevel };
}

/**
 * aggregator 层数据获取：按 visitId 拼接真实诊断文本。
 * 诊断来源：诊断表（diagnoses）+ 病案首页（medical_record_headers）。
 * 任一 repo 查询失败或无结果时安全降级为空串，绝不抛出、不引入会崩的依赖；
 * 返回空串时 recommendPlan 自动走默认通用监测包。
 */
async function loadRealDiagnosis(visitId: string): Promise<string> {
  const parts: string[] = [];
  try {
    const diags = await diagnosisRepo.getDiagnosesByVisit(visitId);
    for (const d of diags) if (d?.name) parts.push(d.name);
  } catch { /* 诊断表查询失败：降级 */ }
  try {
    const header = await medicalHeaderRepo.getByVisit(visitId);
    if (header) {
      if (header.primaryDiagnosis) parts.push(header.primaryDiagnosis);
      for (const s of header.secondaryDiagnoses ?? []) if (s) parts.push(s);
    }
  } catch { /* 病案首页查询失败：降级 */ }
  return parts.join('；');
}

/** 生成推荐：校验权限 → 真实诊断装载 → 规则引擎推荐 → 落库 pending 记录返回 */
export async function recommendView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('ai_nursing_plan:view')) throw new AiNursingPlanError(403, '无权限');
  if (!body.visitId) throw new AiNursingPlanError(400, 'visitId 必填');
  // 经上方非空校验，visitId 必为字符串（来自 JSON body / query），此处收窄类型
  const visitId = body.visitId as string;
  const realDiagnosis = await loadRealDiagnosis(visitId);
  // 真实诊断优先；真实诊断为空时回退调用方传入字符串诊断，仍为空则走默认通用监测包
  const callerDiagnosis = typeof body.diagnosis === 'string' ? body.diagnosis : '';
  const diagnosis = realDiagnosis || callerDiagnosis;
  const rec = recommendPlan(diagnosis);
  return repo.create({
    visitId,
    diagnosis,
    plan: rec.plan,
    riskLevel: rec.riskLevel,
  });
}

/** 采纳：状态 pending → accepted，落库操作人 */
export async function acceptView(view: AuthView, id: string) {
  if (!view.permissions.includes('ai_nursing_plan:view')) throw new AiNursingPlanError(403, '无权限');
  if (!id) throw new AiNursingPlanError(400, 'id 必填');
  const existing = await repo.getById(id);
  if (!existing) throw new AiNursingPlanError(404, '护理计划不存在');
  if (existing.status !== 'pending') throw new AiNursingPlanError(409, '仅待采纳状态可采纳');
  const updated = await repo.accept(id, view.id);
  if (!updated) throw new AiNursingPlanError(409, '采纳失败：记录状态已变更');
  return updated;
}
