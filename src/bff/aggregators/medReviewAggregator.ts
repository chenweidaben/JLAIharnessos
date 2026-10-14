import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medReviewRepo';

export class MedReviewError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// 本地规则审查（确定性，不依赖外部LLM）
function runLocalRules(drugName: string, patientAge?: number, allergies?: string[]): Array<{
  reviewType: string; severity: string; message: string; suggestion?: string;
}> {
  const alerts: Array<{reviewType: string; severity: string; message: string; suggestion?: string}> = [];
  const d = drugName.toLowerCase();

  // 规则1：华法林 + 阿司匹林 = 出血风险
  if (d.includes('warfarin') || d.includes('华法林')) {
    alerts.push({
      reviewType: 'interaction', severity: 'warning',
      message: '华法林与阿司匹林/NSAIDs联用增加出血风险',
      suggestion: '建议监测INR，必要时调整剂量',
    });
  }
  // 规则2：老年患者慎用镇静剂
  if (patientAge && patientAge > 65 && (d.includes('安定') || d.includes('diazepam') || d.includes('苯二氮'))) {
    alerts.push({
      reviewType: 'dose', severity: 'warning',
      message: '老年患者使用苯二氮䓬类药物增加跌倒风险',
      suggestion: '建议减量或选用非苯二氮䓬类药物',
    });
  }
  // 规则3：药物过敏
  if (allergies && allergies.some(a => d.includes(a.toLowerCase()))) {
    alerts.push({
      reviewType: 'allergy', severity: 'critical',
      message: `患者对${drugName}有过敏史`,
      suggestion: '禁止使用该药物，立即更换',
    });
  }
  // 规则4：常规信息提示
  if (d.includes('抗生素') || d.includes('antibiotic')) {
    alerts.push({
      reviewType: 'info', severity: 'info',
      message: '抗菌药物使用应符合抗菌药物分级管理要求',
      suggestion: '建议根据药敏结果调整',
    });
  }
  return alerts;
}

export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('med_review:view')) throw new MedReviewError(403, '无查看权限');
  if (!visitId) throw new MedReviewError(400, 'visitId 必填');
  return repo.listOpenByVisit(visitId);
}

export async function reviewView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('med_review:view')) throw new MedReviewError(403, '无权限');
  if (!body.visitId) throw new MedReviewError(400, 'visitId 必填');
  const drugName = String(body.drugName ?? '');
  const age = body.patientAge ? Number(body.patientAge) : undefined;
  const allergies = body.allergies ? body.allergies as string[] : [];
  const rules = runLocalRules(drugName, age, allergies);
  const results = [];
  for (const r of rules) {
    results.push(await repo.create({
      visitId: String(body.visitId), orderId: body.orderId ? String(body.orderId) : undefined,
      drugName, reviewType: r.reviewType, severity: r.severity,
      message: r.message, suggestion: r.suggestion,
    }));
  }
  return results;
}

export async function overrideView(view: AuthView, id: string, reason: string) {
  if (!view.permissions.includes('med_review:override')) throw new MedReviewError(403, '无豁免权限');
  if (!reason) throw new MedReviewError(400, '豁免原因必填');
  const r = await repo.override(id, view.id, reason);
  if (!r) throw new MedReviewError(409, '仅待处理审查可豁免');
  return r;
}
