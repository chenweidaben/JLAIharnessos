/**
 * 健澜科技 jlmedaios - 手术安全核查表聚合器
 *
 * 四阶段三方核查清单电子化：
 *   pre_op        术前核查（Sign-in 前）
 *   anesthesia    麻醉实施前核查
 *   pre_incision  切皮前 Time-out
 *   post_op       手术结束后 Sign-out
 *
 * defaultChecklist 为纯函数，供前后端与单测复用；listView/signView 落库并签三方确认。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  listBySurgery,
  upsertSigned,
  type SafetyChecklistItem,
  type SafetyChecklistPhase,
  type SafetyChecklistRow,
} from '../../db/repositories/safetyChecklistRepo.js';
import { getEnv } from '../config/env.js';

export class SafetyChecklistError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'SafetyChecklistError';
  }
}
const badRequest = (m: string) => new SafetyChecklistError(400, m);
const unauthorized = (m: string) => new SafetyChecklistError(401, m);

/** 四阶段定义（顺序即展示顺序） */
export const CHECKLIST_PHASES: ReadonlyArray<{ phase: SafetyChecklistPhase; title: string }> = [
  { phase: 'pre_op', title: '术前核查' },
  { phase: 'anesthesia', title: '麻醉实施前核查' },
  { phase: 'pre_incision', title: '切皮前 Time-out' },
  { phase: 'post_op', title: '手术结束后 Sign-out' },
];

export type { SafetyChecklistItem, SafetyChecklistPhase };

function item(key: string, label: string): SafetyChecklistItem {
  return { key, label, required: true, checked: false };
}

/** 各阶段默认核查项（纯函数，checked 初始为 false）。 */
export function defaultChecklist(phase: SafetyChecklistPhase): SafetyChecklistItem[] {
  switch (phase) {
    case 'pre_op':
      return [
        item('patient_identity', '患者身份（姓名/性别/年龄）已核对'),
        item('surgical_site', '手术部位与体表标识已确认'),
        item('consent', '手术知情同意书已签署'),
        item('fasting', '术前禁食禁饮时间已确认'),
        item('lab_imaging', '术前检验与影像资料齐全并备于手术间'),
        item('skin_prep', '手术区域皮肤准备完成'),
      ];
    case 'anesthesia':
      return [
        item('allergy', '药物/乳胶/食物过敏史已确认'),
        item('anesthesia_machine', '麻醉机与气道设备已检查'),
        item('rescue_drugs', '麻醉药品与抢救药品已备齐'),
        item('asa_plan', 'ASA 分级与麻醉方案已确认'),
        item('iv_access', '静脉通路已建立并通畅'),
        item('monitors', '心电/血压/血氧监护已开启'),
      ];
    case 'pre_incision':
      return [
        item('team_intro', '手术团队成员自我介绍与分工完成'),
        item('procedure_confirm', '手术名称/方式由术者口头确认'),
        item('site_confirm', '手术部位/术式再次核对无误'),
        item('antibiotic', '预防性抗菌药已于切皮前 60 分钟内输注'),
        item('imaging_ready', '影像资料已摆放/可随时调阅'),
        item('implant_ready', '植入物与特殊器械准备到位（如适用）'),
      ];
    case 'post_op':
      return [
        item('instrument_count', '器械/纱巾/敷料计数正确'),
        item('specimen', '手术标本已标识并送检'),
        item('drains', '引流管/管道数量与位置已记录'),
        item('handoff', '术后病情已向 PACU/病房交接'),
        item('event_log', '设备故障/意外事件已记录'),
        item('transfer', '患者生命体征平稳后安全转送'),
      ];
    default:
      throw badRequest(`未知核查阶段：${String(phase)}`);
  }
}

export interface PhaseView {
  phase: SafetyChecklistPhase;
  title: string;
  items: SafetyChecklistItem[];
  signedBy: string | null;
  signedAt: string | null;
  signed: boolean;
}

export interface ChecklistView {
  surgeryId: string;
  phases: PhaseView[];
}

function toPhaseView(row: SafetyChecklistRow | undefined, phase: SafetyChecklistPhase): PhaseView {
  const title = CHECKLIST_PHASES.find((p) => p.phase === phase)?.title ?? phase;
  return {
    phase,
    title,
    items: row?.items?.length ? row.items : defaultChecklist(phase),
    signedBy: row?.signedBy ?? null,
    signedAt: row?.signedAt ?? null,
    signed: Boolean(row?.signedBy),
  };
}

/**
 * DEMO_MODE 下的兜底视图：四阶段全部返回默认未签署项，不落库。
 * 用于无 PG 的演示环境，保证 GET 接口不抛 500。
 */
function demoChecklistView(surgeryId: string): ChecklistView {
  return {
    surgeryId,
    phases: CHECKLIST_PHASES.map((p) => toPhaseView(undefined, p.phase)),
  };
}

/** GET：按手术汇总四阶段核查清单（未签署阶段返回默认项供勾选）。 */
export async function listView(user: { id: string } | null, surgeryId: string): Promise<ChecklistView> {
  if (!user?.id) throw unauthorized('未登录');
  if (!surgeryId) throw badRequest('surgeryId 不能为空');
  // DEMO_MODE：跳过 repo，直接返回内存默认清单，避免无 PG 环境下 500
  if (getEnv().demoMode) return demoChecklistView(surgeryId);
  const rows = await listBySurgery(surgeryId);
  const byPhase = new Map(rows.map((r) => [r.phase, r]));
  return {
    surgeryId,
    phases: CHECKLIST_PHASES.map((p) => toPhaseView(byPhase.get(p.phase), p.phase)),
  };
}

export interface SignChecklistInput {
  surgeryId?: string;
  phase?: SafetyChecklistPhase;
  items?: SafetyChecklistItem[];
}

/** POST：签署某一阶段，落核查项与签名人/时间。 */
export async function signView(
  user: { id: string } | null,
  input: SignChecklistInput,
): Promise<PhaseView> {
  if (!user?.id) throw unauthorized('未登录');
  const surgeryId = (input.surgeryId ?? '').trim();
  if (!surgeryId) throw badRequest('surgeryId 不能为空');
  const phase = input.phase;
  if (!phase || !CHECKLIST_PHASES.some((p) => p.phase === phase)) {
    throw badRequest('phase 必须为 pre_op/anesthesia/pre_incision/post_op 之一');
  }
  const items = Array.isArray(input.items) ? input.items : defaultChecklist(phase);
  if (!items.length) throw badRequest('核查项不能为空');
  // DEMO_MODE：跳过 upsertSigned 落库，直接回显已签署态，保证演示不崩
  if (getEnv().demoMode) {
    const demoRow: SafetyChecklistRow = {
      id: `demo-${surgeryId}-${phase}`,
      surgeryId,
      phase,
      items,
      signedBy: user.id,
      signedAt: new Date().toISOString(),
    };
    return toPhaseView(demoRow, phase);
  }
  const row = await upsertSigned({ surgeryId, phase, items, signedBy: user.id });
  return toPhaseView(row, phase);
}
