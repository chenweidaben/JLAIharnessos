import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/aiNoteDraftRepo';

export class AiNoteError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// 本地模板生成（不依赖外部 LLM，确定性输出）
function generateLocalTemplate(draftType: string, context: string): string {
  const templates: Record<string, string> = {
    progress_note: `【AI辅助病程记录】\n今日查房：患者一般情况可，神志清楚，精神可。\n主诉：{context}\n查体：生命体征平稳，心肺腹未见明显异常。\n辅助检查：待回报。\n初步判断：病情平稳，继续当前治疗方案。\n处理意见：1.继续当前治疗 2.密切观察病情变化 3.必要时复查相关指标。\n（本记录由AI辅助生成，需经主治医师审核确认）`,
    admission_summary: `【AI辅助入院记录】\n患者因"{context"入院。\n入院诊断：待查。\n入院情况：患者神志清楚，精神可，心肺腹查体未见明显异常。\n诊疗计划：1.完善相关检查 2.对症支持治疗 3.待检查结果回报后调整方案。\n（本记录由AI辅助生成，需经主治医师审核确认）`,
    discharge_summary: `【AI辅助出院小结】\n患者入院后经治疗，病情好转/稳定，符合出院标准。\n入院诊断：{context}\n出院情况：患者一般情况可，准予出院。\n出院医嘱：1.定期门诊复查 2.注意休息 3.不适随诊。\n（本记录由AI辅助生成，需经主治医师审核确认）`,
    consult_reply: `【AI辅助会诊意见】\n根据病史及查体，考虑{context}\n建议：1.进一步完善相关检查 2.建议对症处理 3.密切随访。\n（本意见由AI辅助生成，需经主治医师审核确认）`,
  };
  return templates[draftType] ?? templates.progress_note.replace('{context}', context);
}

/**
 * v5.0试点扩展（M189 EMR/AI种子）：DEMO_MODE 病历草稿确定性种子。
 * 固定 2 份病历草稿（病程记录/入院记录），含标题、科室、内容摘要与状态，
 * 字段与 AiNoteDraft（aiNoteDraftRepo.mapRow）一致。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
function buildDemoDrafts(visitId: string) {
  const vid = visitId || 'V2026DEMO001';
  const now = new Date().toISOString();
  return [
    {
      id: 'demo-and-1', visitId: vid, draftType: 'progress_note',
      promptContext: '心内科三病区 · 冠心病心绞痛 · 病程记录',
      generatedContent:
        '【AI辅助病程记录】\n科室：心血管内科三病区\n今日查房：患者胸痛较前缓解，神志清楚，精神可。\n主诉：反复胸痛 2 小时，含服硝酸甘油后缓解。\n查体：BP 128/76mmHg，HR 72次/分，心肺腹未见明显异常。\n辅助检查：心电图提示 ST-T 改变，肌钙蛋白待回报。\n初步判断：冠心病 心绞痛，病情平稳。\n处理意见：1.继续抗血小板、调脂治疗 2.密切监测心电 3.必要时复查心肌酶。\n（本记录由AI辅助生成，需经主治医师审核确认）',
      modelVersion: 'jlmedaios-local-v1', status: 'draft',
      reviewedBy: null, reviewedAt: null, doctorEdit: null, createdAt: now,
    },
    {
      id: 'demo-and-2', visitId: vid, draftType: 'admission_summary',
      promptContext: '呼吸内科二病区 · 社区获得性肺炎 · 入院记录',
      generatedContent:
        '【AI辅助入院记录】\n科室：呼吸与危重症医学科二病区\n患者因"发热咳嗽 3 天，咳黄痰 1 天"入院。\n入院诊断：社区获得性肺炎。\n入院情况：T 38.6℃，双肺呼吸音粗，右下肺可闻及湿啰音。\n诊疗计划：1.完善血常规+CRP+胸部CT 2.经验性抗感染治疗 3.对症退热、化痰。\n（本记录由AI辅助生成，需经主治医师审核确认）',
      modelVersion: 'jlmedaios-local-v1', status: 'accepted',
      reviewedBy: 'demo-doctor', reviewedAt: now, doctorEdit: null, createdAt: now,
    },
  ];
}

export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_note:generate')) throw new AiNoteError(403, '无权限');
  // v5.0试点扩展（M189 EMR/AI种子）：DEMO_MODE 直接返回确定性演示种子（不强制 visitId）
  if (process.env.DEMO_MODE === '1') return buildDemoDrafts(visitId);
  if (!visitId) throw new AiNoteError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function generateView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('ai_note:generate')) throw new AiNoteError(403, '无生成权限');
  if (!body.visitId) throw new AiNoteError(400, 'visitId 必填');
  const draftType = String(body.draftType ?? 'progress_note');
  const context = String(body.context ?? '');
  const content = generateLocalTemplate(draftType, context);
  return repo.create({
    visitId: String(body.visitId), draftType, promptContext: context,
    generatedContent: content, modelVersion: 'jlmedaios-local-v1',
  });
}

export async function reviewView(view: AuthView, id: string, status: string, doctorEdit?: string) {
  if (!view.permissions.includes('ai_note:review')) throw new AiNoteError(403, '无审核权限');
  if (!['accepted','rejected','modified'].includes(status)) throw new AiNoteError(400, '状态无效');
  const d = await repo.review(id, view.id, status, doctorEdit);
  if (!d) throw new AiNoteError(409, '仅待审核草稿可审核');
  return d;
}
