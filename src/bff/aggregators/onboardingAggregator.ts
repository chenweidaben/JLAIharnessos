/**
 * 健澜科技 jlmedaios - 后继者入职向导 Onboarding（M115-C）
 *
 * 依据宪法第七章 7.8「后继者机制」：
 *  新员工（医生 / 护士 / 药师）入职时，自动加载本科室基线
 * （deptBaseline），把前辈们沉淀的高频成功经验与必读教训
 * 一次性编成「入职向导」，先读教训再上手决策。
 *
 * 本聚合器是纯函数核心（不触库、无副作用、可直接单测）：
 *  - buildNewHireOnboarding(role, deptCode, deptMuse)：
 *      消费 M114 buildDeptMuse 的产物 DeptMuse，
 *      输出欢迎语 + Top5 高频成功经验 + Top3 重要教训 +
 *      科室推荐学习路径（deptPath）；
 *  - 空科室（staffSize=0）兜底：返回结构完整的零值结果，
 *    绝不抛异常，deptPath 给出「联系带教老师」的冷启动指引。
 *
 * 注意：本聚合器不做排序——deptMuse.topDecisions / topFailures
 * 在 M114 已按频次三级排序，这里只做「截断 + 字段投影 + 文案组装」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type {
  AggregatedMuseTopic,
  DeptMuse,
  StaffRole,
} from './deptMuseAggregator';

/* ------------------------------- 类型契约 ------------------------------- */

/** 向导中的单条经验（成功 / 教训同构，由分桶来源区分） */
export interface OnboardingExperienceItem {
  /** 决策要点主题 */
  topic: string;
  /** 代表性经验正文 */
  content: string;
  /** 跨员工累计决策次数（高频口径） */
  totalCount: number;
  /** 参与该决策的员工数 */
  staffCount: number;
  /** 涉及角色（doctor→nurse→pharmacist canonical 顺序） */
  roles: StaffRole[];
  /** 按决策次数加权的平均有效率 0~1 */
  avgSuccessRate: number;
}

/** buildNewHireOnboarding 总产出 */
export interface NewHireOnboarding {
  /** 欢迎语：「欢迎加入XX科，您的前辈们留下了 N 条经验。」 */
  welcomeMessage: string;
  /** 前辈沉淀的经验总条数（= 科室基线 totalEntries） */
  totalExperiences: number;
  /** Top5 高频成功经验（按频次降序） */
  topSuccesses: OnboardingExperienceItem[];
  /** Top3 重要教训（红色高亮展示，先避坑再上手） */
  topLessons: OnboardingExperienceItem[];
  /** 科室推荐学习路径（有序步骤文案） */
  deptPath: string[];
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 成功经验上榜条数（高频模仿清单） */
export const MAX_TOP_SUCCESSES = 5;
/** 教训上榜条数（必读避坑清单，短以便精读） */
export const MAX_TOP_LESSONS = 3;

/** 岗位角色 → 中文称呼（未知角色回落「同事」） */
const ROLE_LABEL: Record<string, string> = {
  doctor: '医生',
  nurse: '护士',
  pharmacist: '药师',
  admin: '管理员',
};

/** 科室编码 → 科室名（常见科室；未命中时回落「{code}科」） */
const DEPT_LABEL: Record<string, string> = {
  'DEP-IM': '内科',
  'DEP-SUR': '外科',
  'DEP-PED': '儿科',
  'DEP-OB': '妇产科',
  'DEP-EMG': '急诊科',
  'DEP-ICU': '重症医学科',
  'DEP-CARD': '心血管内科',
  'DEP-NEU': '神经内科',
};

/** 岗位角色中文称呼（防御未知值） */
function roleLabelOf(role: string): string {
  return ROLE_LABEL[role] ?? '同事';
}

/** 科室展示名（防御空串 / 未命中等） */
function deptLabelOf(deptCode: string): string {
  const code = (deptCode ?? '').trim();
  if (!code) return '本科室';
  return DEPT_LABEL[code] ?? `${code}科`;
}

/** 把 M114 聚合主题投影为向导经验条目（lesson 标记在分桶阶段已分离） */
function toItem(t: AggregatedMuseTopic): OnboardingExperienceItem {
  return {
    topic: t.topic,
    content: t.content,
    totalCount: t.totalCount,
    staffCount: t.staffCount,
    roles: t.roles,
    avgSuccessRate: t.avgSuccessRate,
  };
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * buildNewHireOnboarding：后继者入职向导总入口（依据宪法第七章 7.8）。
 *
 * 流程：
 *  1. 防御入参：deptMuse 为空时按空科室基线处理，绝不抛错；
 *  2. Top5 高频成功经验 = deptMuse.topDecisions 截断（已按频次降序）；
 *  3. Top3 重要教训 = deptMuse.topFailures 截断（失败经验单独成桶）；
 *  4. 欢迎语拼装：科室名 + 角色称呼 + 前辈经验总条数；
 *  5. 科室推荐路径：研读基线 → 模仿高频决策 → 牢记教训 →
 *     带教下首例独立决策并复盘归档。
 *
 * 纯函数：不修改入参，空科室返回结构完整的零值结果。
 *
 * @param role 新员工岗位角色（doctor / nurse / pharmacist…）
 * @param deptCode 科室编码
 * @param deptMuse M114 buildDeptMuse 的产物（可为 null/undefined）
 * @returns 欢迎语、Top5 成功、Top3 教训与推荐路径四件套
 */
export function buildNewHireOnboarding(
  role: string,
  deptCode: string,
  deptMuse: DeptMuse | null | undefined,
): NewHireOnboarding {
  const deptLabel = deptLabelOf(deptCode);
  const roleLabel = roleLabelOf(role);

  const baseline = deptMuse?.deptBaseline;
  const staffSize = baseline?.staffSize ?? 0;
  const totalExperiences = baseline?.totalEntries ?? 0;

  /* 空科室兜底：前辈尚无经验沉淀，deptPath 给冷启动指引 */
  if (staffSize === 0) {
    return {
      welcomeMessage: `欢迎加入${deptLabel}，您的前辈们尚未沉淀任何经验。`,
      totalExperiences: 0,
      topSuccesses: [],
      topLessons: [],
      deptPath: [
        `当前科室暂无前辈经验沉淀，请联系科教科分配带教老师，先从科室诊疗规范手册学起；作为${roleLabel}，请在带教下完成首周跟岗后再独立决策。`,
      ],
    };
  }

  /* Top5 成功 / Top3 教训（M114 已排序，此处只截断投影） */
  const topSuccesses = (deptMuse!.topDecisions ?? [])
    .slice(0, MAX_TOP_SUCCESSES)
    .map(toItem);
  const topLessons = (deptMuse!.topFailures ?? [])
    .slice(0, MAX_TOP_LESSONS)
    .map(toItem);

  const welcomeMessage = `欢迎加入${deptLabel}，${roleLabel}新同事：您的前辈们留下了 ${totalExperiences} 条经验。`;

  /* 科室推荐路径（有序；空段自动跳过，保证步骤文案连续） */
  const deptPath: string[] = [];
  const baselineTopics = baseline?.baselineTopics ?? [];
  if (baselineTopics.length > 0) {
    deptPath.push(
      `第1步 · 研读科室基线：${baselineTopics.slice(0, 3).join('、')}。`,
    );
  }
  if (topSuccesses.length > 0) {
    deptPath.push(
      `第2步 · 模仿高频成功决策：${topSuccesses
        .slice(0, 3)
        .map((t) => t.topic)
        .join('、')}。`,
    );
  }
  if (topLessons.length > 0) {
    deptPath.push(
      `第3步 · 牢记必读教训（先避坑再上手）：${topLessons
        .slice(0, 3)
        .map((t) => t.topic)
        .join('、')}。`,
    );
  }
  deptPath.push(
    `第4步 · 在带教老师指导下以${roleLabel}身份完成首例独立决策，并复盘归档进科室经验库。`,
  );

  return {
    welcomeMessage,
    totalExperiences,
    topSuccesses,
    topLessons,
    deptPath,
  };
}

/* ============================================================================
 * M134-A · 新员工入职向导（时间轴 4 阶段 + 进度追踪）
 * ----------------------------------------------------------------------------
 * 「后继者站在巨人肩膀上」——让新员工在第 1 天 / 第 1 周 / 第 1 月 / 第 3 月
 * 四个关键节点上，都能从 Personal Agent 拿到一份与自己岗位匹配的、可勾选的
 * 任务清单，并实时看到自己相对入职基线的「智慧度」成长曲线。
 *
 * 【用户体验深化】
 *  - 阶段标题直接说人话（第1天/第1周/第1月/第3月），不堆术语；
 *  - 每条任务都是动词开头的可执行动作，避免「了解/熟悉」这种无法验收的词；
 *  - 第3月固定带「智慧度成长对比」，让新员工看见自己的进步，而非只看缺口；
 *  - 角色差异化：医生/护士/药师/管理员拿到的第1周后任务文案各不相同，
 *    不拿一份模板套所有岗位，降低「这页跟我没关系」的疏离感。
 *
 * 本聚合器仍是纯函数：
 *  - buildOnboardingGuide(staffId, role)：纯文案与结构组装，不触库；
 *  - getOnboardingProgress(staffId)：基于 staffId 哈希确定性推演进度，
 *    同一 staffId 永远得到同一结果，便于单测与回放；
 *    后续接入入职进度仓库后，仅需替换内部推演实现，函数签名不变。
 * ==========================================================================*/

/* ------------------------------- 类型契约 ------------------------------- */

/** M134-A 岗位角色（与 deptMuseAggregator.StaffRole 对齐，这里独立约束避免循环依赖） */
export type OnboardingRole = 'doctor' | 'nurse' | 'pharmacist' | 'admin';

/** 四个时间轴阶段的稳定键 */
export type OnboardingStageKey = 'day1' | 'week1' | 'month1' | 'month3';

/** 向导中的单条任务（可勾选、可验收） */
export interface OnboardingTask {
  /** 任务稳定 ID（{stage}-{idx}），前端用于勾选状态持久化 */
  taskId: string;
  /** 任务标题（动词开头） */
  title: string;
  /** 任务说明：为什么做、做完什么样 */
  description: string;
  /** 预计耗时（小时），帮助新员工排期 */
  estimatedHours: number;
}

/** 一个时间轴阶段 */
export interface OnboardingStage {
  stageKey: OnboardingStageKey;
  /** 阶段标题：第1天 / 第1周 / 第1月 / 第3月 */
  title: string;
  /** 阶段一句话目标 */
  goal: string;
  tasks: OnboardingTask[];
}

/** buildOnboardingGuide 总产出 */
export interface Guide {
  staffId: string;
  role: OnboardingRole;
  /** 角色中文称呼 */
  roleLabel: string;
  /** 欢迎语：「{角色}你好，这是你在健澜的前 90 天路线图」 */
  welcome: string;
  /** 四阶段（day1 → month3 有序） */
  stages: OnboardingStage[];
  /** 任务总数（= 所有阶段 tasks 之和） */
  totalTasks: number;
}

/** 单阶段进度 */
export interface StageProgress {
  stageKey: OnboardingStageKey;
  /** 已完成任务数 */
  completed: number;
  /** 该阶段任务总数 */
  total: number;
}

/** getOnboardingProgress 总产出 */
export interface Progress {
  staffId: string;
  /** 已完成任务数（跨阶段汇总） */
  completedTasks: number;
  /** 任务总数（与 Guide.totalTasks 对齐） */
  totalTasks: number;
  /** 0~100 整数百分比 */
  percent: number;
  /** 当前所处阶段（首个未完成阶段） */
  currentStage: OnboardingStageKey;
  /** 分阶段明细 */
  stages: StageProgress[];
  /** 智慧度：入职基线 0~100 */
  wisdomBaseline: number;
  /** 智慧度：当前估值 0~100 */
  wisdomCurrent: number;
}

/* ------------------------------- 常量与文案 ------------------------------- */

/** 岗位角色 → 中文称呼（M134-A 独立字典，未知回落「同事」） */
const ONBOARDING_ROLE_LABEL: Record<OnboardingRole, string> = {
  doctor: '医生',
  nurse: '护士',
  pharmacist: '药师',
  admin: '管理员',
};

/** 阶段固定标题（时间轴说人话，【用户体验深化】） */
const STAGE_TITLE: Record<OnboardingStageKey, string> = {
  day1: '第 1 天',
  week1: '第 1 周',
  month1: '第 1 月',
  month3: '第 3 月',
};

/** 阶段固定目标 */
const STAGE_GOAL: Record<OnboardingStageKey, string> = {
  day1: '登录系统，认识你的 Personal Agent，完成开机五件套',
  week1: '走进科室知识库，把前辈沉淀的经验读一遍',
  month1: '跟随上级查房/带教，在 Personal Agent 里写下你的第一条经验',
  month3: '独立处理常见病，与入职基线做一次智慧度成长对比',
};

/** 阶段顺序（构建与进度推演都依赖这个顺序） */
const STAGE_ORDER: OnboardingStageKey[] = ['day1', 'week1', 'month1', 'month3'];

/** 第1天任务：所有岗位同构（开机流程） */
const DAY1_TASKS: ReadonlyArray<Omit<OnboardingTask, 'taskId'>> = [
  {
    title: '首次登录并修改初始密码',
    description: '用工号 + 初始密码登录，在「个人设置」里改成只有你知道的强密码。',
    estimatedHours: 0.2,
  },
  {
    title: '熟悉工作台布局与快捷入口',
    description: '花 10 分钟点遍左侧菜单，记住「工作台 / 收件箱 / Personal Agent」三个入口。',
    estimatedHours: 0.3,
  },
  {
    title: '与 Personal Agent 完成首次对话',
    description: '在对话框里告诉 Agent 你的岗位、带教老师和本周目标，让它记住你的偏好。',
    estimatedHours: 0.5,
  },
  {
    title: '阅读《新员工必读》与科室公告',
    description: '在知识库首页找到「新员工必读」专题，读完并勾选「已读」。',
    estimatedHours: 1.0,
  },
];

/** 第1周任务：按岗位差异化 */
const WEEK1_TASKS_BY_ROLE: Record<OnboardingRole, ReadonlyArray<Omit<OnboardingTask, 'taskId'>>> = {
  doctor: [
    {
      title: '研读科室常见病诊疗规范',
      description: '在科室知识库里读一遍本科室 TOP10 常见病的诊疗路径，记下 3 个疑问。',
      estimatedHours: 4,
    },
    {
      title: '学习病历书写模板与质控要点',
      description: '打开一份甲级病历范本，对照电子病历五级评审要求标出关键书写节点。',
      estimatedHours: 3,
    },
    {
      title: '跟随带教老师旁听门诊/查房',
      description: '本周至少旁听 2 次带教门诊或 1 次大查房，记录带教老师的临床决策思路。',
      estimatedHours: 6,
    },
  ],
  nurse: [
    {
      title: '学习科室护理常规与应急预案',
      description: '读完本科室护理常规目录与坠床/给药错误应急预案，签字确认。',
      estimatedHours: 4,
    },
    {
      title: '熟悉护理记录单书写规范',
      description: '对照质控标准，打开 3 份在架护理记录，标出书写要点与常见扣分点。',
      estimatedHours: 3,
    },
    {
      title: '跟随带教老师完成床边交接',
      description: '本周至少完成 3 次完整的床边交接班，按 SBAR 结构口述一遍。',
      estimatedHours: 6,
    },
  ],
  pharmacist: [
    {
      title: '学习科室常用药品目录与配伍禁忌',
      description: '在知识库导出本科室 TOP50 常用药目录，标出 5 组高危配伍。',
      estimatedHours: 4,
    },
    {
      title: '学习处方审核流程与发药交代',
      description: '走完一遍处方审核工单流，记录 3 条常见拦截原因。',
      estimatedHours: 3,
    },
    {
      title: '跟随带教老师完成用药指导',
      description: '本周至少跟随 5 位患者完成用药交代，记录 1 个老人用药误区。',
      estimatedHours: 6,
    },
  ],
  admin: [
    {
      title: '学习科室运营报表与关键指标',
      description: '打开科室驾驶舱，理解床位周转率、平均住院日、药占比三个核心指标口径。',
      estimatedHours: 4,
    },
    {
      title: '熟悉 HIS 配置与权限管理',
      description: '在系统管理里走一遍角色权限模板，知道哪些配置改动需要双人复核。',
      estimatedHours: 3,
    },
    {
      title: '跟随带教老师完成一次流程巡检',
      description: '跟随信息科完成一次门诊/住院流程巡检，记录 2 个可优化点。',
      estimatedHours: 6,
    },
  ],
};

/** 第1月任务：按岗位差异化（跟随上级 + 记录第一条经验） */
const MONTH1_TASKS_BY_ROLE: Record<OnboardingRole, ReadonlyArray<Omit<OnboardingTask, 'taskId'>>> = {
  doctor: [
    {
      title: '跟随上级查房并记录查房要点',
      description: '本月跟随上级完成至少 8 次查房，每次在 Personal Agent 里写下 3 条查房要点。',
      estimatedHours: 12,
    },
    {
      title: '在 Personal Agent 中记录第一条临床经验',
      description: '挑一个你踩过或见过的坑，写成一条「如果再遇到，我会……」的经验并归档。',
      estimatedHours: 1,
    },
  ],
  nurse: [
    {
      title: '跟随带教完成护理查房',
      description: '本月跟随带教完成至少 6 次护理查房，记录 3 条护理观察要点。',
      estimatedHours: 10,
    },
    {
      title: '在 Personal Agent 中记录第一条护理经验',
      description: '写一条你在床边发现的、值得让下一位护士知道的细节。',
      estimatedHours: 1,
    },
  ],
  pharmacist: [
    {
      title: '跟随临床药师参与医嘱点评',
      description: '本月至少参与 4 次医嘱点评，记录 2 条用药干预理由。',
      estimatedHours: 8,
    },
    {
      title: '在 Personal Agent 中记录第一条用药经验',
      description: '写一条你给出的、被临床采纳的用药调整建议。',
      estimatedHours: 1,
    },
  ],
  admin: [
    {
      title: '跟随科主任完成一次科室运营复盘',
      description: '列席一次月度运营复盘会，记录 3 个待改进事项。',
      estimatedHours: 6,
    },
    {
      title: '在 Personal Agent 中记录第一条管理经验',
      description: '写一条你观察到的、能提升科室运转效率的小动作。',
      estimatedHours: 1,
    },
  ],
};

/** 第3月任务：按岗位差异化（独立处理常见病 + 智慧度成长对比） */
const MONTH3_TASKS_BY_ROLE: Record<OnboardingRole, ReadonlyArray<Omit<OnboardingTask, 'taskId'>>> = {
  doctor: [
    {
      title: '独立处理 5 例以上常见病门诊',
      description: '在带教远程兜底下，独立完成至少 5 例常见病门诊，病历质控不扣分项。',
      estimatedHours: 16,
    },
    {
      title: '与入职时做智慧度成长对比复盘',
      description: '打开「智慧度成长对比」页，看自己从基线到现在的曲线，写一段 200 字复盘。',
      estimatedHours: 2,
    },
  ],
  nurse: [
    {
      title: '独立完成分管床位护理工作',
      description: '在带教抽检下，独立分管一组床位完成整月护理工作，无不良事件。',
      estimatedHours: 40,
    },
    {
      title: '与入职时做智慧度成长对比复盘',
      description: '看自己护理质控分与独立处理问题数的变化，写一段 200 字复盘。',
      estimatedHours: 2,
    },
  ],
  pharmacist: [
    {
      title: '独立完成处方审核与用药交代',
      description: '在带教抽检下，独立完成整月处方审核与窗口用药交代，拦截率不低于科室均值。',
      estimatedHours: 40,
    },
    {
      title: '与入职时做智慧度成长对比复盘',
      description: '看自己用药干预采纳率与用药交代满意度的变化，写一段 200 字复盘。',
      estimatedHours: 2,
    },
  ],
  admin: [
    {
      title: '独立负责一项科室运营改进事项',
      description: '从第1月记录的待改进事项里挑一项，独立推动闭环并出简报。',
      estimatedHours: 20,
    },
    {
      title: '与入职时做智慧度成长对比复盘',
      description: '看自己对科室数据的熟悉度与推动事项数的变化，写一段 200 字复盘。',
      estimatedHours: 2,
    },
  ],
};

/* ------------------------------- 工具函数 ------------------------------- */

/** 把自由文本任务列表打上稳定 taskId（{stage}-{idx}） */
function withTaskId(
  stageKey: OnboardingStageKey,
  list: ReadonlyArray<Omit<OnboardingTask, 'taskId'>>,
): OnboardingTask[] {
  return list.map((t, idx) => ({ ...t, taskId: `${stageKey}-${idx + 1}` }));
}

/** 防御入参：任意字符串角色 → OnboardingRole（未知回落 doctor） */
function toOnboardingRole(role: string | null | undefined): OnboardingRole {
  const r = (role ?? '').trim().toLowerCase();
  if (r === 'nurse' || r === 'pharmacist' || r === 'admin') return r;
  return 'doctor';
}

/**
 * 确定性字符串哈希（FNV-1a 32 位，非加密）。
 * 同一 staffId 永远得到同一非负整数，用于纯函数推演进度。
 */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * buildOnboardingGuide：M134-A 新员工入职向导总入口。
 *
 * 依据「后继者站在巨人肩膀上」理念，按第1天/第1周/第1月/第3月四个时间轴
 * 节点组装一份岗位差异化任务清单。文案全部动词开头、可验收。
 *
 * 纯函数：不修改入参，不触库，不抛错（未知角色回落 doctor）。
 *
 * @param staffId 员工 ID（仅写入 Guide.staffId 回显，不参与分支）
 * @param role 岗位角色（doctor/nurse/pharmacist/admin）
 * @returns Guide（欢迎语 + 四阶段任务 + 任务总数）
 */
export function buildOnboardingGuide(
  staffId: string,
  role: string | null | undefined,
): Guide {
  const normalizedRole = toOnboardingRole(role);
  const roleLabel = ONBOARDING_ROLE_LABEL[normalizedRole];

  const stages: OnboardingStage[] = [
    {
      stageKey: 'day1',
      title: STAGE_TITLE.day1,
      goal: STAGE_GOAL.day1,
      tasks: withTaskId('day1', DAY1_TASKS),
    },
    {
      stageKey: 'week1',
      title: STAGE_TITLE.week1,
      goal: STAGE_GOAL.week1,
      tasks: withTaskId('week1', WEEK1_TASKS_BY_ROLE[normalizedRole]),
    },
    {
      stageKey: 'month1',
      title: STAGE_TITLE.month1,
      goal: STAGE_GOAL.month1,
      tasks: withTaskId('month1', MONTH1_TASKS_BY_ROLE[normalizedRole]),
    },
    {
      stageKey: 'month3',
      title: STAGE_TITLE.month3,
      goal: STAGE_GOAL.month3,
      tasks: withTaskId('month3', MONTH3_TASKS_BY_ROLE[normalizedRole]),
    },
  ];

  const totalTasks = stages.reduce((sum, s) => sum + s.tasks.length, 0);

  return {
    staffId,
    role: normalizedRole,
    roleLabel,
    welcome: `${roleLabel}你好，这是你在健澜的前 90 天路线图。跟着 Personal Agent 一步步走，前辈们踩过的坑你不必再踩一遍。`,
    stages,
    totalTasks,
  };
}

/**
 * getOnboardingProgress：M134-A 入职进度追踪。
 *
 * 纯函数：基于 staffId 的稳定哈希确定性推演各阶段完成数，
 * 同一 staffId 永远得到同一 Progress，便于单测与回放。
 *
 * 推演规则（模拟一个真实新员工的进度曲线）：
 *  - day1：登录即完成，全部打勾；
 *  - week1：哈希低位决定完成 1~3 条；
 *  - month1：哈希中位决定完成 0~1 条；
 *  - month3：刚入职，完成 0 条（留给未来接入真实勾选状态）。
 *
 * 智慧度：入职基线固定 20（新人冷启动），当前 = 基线 + 已完成任务数 × 4，
 * 封顶 100。【用户体验深化】让新员工在第3月阶段一眼看见自己的成长曲线。
 *
 * @param staffId 员工 ID
 * @returns Progress（百分比 + 分阶段明细 + 智慧度对比）
 */
export function getOnboardingProgress(staffId: string): Progress {
  const guide = buildOnboardingGuide(staffId, 'doctor');
  const hash = stableHash(staffId || 'anonymous');

  // 各阶段任务总数（与 guide 对齐，按阶段 key 取）
  const totalByStage: Record<OnboardingStageKey, number> = {
    day1: guide.stages.find((s) => s.stageKey === 'day1')!.tasks.length,
    week1: guide.stages.find((s) => s.stageKey === 'week1')!.tasks.length,
    month1: guide.stages.find((s) => s.stageKey === 'month1')!.tasks.length,
    month3: guide.stages.find((s) => s.stageKey === 'month3')!.tasks.length,
  };

  // day1 全部完成；week1/month1 由哈希推演；month3 刚开始
  const completedByStage: Record<OnboardingStageKey, number> = {
    day1: totalByStage.day1,
    week1: 1 + (hash % totalByStage.week1), // 1..week1Total
    month1: hash % (totalByStage.month1 + 1), // 0..month1Total
    month3: 0,
  };

  const stages: StageProgress[] = STAGE_ORDER.map((key) => ({
    stageKey: key,
    completed: completedByStage[key],
    total: totalByStage[key],
  }));

  const completedTasks = stages.reduce((sum, s) => sum + s.completed, 0);
  const totalTasks = stages.reduce((sum, s) => sum + s.total, 0);
  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // 当前阶段 = 第一个 completed < total 的阶段
  const currentStage: OnboardingStageKey =
    stages.find((s) => s.completed < s.total)?.stageKey ?? 'month3';

  const wisdomBaseline = 20;
  const wisdomCurrent = Math.min(100, wisdomBaseline + completedTasks * 4);

  return {
    staffId,
    completedTasks,
    totalTasks,
    percent,
    currentStage,
    stages,
    wisdomBaseline,
    wisdomCurrent,
  };
}
