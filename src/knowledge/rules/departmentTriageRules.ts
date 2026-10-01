/**
 * 健澜科技 jlmedaios - 智能导诊规则引擎（M3-P）
 *
 * 纯函数、确定性、无 I/O：症状关键词 → 科室推荐。
 * 本地规则引擎在无 LLM 时仍可工作，结果可复现、可解释；
 * LLM 仅作为复杂症状的辅助补充，不替代确定性规则。
 *
 * 安全边界：推荐结果为「建议」，不构成诊断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 科室推荐项 */
export interface DepartmentRecommendation {
  department: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 命中的关键词（用于可解释性） */
  matchedKeywords: string[];
  /** 推荐理由 */
  reason: string;
}

/** 科室关键词映射条目 */
interface DepartmentRule {
  department: string;
  /** 关键词（命中即加分） */
  keywords: string[];
  /** 高权重关键词（命中给予更高置信度，如典型急症/特异性症状） */
  strongKeywords?: string[];
  /** 推荐说明 */
  description: string;
}

/**
 * 科室知识库（关键词 → 科室）。
 * 覆盖主要临床科室；医院可按实际科室配置扩展。
 */
export const DEPARTMENT_RULES: readonly DepartmentRule[] = [
  {
    department: '急诊科',
    description: '处理急危重症、外伤、突发意识障碍等紧急情况',
    strongKeywords: ['昏迷', '休克', '抽搐', '大出血', '中毒', '呼吸心跳骤停', '意识丧失', '严重外伤'],
    keywords: ['剧烈', '突发', '外伤', '烧烫伤', '咬伤', '骨折', '大量出血', '晕厥', '窒息'],
  },
  {
    department: '心血管内科',
    description: '心脏及血管疾病，如冠心病、高血压、心律失常',
    strongKeywords: ['胸痛', '胸闷', '心绞痛', '心悸', '冠心病', '心肌梗死', '心律失常'],
    keywords: ['心慌', '气短', '高血压', '心跳', '浮肿', '嘴唇发紫', '夜间憋醒'],
  },
  {
    department: '呼吸内科',
    description: '呼吸系统疾病，如肺炎、哮喘、慢性阻塞性肺疾病',
    strongKeywords: ['呼吸困难', '哮喘', '咯血', '肺炎', '气喘'],
    keywords: ['咳嗽', '咳痰', '发热', '发烧', '鼻塞', '咽痛', '胸闷', '流涕', '支气管'],
  },
  {
    department: '消化内科',
    description: '消化系统疾病，如胃肠炎、胃溃疡、肝胆疾病',
    strongKeywords: ['呕血', '黑便', '黄疸', '剧烈腹痛'],
    keywords: ['腹痛', '腹泻', '恶心', '呕吐', '胃痛', '反酸', '便秘', '腹胀', '烧心', '便血'],
  },
  {
    department: '内分泌科',
    description: '代谢及内分泌疾病，如糖尿病、甲状腺疾病',
    strongKeywords: ['糖尿病', '甲状腺', '甲亢', '甲减'],
    keywords: ['多饮', '多尿', '多食', '消瘦', '肥胖', '血糖', '口渴', '怕热', '怕冷', '乏力'],
  },
  {
    department: '神经内科',
    description: '神经系统疾病，如脑卒中、癫痫、头痛',
    strongKeywords: ['偏瘫', '口角歪斜', '言语不清', '肢体麻木', '脑卒中'],
    keywords: ['头痛', '头晕', '眩晕', '肢体无力', '手抖', '失眠', '记忆力减退', '走路不稳'],
  },
  {
    department: '泌尿外科',
    description: '泌尿系统疾病，如肾结石、前列腺疾病',
    strongKeywords: ['血尿', '肾绞痛', '尿潴留'],
    keywords: ['尿频', '尿急', '尿痛', '排尿困难', '腰痛', '肾结石', '前列腺'],
  },
  {
    department: '儿科',
    description: '14 岁以下儿童常见病、多发病',
    keywords: ['儿童', '小儿', '婴儿', '幼儿', '宝宝', '小孩', '新生儿'],
  },
  {
    department: '骨科',
    description: '骨骼、关节、肌肉、韧带损伤与疾病',
    strongKeywords: ['骨折', '关节脱位'],
    keywords: ['关节痛', '腰痛', '颈肩痛', '扭伤', '肢体疼痛', '活动受限', '骨刺'],
  },
  {
    department: '皮肤科',
    description: '皮肤疾病，如湿疹、皮炎、真菌感染',
    keywords: ['皮疹', '瘙痒', '皮肤', '红斑', '丘疹', '水疱', '脱皮', '荨麻疹', '痣'],
  },
  {
    department: '眼科',
    description: '眼部疾病与视力问题',
    keywords: ['眼痛', '视力下降', '眼红', '流泪', '异物感', '眼睛', '视物模糊'],
  },
  {
    department: '耳鼻喉科',
    description: '耳、鼻、咽喉疾病',
    keywords: ['耳鸣', '听力下降', '耳痛', '鼻塞', '鼻出血', '咽痛', '扁桃体', '声音嘶哑'],
  },
  {
    department: '内科',
    description: '内科常见病、多发病及诊断不明的内科症状',
    keywords: ['乏力', '不适', '食欲差', '睡眠差', '体检', '虚弱'],
  },
];

/** 急症关键词（命中应直接置顶急诊科并给出高置信度） */
const EMERGENCY_TRIGGERS = DEPARTMENT_RULES[0].strongKeywords ?? [];

/**
 * 智能导诊：根据症状文本推荐科室。
 *
 * 规则：
 *  1. 命中急症强关键词 → 急诊科置顶（confidence ≥ 0.9）；
 *  2. 其余科室按命中关键词数与强关键词加权评分；
 *  3. 归一化为置信度，按置信度降序返回；
 *  4. 无任何命中时返回内科（兜底），并明确提示。
 *
 * @param symptoms - 症状自由文本
 * @param limit - 返回科室数量（默认 3）
 */
export function recommendDepartments(
  symptoms: string,
  limit = 3,
): DepartmentRecommendation[] {
  const text = (symptoms ?? '').trim();
  if (!text) {
    return [
      {
        department: '内科',
        confidence: 0.3,
        matchedKeywords: [],
        reason: '未提供症状，建议先到内科门诊或咨询导诊台。',
      },
    ];
  }

  const scored: DepartmentRecommendation[] = [];
  let hasEmergency = false;

  for (const rule of DEPARTMENT_RULES) {
    const matched: string[] = [];
    const strongMatched: string[] = [];

    for (const kw of rule.keywords) {
      if (text.includes(kw) && !matched.includes(kw)) matched.push(kw);
    }
    for (const kw of rule.strongKeywords ?? []) {
      if (text.includes(kw) && !strongMatched.includes(kw)) {
        strongMatched.push(kw);
        if (!matched.includes(kw)) matched.push(kw);
      }
    }

    if (matched.length === 0) continue;

    // 加权评分：强关键词权重 2，普通关键词权重 1
    const rawScore = matched.length + strongMatched.length;
    // 归一化：1 个强关键词即给较高置信度，多命中趋近 1
    let confidence = Math.min(0.95, 0.45 + rawScore * 0.12);

    if (rule.department === '急诊科') {
      // 急症强触发
      const emergencyHit = EMERGENCY_TRIGGERS.some((kw) => text.includes(kw));
      if (emergencyHit) {
        confidence = 0.95;
        hasEmergency = true;
      }
    }

    scored.push({
      department: rule.department,
      confidence: Number(confidence.toFixed(2)),
      matchedKeywords: matched,
      reason: buildReason(rule, matched, strongMatched),
    });
  }

  if (scored.length === 0) {
    return [
      {
        department: '内科',
        confidence: 0.4,
        matchedKeywords: [],
        reason: '未能根据症状明确匹配专科，建议先到内科门诊评估，或由导诊台人工分诊。',
      },
    ];
  }

  scored.sort((a, b) => b.confidence - a.confidence);

  // 急症命中时在理由前加警示
  if (hasEmergency) {
    const emergency = scored.find((s) => s.department === '急诊科');
    if (emergency) {
      emergency.reason = '【可能为急症】' + emergency.reason + ' 建议立即就诊或拨打急救电话。';
    }
  }

  return scored.slice(0, limit);
}

function buildReason(
  rule: DepartmentRule,
  matched: string[],
  strongMatched: string[],
): string {
  const key = strongMatched[0] ?? matched[0];
  const kwText = matched.slice(0, 3).join('、');
  return `症状中「${kwText}」与${rule.department}常见表现相关${key ? `（如「${key}」）` : ''}；${rule.description}。`;
}
