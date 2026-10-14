import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/losPredictionRepo';

export class LosPredError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// 本地启发式预测
function predict(age: number, diagnosis: string, comorbidities: number): {
  losDays: number; cost: number; riskLevel: 'low'|'medium'|'high';
  factors: Array<{factor: string; impact: string}>; confidence: number;
} {
  let baseLos = 5;
  let baseCost = 8000;
  const factors: Array<{factor: string; impact: string}> = [];

  if (age > 65) { baseLos += 2; baseCost += 3000; factors.push({factor: `高龄(${age}岁)`, impact: '住院天数+2天，费用+3000'}); }
  if (comorbidities > 2) { baseLos += 3; baseCost += 5000; factors.push({factor: `合并症多(${comorbidities}种)`, impact: '住院天数+3天，费用+5000'}); }
  const d = diagnosis.toLowerCase();
  if (d.includes('肺炎')) { baseLos += 2; baseCost += 2000; factors.push({factor: '肺炎', impact: '住院天数+2天，费用+2000'}); }
  if (d.includes('心梗') || d.includes('mi')) { baseLos += 5; baseCost += 15000; factors.push({factor: '心肌梗死', impact: '住院天数+5天，费用+15000'}); }

  const riskLevel: 'low'|'medium'|'high' = baseLos > 10 || baseCost > 20000 ? 'high' : baseLos > 7 || baseCost > 12000 ? 'medium' : 'low';

  return { losDays: baseLos, cost: baseCost, riskLevel, factors, confidence: 0.7 };
}

export async function view(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('ai_los_pred:view')) throw new LosPredError(403, '无权限');
  if (!body.visitId) throw new LosPredError(400, 'visitId 必填');
  const age = Number(body.age ?? 50);
  const diagnosis = String(body.diagnosis ?? '');
  const comorbidities = Number(body.comorbidities ?? 0);
  const p = predict(age, diagnosis, comorbidities);
  return repo.create({
    visitId: String(body.visitId), predictedLosDays: p.losDays, predictedCost: p.cost,
    riskLevel: p.riskLevel, factors: p.factors, confidence: p.confidence,
  });
}

export async function latest(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_los_pred:view')) throw new LosPredError(403, '无权限');
  if (!visitId) throw new LosPredError(400, 'visitId 必填');
  return repo.getLatestByVisit(visitId);
}
