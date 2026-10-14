import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/pathwayRecommendationRepo';

export class PathwayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// 本地路径模板
function matchPathway(diagnosis: string): {
  pathwayName: string; pathwayCode: string; expectedDays: number;
  steps: Array<{day: number; action: string; responsible: string}>; confidence: number;
} | null {
  const d = diagnosis.toLowerCase();
  if (d.includes('肺炎') || d.includes('pneumonia')) {
    return {
      pathwayName: '社区获得性肺炎临床路径', pathwayCode: 'CP-PNEU-001', expectedDays: 7,
      confidence: 0.82,
      steps: [
        {day: 1, action: '入院评估+血常规+胸部CT+痰培养', responsible: '主管医生'},
        {day: 2, action: '经验性抗菌治疗+对症处理', responsible: '主管医生'},
        {day: 3, action: '评估疗效+复查血常规', responsible: '主管医生'},
        {day: 5, action: '复查胸部影像+调整用药', responsible: '主治医师'},
        {day: 7, action: '出院评估+出院指导', responsible: '主治医师'},
      ],
    };
  }
  if (d.includes('阑尾炎') || d.includes('appendicitis')) {
    return {
      pathwayName: '急性阑尾炎临床路径', pathwayCode: 'CP-APPX-001', expectedDays: 5,
      confidence: 0.88,
      steps: [
        {day: 1, action: '术前评估+急诊手术', responsible: '外科医生'},
        {day: 2, action: '术后观察+抗感染', responsible: '外科医生'},
        {day: 3, action: '切口换药+早期活动', responsible: '护士'},
        {day: 5, action: '出院评估+拆线指导', responsible: '主治医师'},
      ],
    };
  }
  if (d.includes('冠心病') || d.includes('心绞痛') || d.includes('chd')) {
    return {
      pathwayName: '稳定性心绞痛临床路径', pathwayCode: 'CP-CHD-001', expectedDays: 10,
      confidence: 0.78,
      steps: [
        {day: 1, action: '入院评估+心电图+心肌酶', responsible: '心内科医生'},
        {day: 2, action: '冠脉CTA或造影评估', responsible: '心内科医生'},
        {day: 3, action: '药物治疗+危险因素控制', responsible: '主管医生'},
        {day: 7, action: '疗效评估+康复指导', responsible: '主治医师'},
        {day: 10, action: '出院+随访计划', responsible: '主治医师'},
      ],
    };
  }
  return null;
}

export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_pathway:view')) throw new PathwayError(403, '无权限');
  if (!visitId) throw new PathwayError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function recommendView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('ai_pathway:view')) throw new PathwayError(403, '无权限');
  if (!body.visitId) throw new PathwayError(400, 'visitId 必填');
  const diagnosis = String(body.diagnosis ?? '');
  const match = matchPathway(diagnosis);
  if (!match) throw new PathwayError(404, '暂无匹配临床路径');
  return repo.create({
    visitId: String(body.visitId), diagnosis,
    pathwayName: match.pathwayName, pathwayCode: match.pathwayCode,
    steps: match.steps, expectedDays: match.expectedDays, confidence: match.confidence,
  });
}

export async function acceptView(view: AuthView, id: string) {
  const r = await repo.accept(id);
  if (!r) throw new PathwayError(409, '仅待推荐路径可接受');
  return r;
}
