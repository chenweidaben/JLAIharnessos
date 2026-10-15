/**
 * 健澜科技 jlmedaios - 护理交接班智能助手 Aggregator（M120-C，依据宪法第七章）
 *
 * 依据宪法第七章（AI 原生医院 / 护理 Personal Agent）：交班护士本班结束时，系统一键
 * 汇总本病区在册患者的护理风险、护理要点、接班待办与沉淀教训，按风险高低自动排序，
 * 并生成可读的结构化交班报告，减轻手抄交班负担、降低高危患者交接遗漏风险。
 *
 * 纯函数约定（依据宪法第七章：可单测、可复算、不读库不读时钟）：
 *  - buildNursingHandover(nurseId, wardId, shiftType, data)：
 *      输入病区本班患者原始事实 → 输出 { riskPatients, carePoints, pendingTasks, lessons }；
 *      不抛异常、不访问 I/O；时间由调用方经 data.generatedAt 注入，保证确定性。
 *  - formatHandoverReport(handover)：把上面的结构化结果一键渲染为交班报告文本。
 *
 * 医疗安全：本助手仅做信息汇总与排序，不替代临床判断与医嘱（依据宪法第七章）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 班次：白班 / 小夜 / 大夜 */
export type ShiftType = 'day' | 'evening' | 'night';

/** 单名患者输入事实（由路由层从各业务系统聚合后注入） */
export interface HandoverPatientInput {
  patientId: string;
  name: string;
  bedNo?: string;
  diagnosis?: string;
  /** 护理级别：特级 / 一级 / 二级 / 三级 */
  nursingLevel?: 'special' | 'level1' | 'level2' | 'level3';
  /** 已有风险评分 0-100；缺省时由 riskFlags + nursingLevel 推导 */
  riskScore?: number;
  /** 风险标签：fall 跌倒 / bedsore 压疮 / tube 管路 / vte 血栓 / other */
  riskFlags?: string[];
  /** 本班病情备注（一句话） */
  notes?: string;
}

export interface HandoverCarePointInput {
  patientId?: string;
  content: string;
  category?: string;
}

export interface HandoverTaskInput {
  taskId?: string;
  patientId?: string;
  patientName?: string;
  content: string;
  /** 数字越小越优先，缺省 5 */
  priority?: number;
  /** 是否已完成；已完成不进交班待办 */
  done?: boolean;
}

export interface HandoverLessonInput {
  lessonId?: string;
  title: string;
  summary?: string;
  level?: 'warn' | 'info' | 'tip';
}

/** buildNursingHandover 的入参数据包（路由层负责装配） */
export interface NursingHandoverData {
  patients?: HandoverPatientInput[];
  carePoints?: HandoverCarePointInput[];
  pendingTasks?: HandoverTaskInput[];
  lessons?: HandoverLessonInput[];
  /** 调用方注入的生成时间戳；缺省用「本班次」占位，纯函数不调用 Date.now */
  generatedAt?: string;
}

export type RiskLevel = 'high' | 'medium' | 'low';

/** 排序后的风险患者 */
export interface RiskPatient {
  patientId: string;
  name: string;
  bedNo?: string;
  diagnosis?: string;
  nursingLevel: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFlags: string[];
  notes?: string;
}

export interface CarePoint {
  patientId?: string;
  content: string;
  category?: string;
}

export interface PendingTask {
  taskId: string;
  patientId?: string;
  patientName?: string;
  content: string;
  priority: number;
}

export interface Lesson {
  lessonId: string;
  title: string;
  summary?: string;
  level: 'warn' | 'info' | 'tip';
}

/** 交班结构化结果 */
export interface NursingHandover {
  nurseId: string;
  wardId: string;
  shiftType: ShiftType;
  shiftLabel: string;
  generatedAt: string;
  riskPatients: RiskPatient[];
  carePoints: CarePoint[];
  pendingTasks: PendingTask[];
  lessons: Lesson[];
}

/* ------------------------------- 常量映射 ------------------------------- */

const SHIFT_LABEL: Record<ShiftType, string> = {
  day: '白班',
  evening: '小夜班',
  night: '大夜班',
};

const NURSING_LEVEL_LABEL: Record<string, string> = {
  special: '特级护理',
  level1: '一级护理',
  level2: '二级护理',
  level3: '三级护理',
};

/** 护理级别在风险排序中的次序权重（越大越危重；键为映射后的中文标签） */
const LEVEL_ORDER: Record<string, number> = {
  '特级护理': 4, '一级护理': 3, '二级护理': 2, '三级护理': 1, '护理级别未评': 0,
};

/** 风险标签中文映射 */
const RISK_FLAG_LABEL: Record<string, string> = {
  fall: '跌倒',
  bedsore: '压疮',
  tube: '管路滑脱',
  vte: 'VTE',
  other: '其他',
};

/** 风险分阈值：>=60 高危，>=30 中危，余低危 */
const HIGH_SCORE = 60;
const MEDIUM_SCORE = 30;

function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** 缺省风险分推导（依据宪法第七章：规则透明可复算，不做黑盒预测） */
function deriveRiskScore(p: HandoverPatientInput): number {
  let score = 0;
  for (const f of p.riskFlags ?? []) {
    score += f === 'other' ? 10 : 20;
  }
  if (p.nursingLevel === 'special') score += 20;
  else if (p.nursingLevel === 'level1') score += 12;
  else if (p.nursingLevel === 'level2') score += 5;
  return clampScore(score);
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= HIGH_SCORE) return 'high';
  if (score >= MEDIUM_SCORE) return 'medium';
  return 'low';
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  high: '高危',
  medium: '中危',
  low: '低危',
};

/* --------------------------- 纯函数：结构化装配 --------------------------- */

/**
 * 护理交接班智能装配（依据宪法第七章）：
 *  - 风险患者：统一风险分口径，按 风险分↓ → 护理级别危重度↓ → 床号↑ 排序；
 *  - 护理要点：原样保留，过滤空串；
 *  - 接班待办：剔除已完成项，按 priority↑ 排序；
 *  - 经验教训：原样保留。
 * 入参非法（undefined/null）一律兜底为空数组，保证不抛异常。
 */
export function buildNursingHandover(
  nurseId: string,
  wardId: string,
  shiftType: string,
  data: NursingHandoverData | null | undefined,
): NursingHandover {
  const d = data ?? {};
  const shift: ShiftType = shiftType === 'evening' || shiftType === 'night' ? shiftType : 'day';

  // 风险患者：统一评分 + 排序
  const riskPatients: RiskPatient[] = (d.patients ?? [])
    .filter((p) => p && p.patientId)
    .map((p) => {
      const score = clampScore(
        typeof p.riskScore === 'number' ? p.riskScore : deriveRiskScore(p),
      );
      return {
        patientId: p.patientId,
        name: p.name || '（未命名）',
        bedNo: p.bedNo,
        diagnosis: p.diagnosis,
        nursingLevel: p.nursingLevel
          ? (NURSING_LEVEL_LABEL[p.nursingLevel] ?? p.nursingLevel)
          : '护理级别未评',
        riskScore: score,
        riskLevel: toRiskLevel(score),
        riskFlags: (p.riskFlags ?? []).filter(Boolean),
        notes: p.notes,
      } satisfies RiskPatient;
    })
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      const la = LEVEL_ORDER[a.nursingLevel] ?? 0;
      const lb = LEVEL_ORDER[b.nursingLevel] ?? 0;
      if (lb !== la) return lb - la;
      const bedA = a.bedNo ?? '';
      const bedB = b.bedNo ?? '';
      if (bedA !== bedB) return bedA < bedB ? -1 : 1;
      return a.patientId < b.patientId ? -1 : 1;
    });

  // 护理要点：过滤空内容
  const carePoints: CarePoint[] = (d.carePoints ?? [])
    .filter((c) => c && typeof c.content === 'string' && c.content.trim().length > 0)
    .map((c) => ({ patientId: c.patientId, content: c.content.trim(), category: c.category }));

  // 接班待办：剔除已完成，按 priority 升序
  const pendingTasks: PendingTask[] = (d.pendingTasks ?? [])
    .filter((t) => t && !t.done && typeof t.content === 'string' && t.content.trim().length > 0)
    .map((t, i) => ({
      taskId: t.taskId ?? `task-${i + 1}`,
      patientId: t.patientId,
      patientName: t.patientName,
      content: t.content.trim(),
      priority: typeof t.priority === 'number' ? t.priority : 5,
    }))
    .sort((a, b) => a.priority - b.priority);

  // 经验教训
  const lessons: Lesson[] = (d.lessons ?? [])
    .filter((l) => l && typeof l.title === 'string' && l.title.trim().length > 0)
    .map((l, i) => ({
      lessonId: l.lessonId ?? `lesson-${i + 1}`,
      title: l.title.trim(),
      summary: l.summary,
      level: l.level === 'warn' || l.level === 'tip' ? l.level : 'info',
    }));

  return {
    nurseId: nurseId || 'unknown',
    wardId: wardId || '',
    shiftType: shift,
    shiftLabel: SHIFT_LABEL[shift],
    generatedAt: d.generatedAt || '本班次',
    riskPatients,
    carePoints,
    pendingTasks,
    lessons,
  };
}

/* --------------------------- 纯函数：交班报告渲染 --------------------------- */

function fmtRiskFlags(flags: string[]): string {
  if (flags.length === 0) return '无明确风险标签';
  return flags.map((f) => RISK_FLAG_LABEL[f] ?? f).join(' / ');
}

/**
 * 一键生成交班报告（依据宪法第七章）：
 * 固定版式，任何 handover 输入都产出稳定文本；空病区也有兜底文案，不抛异常。
 */
export function formatHandoverReport(handover: NursingHandover): string {
  const lines: string[] = [];
  const sep = '════════════════════════════════';

  lines.push(sep);
  lines.push('护理交接班智能交班报告');
  lines.push(sep);
  lines.push(`交班护士：${handover.nurseId}　病区：${handover.wardId || '未指定'}　班次：${handover.shiftLabel}`);
  lines.push(`生成时间：${handover.generatedAt}`);
  lines.push('');

  // 一、风险患者
  lines.push(`一、风险患者（按风险高低排序，共 ${handover.riskPatients.length} 人）`);
  if (handover.riskPatients.length === 0) {
    lines.push('  本班区暂无在册患者记录。');
  } else {
    handover.riskPatients.forEach((p, i) => {
      const who = [
        `${i + 1}.[${RISK_LEVEL_LABEL[p.riskLevel]}]`,
        p.bedNo ? `${p.bedNo}床` : '',
        p.name,
        p.diagnosis ? `（${p.diagnosis}）` : '',
      ].filter(Boolean).join(' ');
      lines.push(`  ${who}　风险分 ${p.riskScore}　${p.nursingLevel}　风险标签：${fmtRiskFlags(p.riskFlags)}`);
      if (p.notes) lines.push(`    病情备注：${p.notes}`);
    });
  }
  lines.push('');

  // 二、护理要点
  lines.push(`二、护理要点（共 ${handover.carePoints.length} 条）`);
  if (handover.carePoints.length === 0) {
    lines.push('  按医嘱执行基础护理与病情观察。');
  } else {
    handover.carePoints.forEach((c, i) => {
      const who = c.patientId ? `[${c.patientId}]` : '';
      const cat = c.category ? `[${c.category}]` : '';
      lines.push(`  ${i + 1}.${who}${cat}${c.content}`);
    });
  }
  lines.push('');

  // 三、接班待办
  lines.push(`三、接班待办（共 ${handover.pendingTasks.length} 项）`);
  if (handover.pendingTasks.length === 0) {
    lines.push('  无特殊待办事项，继续密切观察病情变化。');
  } else {
    handover.pendingTasks.forEach((t, i) => {
      const who = t.patientName ? `${t.patientName}床旁` : (t.patientId ? `[${t.patientId}]` : '');
      lines.push(`  ${i + 1}.${who}${t.content}（优先级 ${t.priority}）`);
    });
  }
  lines.push('');

  // 四、经验教训
  lines.push(`四、经验教训沉淀（共 ${handover.lessons.length} 条）`);
  if (handover.lessons.length === 0) {
    lines.push('  本班次无新增教训条目。');
  } else {
    handover.lessons.forEach((l, i) => {
      const lv = l.level === 'warn' ? '警示' : l.level === 'tip' ? '提示' : '经验';
      lines.push(`  ${i + 1}.[${lv}]《${l.title}》${l.summary ? `——${l.summary}` : ''}`);
    });
  }

  lines.push('');
  lines.push('— 本报告由健澜护理交接班智能助手自动汇总，仅供交班参考，不替代临床判断 —');
  lines.push('杭州健澜科技有限公司 · 依据宪法第七章');

  return lines.join('\n');
}
