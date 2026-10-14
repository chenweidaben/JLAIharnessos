/**
 * 健澜科技 jlmedaios - 护士交接班记录 Zustand store（214）
 *
 * 交班本列表 + 新建（自动生成摘要预览）。
 * 预览文本在前端本地按与后端一致的规则拼装，护士可修订后提交。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listHandoffs, recordHandoff } from '@/services/api/nurseHandoff';
import type {
  HandoffPlan, HandoffVitalSigns, NurseHandoff, RecordHandoffReq,
} from '@/types/nurseHandoff';

interface HealthInfo { status: string; version: string; db: 'up' | 'down' | 'skipped'; }

/** 与后端 buildHandoffSummary 一致的本地预览（纯函数，便于新建时即时预览）。 */
export function previewSummary(plan: HandoffPlan, v: HandoffVitalSigns): string {
  const lines: string[] = [];
  const who = [plan.patientName, plan.bedNo ? `${plan.bedNo}床` : ''].filter(Boolean).join(' / ');
  lines.push(who ? `患者：${who}` : '患者：（未填写）');
  if (plan.diagnosis) lines.push(`诊断：${plan.diagnosis}`);
  lines.push(`护理级别：${plan.nursingLevel || '护理级别未标注'}`);

  const vs: string[] = [];
  if (typeof v.temperature === 'number') vs.push(`T ${v.temperature.toFixed(1)}℃`);
  if (typeof v.pulse === 'number') vs.push(`P ${Math.round(v.pulse)}次/分`);
  if (typeof v.respiration === 'number') vs.push(`R ${Math.round(v.respiration)}次/分`);
  if (typeof v.bpSystolic === 'number' && typeof v.bpDiastolic === 'number') {
    vs.push(`BP ${Math.round(v.bpSystolic)}/${Math.round(v.bpDiastolic)}mmHg`);
  }
  if (typeof v.oxygenSaturation === 'number') vs.push(`SpO₂ ${Math.round(v.oxygenSaturation)}%`);
  lines.push(`生命体征：${vs.length ? vs.join('，') : '本班次暂无生命体征记录'}`);

  const items = (plan.planItems ?? []).filter((it) => it && it.item);
  if (items.length > 0) {
    lines.push('护理要点：');
    items.forEach((it, i) => lines.push(`  ${i + 1}.${it.category ? `[${it.category}]` : ''}${it.item}`));
  } else {
    lines.push('护理要点：按医嘱执行基础护理与病情观察。');
  }

  const risk = plan.riskLevel === 'high' ? '高危（重点交接防护措施）'
    : plan.riskLevel === 'medium' ? '中危（加强巡视与宣教）'
    : plan.riskLevel === 'low' ? '低危（常规观察）' : '风险等级待评';
  lines.push(`风险提示：${risk}`);

  const tasks = (plan.pendingTasks ?? []).filter(Boolean);
  lines.push(tasks.length > 0
    ? `接班待办：${tasks.map((t, i) => `${i + 1})${t}`).join('；')}`
    : '接班待办：无特殊待办事项，继续密切观察病情变化。');
  return lines.join('\n');
}

interface NurseHandoffState {
  dbUp: boolean | null;
  records: NurseHandoff[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (wardId?: string) => Promise<void>;
  submit: (body: RecordHandoffReq) => Promise<NurseHandoff>;
}

export const useNurseHandoffStore = create<NurseHandoffState>((set, get) => ({
  dbUp: null,
  records: [],
  loading: false,
  acting: false,
  error: null,

  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as HealthInfo;
      const up = h && h.db === 'up';
      set({ dbUp: up, error: up ? null : '数据库连接异常，业务数据不可用' });
      return up;
    } catch (err) {
      set({ dbUp: false, error: err instanceof Error ? err.message : '健康检查失败' });
      return false;
    }
  },

  load: async (wardId) => {
    set({ loading: true, error: null });
    try {
      set({ records: await listHandoffs(wardId) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  submit: async (body) => {
    if (get().dbUp !== true) throw new Error('数据库不可用，禁止操作');
    set({ acting: true, error: null });
    try {
      const rec = await recordHandoff(body);
      await get().load(body.wardId);
      return rec;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登记失败';
      set({ error: msg });
      throw err;
    } finally {
      set({ acting: false });
    }
  },
}));
