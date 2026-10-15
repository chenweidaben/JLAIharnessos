/**
 * 健澜科技 jlmedaios - 全院知识检索聚合器（M115-D，依据宪法第七章）
 *
 * 面向全院员工的「Hospital Muse 搜索」：在医院层知识库（已脱敏、已标注来源）
 * 中按关键词检索，并叠加「来源角色 + 科室编码」双维度过滤；失败经验（教训）
 * 优先级更高，置顶展示，避免同类错误在全院重复发生。
 *
 * 医疗安全与隐私红线（依据宪法第七章）：
 *  - 检索对象为医院层已脱敏条目（HospitalKnowledgeEntry），不包含作者工号/姓名；
 *  - 每条结果保留来源角色（doctor/nurse/pharma/admin）与来源科室，全程可溯源；
 *  - 本模块只读检索，不改医嘱、不强制改派诊疗方案；
 *  - 纯函数：不触库、不碰 WebSocket、零新增依赖，结果确定可单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  KNOWLEDGE_ROLES,
  type HospitalKnowledgeEntry,
  type KnowledgeRole,
} from './hospitalKnowledgeAggregator';

/* ------------------------------- 类型契约 ------------------------------- */

/** 单条检索命中结果（在医院层条目上附加命中分与命中字段） */
export interface HospitalSearchResult extends HospitalKnowledgeEntry {
  /** 命中分：标题命中 +5，正文命中 +2；无关键词浏览时为 0 */
  score: number;
  /** 命中字段标记（title / content），无关键词浏览时为空数组 */
  matched: Array<'title' | 'content'>;
}

/** 检索响应信封 */
export interface HospitalSearchResponse {
  /** 原始查询词 */
  query: string;
  /** 归一化后的角色过滤（非法时为 undefined） */
  role?: KnowledgeRole;
  /** 归一化后的科室过滤（trim 后） */
  dept?: string;
  /** 命中总数 */
  total: number;
  /** 命中列表（教训置顶 → 命中分降序 → 成功率降序 → 使用次数降序 → 标题字典序） */
  results: HospitalSearchResult[];
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * searchHospitalKnowledge：全院知识检索（依据宪法第七章）。
 *
 * 口径：
 *  1. query 去空白、转小写；多关键词按空白分词，AND 语义（全部命中才保留）；
 *  2. 命中字段：title 命中权重 5，content 命中权重 2；
 *  3. role 过滤：传入合法角色时仅保留 sourceRole 一致的条目；非法值忽略过滤；
 *  4. deptCode 过滤：传入后按 deptCode 忽略大小写精确匹配；空值不过滤；
 *  5. 空 query：不过滤关键词，仅按角色/科室过滤后返回全部（浏览态兜底）；
 *  6. 排序：教训（isLesson）置顶 → 命中分降序 → 成功率降序 → 使用次数降序 →
 *     标题字典序升序，保证结果确定、可单测；
 *  7. 纯函数：不修改入参数组/对象，返回新数组。
 *
 * @param query       检索关键词（可空）
 * @param role        来源角色过滤（doctor/nurse/pharma/admin，非法忽略）
 * @param deptCode    科室编码过滤（忽略大小写精确匹配）
 * @param allKnowledge 医院层知识库（已脱敏条目数组）
 * @returns 命中结果列表
 */
export function searchHospitalKnowledge(
  query: string | undefined,
  role: string | undefined,
  deptCode: string | undefined,
  allKnowledge: readonly HospitalKnowledgeEntry[],
): HospitalSearchResult[] {
  const q = (query ?? '').trim().toLowerCase();
  const roleFilter = KNOWLEDGE_ROLES.includes(role as KnowledgeRole)
    ? (role as KnowledgeRole)
    : undefined;
  const deptFilter = (deptCode ?? '').trim().toLowerCase();

  const results: HospitalSearchResult[] = [];

  for (const entry of allKnowledge ?? []) {
    // 角色筛选（依据宪法第七章：按岗位可见域过滤）
    if (roleFilter && entry.sourceRole !== roleFilter) continue;
    // 科室筛选（精确匹配，忽略大小写）
    if (deptFilter && entry.deptCode.toLowerCase() !== deptFilter) continue;

    if (!q) {
      // 空关键词：浏览态兜底，不过滤
      results.push({ ...entry, score: 0, matched: [] });
      continue;
    }

    const title = entry.title.toLowerCase();
    const content = entry.content.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const matched: Array<'title' | 'content'> = [];
    let score = 0;
    let allHit = true;

    for (const term of terms) {
      if (title.includes(term)) {
        score += 5;
        matched.push('title');
      } else if (content.includes(term)) {
        score += 2;
        matched.push('content');
      } else {
        allHit = false;
        break;
      }
    }
    if (!allHit) continue;

    results.push({ ...entry, score, matched });
  }

  // 排序：教训置顶（依据宪法第七章失败经验优先）→ 命中分 → 成功率 → 使用次数 → 标题
  results.sort((a, b) => {
    const aLesson = a.isLesson ? 0 : 1;
    const bLesson = b.isLesson ? 0 : 1;
    if (aLesson !== bLesson) return aLesson - bLesson;
    if (b.score !== a.score) return b.score - a.score;
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.title.localeCompare(b.title);
  });

  return results;
}

/* --------------------------- 默认知识库种子 --------------------------- */

/**
 * buildDefaultHospitalKnowledge：确定性演示种子（依据宪法第七章）。
 *
 * 真实环境应接入医院层 muse 持久层；此处提供跨角色、跨科室的确定性样本，
 * 供路由冷启动 / 单测 / 前端联调使用。所有条目已脱敏、无个人标识符。
 */
export function buildDefaultHospitalKnowledge(): HospitalKnowledgeEntry[] {
  const now = '2026-01-01T00:00:00.000Z';
  return [
    {
      id: 'h-001',
      deptCode: 'cardio',
      tier: 'hospital',
      title: '教训：高警示药品双人核对',
      content: '曾出现未双人核对导致给药剂量偏差，此后高警示药品一律双人核对双签。',
      sourceRole: 'doctor',
      isLesson: true,
      priority: 1,
      successRate: 0.8,
      usageCount: 96,
      updatedAt: now,
    },
    {
      id: 'h-002',
      deptCode: 'cardio',
      tier: 'hospital',
      title: 'CAP 经验性抗感染路径',
      content: '社区获得性肺炎经验性抗感染 + 48~72h 复评，结合 CURB-65 分级决定住院。',
      sourceRole: 'doctor',
      isLesson: false,
      priority: 2,
      successRate: 0.94,
      usageCount: 210,
      updatedAt: now,
    },
    {
      id: 'h-003',
      deptCode: 'nursing',
      tier: 'hospital',
      title: '教训：跌倒高危识别',
      content: '曾有高危患者未纳入交班发生跌倒，此后 Morse≥45 分一律床头警示并交班。',
      sourceRole: 'nurse',
      isLesson: true,
      priority: 1,
      successRate: 0.82,
      usageCount: 120,
      updatedAt: now,
    },
    {
      id: 'h-004',
      deptCode: 'nursing',
      tier: 'hospital',
      title: '护理分级与床旁交接',
      content: '按 Barthel/Morse 评分落实护理分级，危重患者床旁交接、管路逐项清点。',
      sourceRole: 'nurse',
      isLesson: false,
      priority: 2,
      successRate: 0.91,
      usageCount: 180,
      updatedAt: now,
    },
    {
      id: 'h-005',
      deptCode: 'pharma',
      tier: 'hospital',
      title: '处方前置审核四查要点',
      content: '适应症、用法用量、相互作用、过敏史四查，不合理处方拦截并反馈医师。',
      sourceRole: 'pharma',
      isLesson: false,
      priority: 2,
      successRate: 0.93,
      usageCount: 160,
      updatedAt: now,
    },
    {
      id: 'h-006',
      deptCode: 'pharma',
      tier: 'hospital',
      title: '教训：皮试阳性标识闭环',
      content: '曾因皮试阳性未在病历醒目标识致重复用药风险，此后阳性结果红字置顶并交班。',
      sourceRole: 'pharma',
      isLesson: true,
      priority: 1,
      successRate: 0.78,
      usageCount: 74,
      updatedAt: now,
    },
    {
      id: 'h-007',
      deptCode: 'admin',
      tier: 'hospital',
      title: '病历质控时限管理',
      content: '出院病历 3 个工作日内归档，运行病历 7 日质控，缺陷闭环到科室考核。',
      sourceRole: 'admin',
      isLesson: false,
      priority: 2,
      successRate: 0.89,
      usageCount: 130,
      updatedAt: now,
    },
    {
      id: 'h-008',
      deptCode: 'admin',
      tier: 'hospital',
      title: '教训：应急演练留痕',
      content: '曾因应急演练无记录被督导扣分，此后演练方案、签到、评估表三留痕归档。',
      sourceRole: 'admin',
      isLesson: true,
      priority: 1,
      successRate: 0.81,
      usageCount: 60,
      updatedAt: now,
    },
  ];
}
