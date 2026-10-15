/**
 * 健澜科技 jlmedaios - Doctor MUSE 员工个人经验上下文注入聚合器（依据宪法第七章）
 *
 * 依据宪法第七章（员工工作台与个人经验沉淀）：在 Doctor MUSE 对话开始前，
 *   把「该员工本人」的历史决策记忆按岗位角色注入 system prompt——
 *   医生看病→注入诊断/用药模式；护士交班→注入风险识别模式；
 *   药师审方→注入药物相互作用模式；管理员看数→注入历史管理决策效果。
 *
 * 与现有 agentContextAggregator 的合并思路（不修改该文件，仅在新聚合器层叠加）：
 *   agentContextAggregator.buildAgentContext 产出「患者画像 + 医生偏好 + 科室知识」
 *   三路公共上下文；本聚合器把它作为 patientContext 入参原样承接，并在其上再叠加
 *   「个人经验」第四段，形成 医生偏好 + 患者画像 + 科室知识 + 个人经验 的完整上下文。
 *
 * 设计要点：
 *  - buildStaffMuseContext 为纯函数：不打库、不读环境、不修改入参，给定输入恒定输出；
 *  - 失败经验优先级更高：结局为 failure 的记忆条目一律置顶，且每条以「教训」标注；
 *    成功经验按权重（历史出现次数）降序紧随其后；
 *  - 隐私红线（依据宪法第七章）：记忆摘要只含脱敏临床标签，不渲染患者姓名 / 身份证号
 *    等直接标识符；清单截断防 prompt 爆炸；
 *  - 冷启动兜底：患者上下文与个人记忆全空时返回固定兜底文案，绝不拼出空 prompt。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 员工岗位角色：决定注入哪一类历史决策模式 */
export type StaffRole = 'doctor' | 'nurse' | 'pharmacist' | 'admin';

/** 单条历史决策记忆（个人经验自学习产物） */
export interface StaffDecisionMemoryItem {
  /** 决策摘要（脱敏临床标签；不得含患者姓名 / 身份证号等直接标识符） */
  summary: string;
  /** 决策结局：failure=失败/教训（置顶并标注「教训」）；success=成功经验 */
  outcome: 'success' | 'failure';
  /** 权重：同类决策历史出现次数 / 置信度；缺省视为 1 */
  weight?: number;
}

/** 员工历史决策记忆（个人经验段的输入数据） */
export interface StaffMemory {
  /** 员工工号（内部主键） */
  staffId: string;
  /** 员工岗位角色 */
  role: StaffRole;
  /** 历史决策记忆条目（建议已按时间倒序，本聚合器内部会重排优先级） */
  items: StaffDecisionMemoryItem[];
}

/* ------------------------------------------------------------------ */
/* 角色元数据（纯数据表）                                               */
/* ------------------------------------------------------------------ */

/** 每个岗位：中文称呼 + 工作场景 + 个人经验段标题 */
const ROLE_META: Readonly<
  Record<StaffRole, { label: string; scene: string; pattern: string }>
> = {
  doctor: { label: '医生', scene: '看病诊疗', pattern: '诊断与用药模式' },
  nurse: { label: '护士', scene: '护理交班', pattern: '交班风险识别模式' },
  pharmacist: { label: '药师', scene: '处方审核', pattern: '药物相互作用模式' },
  admin: { label: '管理员', scene: '运营看数决策', pattern: '历史管理决策效果' },
};

/** 未知角色时的兜底元数据（防御性渲染，不抛错） */
const UNKNOWN_ROLE_META = { label: '员工', scene: '院内工作', pattern: '历史决策模式' } as const;

/* ------------------------------------------------------------------ */
/* 渲染上限                                                            */
/* ------------------------------------------------------------------ */

/** 个人经验段最多列出几条，防 prompt 爆炸 */
const MAX_MEMORY_ITEMS = 6;

/* ------------------------------------------------------------------ */
/* system prompt 上下文块文案                                           */
/* ------------------------------------------------------------------ */

/** 员工个人经验上下文块的统一抬头 */
const STAFF_CONTEXT_HEADER =
  '【员工个人经验上下文｜以下为该员工历史决策自学习沉淀，仅供参考；最终诊疗/管理决策由执业人员依规做出】';

/** 患者场景上下文段（承接 agentContextAggregator.buildAgentContext 的产出）标题 */
const PATIENT_CONTEXT_SECTION_TITLE =
  '■ 当前场景上下文（已合并 患者画像 + 医生偏好 + 科室知识）';

/** 患者上下文与个人记忆全空时的冷启动兜底文案（明确告知模型「无个人经验」，而非静默） */
const EMPTY_FALLBACK =
  '【员工个人经验】暂无可复用的个人决策记忆（历史经验为空），本次属冷启动场景，请结合最新临床数据、科室规范与上级医师指导执行。';

/* ------------------------------------------------------------------ */
/* 纯函数：排序                                                        */
/* ------------------------------------------------------------------ */

/**
 * 把记忆条目按「失败置顶、权重降序、稳定保留原序」重排。
 *
 * 排序口径（依据宪法第七章——失败经验优先级更高）：
 *  - 第一排序键：outcome === 'failure' 的条目一律排在 success 之前；
 *  - 第二排序键：同组内按 weight 降序（历史出现次数越多权重越大）；
 *  - 第三排序键：weight 相同时保留输入原顺序，保证输出确定、可快照；
 *  - summary 为空串的条目直接丢弃，不进入渲染。
 *
 * 纯函数：返回新数组，不修改入参。
 *
 * @param items 原始记忆条目（可空）
 * @returns 排序、清洗后的新条目数组
 */
export function sortStaffMemoryItems(
  items: readonly StaffDecisionMemoryItem[] | null | undefined,
): StaffDecisionMemoryItem[] {
  return (items ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item && (item.summary ?? '').trim().length > 0)
    .sort((a, b) => {
      // 失败教训置顶
      const aFail = a.item.outcome === 'failure' ? 0 : 1;
      const bFail = b.item.outcome === 'failure' ? 0 : 1;
      if (aFail !== bFail) return aFail - bFail;
      // 同组内权重降序
      const aw = typeof a.item.weight === 'number' && a.item.weight > 0 ? a.item.weight : 1;
      const bw = typeof b.item.weight === 'number' && b.item.weight > 0 ? b.item.weight : 1;
      if (bw !== aw) return bw - aw;
      // 稳定排序
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/* ------------------------------------------------------------------ */
/* 纯函数：单条渲染                                                    */
/* ------------------------------------------------------------------ */

/**
 * 渲染一条记忆：失败教训以「教训」前缀置顶标注，成功经验带次数权重。
 * @param item 已清洗的记忆条目
 * @returns 单行文本
 */
function renderMemoryLine(item: StaffDecisionMemoryItem): string {
  const summary = item.summary.trim();
  const weight = typeof item.weight === 'number' && item.weight > 1 ? `×${item.weight}` : '';
  if (item.outcome === 'failure') {
    return `- 「教训」${summary}${weight}`;
  }
  return `- ${summary}${weight}`;
}

/* ------------------------------------------------------------------ */
/* 纯函数：段渲染                                                      */
/* ------------------------------------------------------------------ */

/**
 * 渲染员工角色行：角色称呼 + 工作场景 + 工号。
 *
 * 工号为内部员工主键（非患者隐私字段），用于在多人共用 MUSE 实例时区分记忆归属。
 *
 * @param role    员工岗位角色
 * @param staffId 员工工号
 * @returns 角色段文本
 */
export function renderRoleLine(
  role: StaffRole | null | undefined,
  staffId: string | null | undefined,
): string {
  const meta = (role && ROLE_META[role]) || UNKNOWN_ROLE_META;
  const id = (staffId ?? '').trim() || '未登记';
  return `■ 员工：${meta.label}（${meta.scene}）｜工号：${id}`;
}

/**
 * 渲染个人历史决策段。
 *
 * 段标题按岗位角色区分：
 *  - doctor→诊断与用药模式；nurse→交班风险识别模式；
 *  - pharmacist→药物相互作用模式；admin→历史管理决策效果。
 * 段内条目已按 sortStaffMemoryItems 重排（失败置顶、权重降序）。
 *
 * @param role   员工岗位角色
 * @param memory 员工历史决策记忆
 * @returns 段文本；无有效条目时返回空串
 */
export function renderStaffMemorySection(
  role: StaffRole | null | undefined,
  memory: StaffMemory | null | undefined,
): string {
  const sorted = sortStaffMemoryItems(memory?.items);
  if (sorted.length === 0) return '';

  const meta = (role && ROLE_META[role]) || UNKNOWN_ROLE_META;
  const lines = sorted.slice(0, MAX_MEMORY_ITEMS).map(renderMemoryLine);
  return [
    `■ 个人历史决策（${meta.pattern}｜失败经验置顶并标注「教训」）`,
    ...lines,
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* buildStaffMuseContext（纯函数主入口）                               */
/* ------------------------------------------------------------------ */

/**
 * buildStaffMuseContext：按员工岗位角色注入个人历史决策模式，聚合为一段可直接
 * 拼入 Doctor MUSE system prompt 的上下文文本。
 *
 * 拼装顺序（自上而下）：
 *  1. 统一抬头（声明自学习沉淀仅供参考）；
 *  2. 员工角色行（称呼 + 场景 + 工号，始终渲染）；
 *  3. 当前场景上下文段：原样承接 patientContext——建议传入
 *     agentContextAggregator.buildAgentContext(...) 的输出（患者画像+医生偏好+科室知识）；
 *  4. 个人历史决策段：按角色注入对应模式，失败经验置顶并标注「教训」。
 *
 * 纯函数：不修改入参；任一参数为 null / undefined / 空结构时对应段被剔除，绝不抛错。
 *
 * 脱敏（依据宪法第七章）：记忆摘要仅含脱敏临床标签，不携带患者姓名 / 身份证号等
 *   直接标识符；清单截断防 prompt 膨胀。
 *
 * @param staffId        员工工号（可空，空时显示「未登记」）
 * @param role           员工岗位角色（doctor/nurse/pharmacist/admin）
 * @param patientContext 当前场景上下文文本（可空；建议为 buildAgentContext 输出）
 * @param memory         员工历史决策记忆（可空）
 * @returns 可直接拼入 system prompt 的上下文文本
 */
export function buildStaffMuseContext(
  staffId: string | null | undefined,
  role: StaffRole | null | undefined,
  patientContext: string | null | undefined,
  memory: StaffMemory | null | undefined,
): string {
  const patientText = (patientContext ?? '').trim();
  const memoryText = renderStaffMemorySection(role, memory);

  // 冷启动兜底：场景上下文与个人记忆全空时，返回固定兜底文案
  if (patientText === '' && memoryText === '') return EMPTY_FALLBACK;

  const parts: string[] = [STAFF_CONTEXT_HEADER, renderRoleLine(role, staffId)];

  if (patientText !== '') {
    parts.push(`${PATIENT_CONTEXT_SECTION_TITLE}\n${patientText}`);
  }
  if (memoryText !== '') {
    parts.push(memoryText);
  }

  return parts.join('\n');
}
