/**
 * 健澜科技 jlmedaios - 医院知识回流聚合器（M114-D，依据宪法第七章）
 *
 * 三级晋升机制（个人 → 科室 → 医院，依据宪法第七章）：
 *  - 个人在临床实践中沉淀的经验先入科室 muse（DeptMuse）；
 *  - 科室知识经「脱敏 + 来源标注 + 教训加权」后回流医院层 muse
 *    （promoteToHospital），形成全院共享的组织记忆；
 *  - 新员工入职时按角色加载医院基线（loadHospitalBaseline），完成知识传承闭环。
 *
 * 医疗安全与隐私红线（依据宪法第七章）：
 *  - 回流医院层必须脱敏：作者工号 / 姓名等个人标识符不得随知识上行；
 *  - 正文内的手机号、身份证号、工号、署名等个人标识一律掩码为「已脱敏」；
 *  - 每条知识标注来源角色（doctor / nurse / pharma / admin），全程可溯源；
 *  - 失败经验（教训）优先级更高，置顶展示，避免同类错误在全院重复发生；
 *  - 本模块只做知识沉淀与排序，不改变医嘱、不强制改派诊疗方案。
 *
 * 纯函数核心（可单测、不触库、不碰 WebSocket、零新增依赖）：
 *  - promoteToHospital(deptMuse, hospitalMuse)：科室知识脱敏回流医院层；
 *  - loadHospitalBaseline(role, deptCode)：新员工按角色加载医院基线；
 *  - desensitize(raw)：正文个人标识符掩码（导出供复用与单测）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 知识来源角色（依据宪法第七章：每条知识须标注来源、可溯源） */
export type KnowledgeRole = 'doctor' | 'nurse' | 'pharma' | 'admin';

/** 知识晋升层级：个人 → 科室 → 医院 */
export type KnowledgeTier = 'personal' | 'dept' | 'hospital';

/** 合法来源角色白名单 */
export const KNOWLEDGE_ROLES: readonly KnowledgeRole[] = [
  'doctor',
  'nurse',
  'pharma',
  'admin',
];

/** 教训优先级（数值越小越靠前；依据宪法第七章失败经验优先置顶） */
export const LESSON_PRIORITY = 1;
/** 常规知识优先级 */
export const STANDARD_PRIORITY = 2;

/** 科室层待回流知识条目（含个人标识符，晋升医院层时脱敏） */
export interface DeptMuseEntry {
  /** 条目主键 */
  id: string;
  /** 来源科室编码 */
  deptCode: string;
  /** 条目标题 */
  title: string;
  /** 知识正文（可能夹带个人标识符，上行前脱敏） */
  content: string;
  /** 来源角色 */
  sourceRole: KnowledgeRole;
  /** 是否失败经验（教训） */
  isLesson: boolean;
  /** 个人标识符：作者工号（不上行医院层） */
  authorId: string;
  /** 个人标识符：作者姓名（不上行医院层） */
  authorName: string;
  /** 采纳成功率 0~1 */
  successRate: number;
  /** 累计使用次数 */
  usageCount: number;
  /** 最近更新时间（ISO） */
  updatedAt: string;
}

/** 科室知识容器（科室 muse） */
export interface DeptMuse {
  /** 科室编码 */
  deptCode: string;
  /** 科室沉淀条目（只读视图） */
  entries: readonly DeptMuseEntry[];
}

/** 医院层知识条目（脱敏后产物，无个人标识符） */
export interface HospitalKnowledgeEntry {
  /** 条目主键（继承科室条目 id） */
  id: string;
  /** 来源科室编码 */
  deptCode: string;
  /** 晋升层级（回流后恒为 hospital） */
  tier: KnowledgeTier;
  /** 条目标题 */
  title: string;
  /** 脱敏后正文 */
  content: string;
  /** 来源角色标注 */
  sourceRole: KnowledgeRole;
  /** 是否失败经验（教训） */
  isLesson: boolean;
  /** 优先级：教训=1（更高），常规=2；数值越小越靠前 */
  priority: number;
  /** 采纳成功率 0~1 */
  successRate: number;
  /** 累计使用次数 */
  usageCount: number;
  /** 最近更新时间（ISO） */
  updatedAt: string;
}

/** 医院知识容器（医院 muse） */
export interface HospitalMuse {
  /** 全院共享知识条目（已排序：教训置顶） */
  entries: HospitalKnowledgeEntry[];
  /** 容器更新时间（ISO） */
  updatedAt: string;
}

/** loadHospitalBaseline 返回的新员工入职基线 */
export interface HospitalBaseline {
  /** 归一化后的来源角色 */
  role: KnowledgeRole;
  /** 入职科室编码 */
  deptCode: string;
  /** 层级（恒为 hospital） */
  tier: KnowledgeTier;
  /** 医院基线条目（教训置顶） */
  entries: HospitalKnowledgeEntry[];
  /** 基线生成时间（ISO） */
  generatedAt: string;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/** 个人标识符掩码占位（依据宪法第七章：个人标识不得上行医院层） */
const MASK = '「已脱敏」';

/**
 * desensitize：脱敏正文，去除个人标识符（依据宪法第七章）。
 *
 * 掩码规则（确定性、可单测）：
 *  - 11 位中国大陆手机号；
 *  - 18 位身份证号（末位可为 X/x）；
 *  - 工号 / 职工号 / 编号 后的数字或字母串；
 *  - 「作者 / 署名：姓名」形式的署名。
 *
 * 纯函数：不修改入参字符串，返回新字符串。
 *
 * @param raw 原始正文（可能夹带个人标识符）
 * @returns 掩码后的正文
 */
export function desensitize(raw: string): string {
  return (raw ?? '')
    .replace(/1[3-9]\d{9}/g, MASK)
    .replace(/\d{17}[\dXx]/g, MASK)
    .replace(/(工号|职工号|编号)\s*[:：]?\s*[A-Za-z0-9]+/g, `$1${MASK}`)
    .replace(/(作者|署名)\s*[:：]?\s*[\u4e00-\u9fa5]{2,4}/g, `$1：${MASK}`);
}

/**
 * 医院层条目统一排序：教训置顶（优先级升序）→ 成功率降序 →
 * 使用次数降序 → 标题字典序升序，保证结果确定、可单测。
 */
function sortHospitalEntries(
  a: HospitalKnowledgeEntry,
  b: HospitalKnowledgeEntry,
): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (b.successRate !== a.successRate) return b.successRate - a.successRate;
  if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
  return a.title.localeCompare(b.title);
}

/**
 * promoteToHospital：科室知识经脱敏后回流医院层（个人→科室→医院三级晋升，
 * 依据宪法第七章）。
 *
 * 口径：
 *  1. 逐条读取科室条目，剥离个人标识符（authorId / authorName 不上行），
 *     正文经 desensitize 掩码手机号 / 身份证 / 工号 / 署名；
 *  2. 标注来源角色 sourceRole（非法值归一为 doctor）；
 *  3. 失败经验（isLesson）优先级置为 LESSON_PRIORITY，置顶展示；
 *  4. 同名标题条目合并：usageCount 累加，successRate 按使用次数加权，
 *     任一侧为教训则合并后为教训（高优先级不丢失）；
 *  5. 返回新的 HospitalMuse（不修改入参对象/数组），条目按统一排序输出。
 *
 * @param deptMuse     待回流的科室知识容器
 * @param hospitalMuse 既有医院层知识容器（可传 entries 为空的空容器）
 * @returns 更新后的医院层知识容器（已脱敏、已标注、教训置顶）
 */
export function promoteToHospital(
  deptMuse: DeptMuse,
  hospitalMuse: HospitalMuse,
): HospitalMuse {
  const byTitle = new Map<string, HospitalKnowledgeEntry>();
  for (const e of hospitalMuse.entries) byTitle.set(e.title, e);

  for (const dept of deptMuse.entries ?? []) {
    const sourceRole = KNOWLEDGE_ROLES.includes(dept.sourceRole)
      ? dept.sourceRole
      : 'doctor';
    const promoted: HospitalKnowledgeEntry = {
      id: dept.id,
      deptCode: dept.deptCode,
      tier: 'hospital',
      title: dept.title,
      content: desensitize(dept.content),
      sourceRole,
      isLesson: dept.isLesson,
      priority: dept.isLesson ? LESSON_PRIORITY : STANDARD_PRIORITY,
      successRate: dept.successRate,
      usageCount: dept.usageCount,
      updatedAt: dept.updatedAt,
    };

    const prev = byTitle.get(promoted.title);
    if (prev) {
      // 同名知识合并：次数累加、成功率加权、教训属性以高优先级为准
      const usageCount = prev.usageCount + promoted.usageCount;
      const weighted =
        (prev.successRate * prev.usageCount +
          promoted.successRate * promoted.usageCount) /
        usageCount;
      const isLesson = prev.isLesson || promoted.isLesson;
      byTitle.set(promoted.title, {
        ...prev,
        usageCount,
        successRate: Math.round(weighted * 10000) / 10000,
        isLesson,
        priority: isLesson ? LESSON_PRIORITY : STANDARD_PRIORITY,
      });
    } else {
      byTitle.set(promoted.title, promoted);
    }
  }

  return {
    entries: [...byTitle.values()].sort(sortHospitalEntries),
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------ 医院基线 ------------------------------ */

/** 确定性演示基线种子（新员工入职 / 空库兜底用，依据宪法第七章） */
const BASELINE_SEED: Record<
  KnowledgeRole,
  Array<{
    title: string;
    content: string;
    isLesson: boolean;
    successRate: number;
    usageCount: number;
  }>
> = {
  doctor: [
    {
      title: '首程与三级查房口径',
      content: '入院 8 小时内完成首次病程，主治/主任查房按级别时效签署，诊疗计划可追溯。',
      isLesson: false,
      successRate: 0.94,
      usageCount: 210,
    },
    {
      title: '教训：高警示药品双人核对',
      content: '曾出现未双人核对导致给药剂量偏差，此后高警示药品一律双人核对双签。',
      isLesson: true,
      successRate: 0.8,
      usageCount: 96,
    },
  ],
  nurse: [
    {
      title: '护理分级与交接班',
      content: '按 Barthel/Morse 评分落实护理分级，危重患者床旁交接、管路逐项清点。',
      isLesson: false,
      successRate: 0.91,
      usageCount: 180,
    },
    {
      title: '教训：跌倒高危识别',
      content: '曾有高危患者未纳入交班发生跌倒，此后 Morse≥45 分一律床头警示并交班。',
      isLesson: true,
      successRate: 0.82,
      usageCount: 120,
    },
  ],
  pharma: [
    {
      title: '处方前置审核要点',
      content: '适应症、用法用量、相互作用、过敏史四查，不合理处方拦截并反馈医师。',
      isLesson: false,
      successRate: 0.93,
      usageCount: 160,
    },
    {
      title: '教训：皮试阳性标识闭环',
      content: '曾因皮试阳性未在病历醒目标识致重复用药风险，此后阳性结果红字置顶并交班。',
      isLesson: true,
      successRate: 0.78,
      usageCount: 74,
    },
  ],
  admin: [
    {
      title: '病历质控时限管理',
      content: '出院病历 3 个工作日内归档，运行病历 7 日质控，缺陷闭环到科室考核。',
      isLesson: false,
      successRate: 0.89,
      usageCount: 130,
    },
    {
      title: '教训：应急演练留痕',
      content: '曾因应急演练无记录被督导扣分，此后演练方案、签到、评估表三留痕归档。',
      isLesson: true,
      successRate: 0.81,
      usageCount: 60,
    },
  ],
};

/**
 * loadHospitalBaseline：新员工入职启动时加载医院基线（依据宪法第七章）。
 *
 * 口径：
 *  - role 非法或缺省时归一为 doctor；deptCode 去空白；
 *  - 按角色返回确定性基线种子（含一条教训 + 一条常规知识），
 *    正文经 desensitize 脱敏，条目按「教训置顶 → 成功率降序」排序；
 *  - 纯函数：不触库、不读文件，结果确定可单测。
 *
 * @param role     入职角色（doctor/nurse/pharma/admin，缺省归一 doctor）
 * @param deptCode 入职科室编码
 * @returns 医院入职基线（已标注来源角色、教训置顶）
 */
export function loadHospitalBaseline(
  role: string | undefined,
  deptCode: string | undefined,
): HospitalBaseline {
  const normalized = KNOWLEDGE_ROLES.includes(role as KnowledgeRole)
    ? (role as KnowledgeRole)
    : 'doctor';
  const code = (deptCode ?? '').trim();

  const entries: HospitalKnowledgeEntry[] = BASELINE_SEED[normalized].map(
    (s, i) => ({
      id: `baseline-${normalized}-${i + 1}`,
      deptCode: code,
      tier: 'hospital',
      title: s.title,
      content: desensitize(s.content),
      sourceRole: normalized,
      isLesson: s.isLesson,
      priority: s.isLesson ? LESSON_PRIORITY : STANDARD_PRIORITY,
      successRate: s.successRate,
      usageCount: s.usageCount,
      updatedAt: new Date(0).toISOString(),
    }),
  );

  return {
    role: normalized,
    deptCode: code,
    tier: 'hospital',
    entries: entries.sort(sortHospitalEntries),
    generatedAt: new Date().toISOString(),
  };
}
