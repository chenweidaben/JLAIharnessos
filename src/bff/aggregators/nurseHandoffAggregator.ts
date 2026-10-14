/**
 * 健澜科技 jlmedaios - 护士交接班记录 Aggregator（214）
 *
 * 交班本/接班本模板化：
 *  - buildHandoffSummary：纯函数，基于护理计划 + 生命体征生成结构化交班摘要文本；
 *  - listView：按病区列交班记录；recordView：登记一条交班记录（摘要可由前端预览后提交，
 *    亦可由后端据 plan + vitalSigns 现场生成）。
 *
 * 权限复用既有 nursing:record（查看/登记），不新增权限码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import * as repo from '@/db/repositories/nurseHandoffRepo';
import type { AuthView } from '../view/userView.js';

export class NurseHandoffError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ------------------------- 纯函数：交班摘要生成 ------------------------- */

export interface HandoffPlanItem {
  item: string;
  category?: string;
}

export interface HandoffPlan {
  patientName?: string;
  bedNo?: string;
  diagnosis?: string;
  nursingLevel?: string;                 // 特级 / 一级 / 二级 / 三级
  riskLevel?: 'low' | 'medium' | 'high'; // 护理风险等级
  planItems?: HandoffPlanItem[];
  pendingTasks?: string[];               // 接班待办
}

export interface HandoffVitalSigns {
  temperature?: number;
  pulse?: number;
  respiration?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  oxygenSaturation?: number;
}

const LEVEL_LABEL: Record<string, string> = {
  special: '特级护理', level1: '一级护理', level2: '二级护理', level3: '三级护理',
};

function fmtVitals(v: HandoffVitalSigns): string {
  const parts: string[] = [];
  if (typeof v.temperature === 'number') parts.push(`T ${v.temperature.toFixed(1)}℃`);
  if (typeof v.pulse === 'number') parts.push(`P ${Math.round(v.pulse)}次/分`);
  if (typeof v.respiration === 'number') parts.push(`R ${Math.round(v.respiration)}次/分`);
  if (typeof v.bpSystolic === 'number' && typeof v.bpDiastolic === 'number') {
    parts.push(`BP ${Math.round(v.bpSystolic)}/${Math.round(v.bpDiastolic)}mmHg`);
  }
  if (typeof v.oxygenSaturation === 'number') parts.push(`SpO₂ ${Math.round(v.oxygenSaturation)}%`);
  return parts.length > 0 ? parts.join('，') : '本班次暂无生命体征记录';
}

function riskLabel(risk?: 'low' | 'medium' | 'high'): string {
  if (risk === 'high') return '高危（压疮/跌倒/坠床风险，重点交接防护措施）';
  if (risk === 'medium') return '中危（加强巡视与宣教）';
  if (risk === 'low') return '低危（常规观察）';
  return '风险等级待评';
}

/**
 * 纯函数：护理计划 + 生命体征 → 结构化交班摘要文本。
 * 不抛异常、不读库、不依赖时间；空输入也产出稳定的兜底文案，便于单测与前端预览。
 */
export function buildHandoffSummary(plan: HandoffPlan, vitalSigns: HandoffVitalSigns): string {
  const lines: string[] = [];

  const who = [plan.patientName, plan.bedNo ? `${plan.bedNo}床` : ''].filter(Boolean).join(' / ');
  lines.push(who ? `患者：${who}` : '患者：（未填写）');

  if (plan.diagnosis) lines.push(`诊断：${plan.diagnosis}`);

  const level = plan.nursingLevel
    ? (LEVEL_LABEL[plan.nursingLevel] ?? plan.nursingLevel)
    : '护理级别未标注';
  lines.push(`护理级别：${level}`);

  lines.push(`生命体征：${fmtVitals(vitalSigns ?? {})}`);

  const items = (plan.planItems ?? []).filter((it) => it && it.item);
  if (items.length > 0) {
    lines.push('护理要点：');
    items.forEach((it, i) => {
      const cat = it.category ? `[${it.category}]` : '';
      lines.push(`  ${i + 1}.${cat}${it.item}`);
    });
  } else {
    lines.push('护理要点：按医嘱执行基础护理与病情观察。');
  }

  lines.push(`风险提示：${riskLabel(plan.riskLevel)}`);

  const tasks = (plan.pendingTasks ?? []).filter(Boolean);
  lines.push(tasks.length > 0
    ? `接班待办：${tasks.map((t, i) => `${i + 1})${t}`).join('；')}`
    : '接班待办：无特殊待办事项，继续密切观察病情变化。');

  return lines.join('\n');
}

/* ------------------------------- 视图层 -------------------------------- */

export async function listView(view: AuthView, wardId: string) {
  if (!view.permissions.includes('nursing:record')) {
    throw new NurseHandoffError(403, '无交班本查看权限');
  }
  return repo.listHandoffsByWard(wardId || null);
}

export interface RecordHandoffBody {
  wardId?: string;
  shift?: string;
  patientId?: string;
  summary?: string;
  plan?: HandoffPlan;
  vitalSigns?: HandoffVitalSigns;
}

/**
 * 登记交班记录：
 *  - 若 body.summary 已由前端预览确认提交，则直接落库；
 *  - 否则据 body.plan + body.vitalSigns 现场生成摘要。
 */
export async function recordView(view: AuthView, body: RecordHandoffBody) {
  if (!view.permissions.includes('nursing:record')) {
    throw new NurseHandoffError(403, '无交班本登记权限');
  }
  const shift = body.shift === 'day' || body.shift === 'evening' || body.shift === 'night'
    ? body.shift : 'day';
  const summary = (body.summary && String(body.summary).trim())
    ? String(body.summary).trim()
    : buildHandoffSummary(body.plan ?? {}, body.vitalSigns ?? {});

  return repo.createHandoff({
    wardId: body.wardId ?? null,
    shift,
    patientId: body.patientId ?? null,
    summary,
    createdBy: view.id,
  });
}
