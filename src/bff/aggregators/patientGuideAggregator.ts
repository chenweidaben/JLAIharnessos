/**
 * 健澜科技 jlmedaios - 智能导诊助手聚合器（M122-A）
 *
 * 依据宪法第七章 7.7（患者 MUSE）与《基本医疗卫生与健康促进法》：
 *   导诊结果为「就医建议」，不构成诊断；最终诊断由执业医师面诊后作出。
 *   对胸痛、剧烈头痛、偏瘫、意识障碍等红旗症状，强制提示急诊/120。
 *
 * 本模块为纯函数：不访问数据库、不发起网络请求，便于单元测试与前端复用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 患者既往史（由 BFF 从患者 MUSE 档案脱敏后注入） */
export interface PatientHistory {
  age?: number | null;
  gender?: 'male' | 'female' | string | null;
  /** 慢性病标签，如 ['高血压', '2型糖尿病'] */
  chronicConditions?: string[];
  /** 药物/食物过敏，如 ['青霉素'] */
  allergies?: string[];
  /** 近期诊断，用于科室加权 */
  recentDiagnoses?: string[];
}

/** 医生池条目（由排班/医生主数据注入） */
export interface DoctorProfile {
  id: string;
  name: string;
  title?: string;
  deptCode: string;
  deptName: string;
  /** 0~5 分，可缺省 */
  rating?: number;
  /** 号源标签，如 ['今日有号', '专家门诊'] */
  scheduleTags?: string[];
}

/** 科室命中结果 */
export interface DepartmentHit {
  deptCode: string;
  deptName: string;
  /** 0~100，越高越匹配 */
  score: number;
  /** 命中的症状关键词 */
  matchedSymptoms: string[];
  /** 一句话推荐理由 */
  reason: string;
}

/** 推荐医生 */
export interface RecommendedDoctor {
  id: string;
  name: string;
  title: string;
  deptName: string;
  matchScore: number;
  reason: string;
  scheduleTags: string[];
}

/** 紧急度分级 */
export type UrgencyLevel = 'routine' | 'urgent' | 'emergency';

export interface Urgency {
  level: UrgencyLevel;
  /** 是否建议立即前往急诊 / 拨打 120 */
  recommendER: boolean;
  /** 给患者的一句话提示 */
  message: string;
  /** 命中的红旗关键词 */
  redFlags: string[];
}

/** buildPatientGuide 返回结构 */
export interface PatientGuideResult {
  topDepts: DepartmentHit[];
  recommendedDoctors: RecommendedDoctor[];
  prepAdvice: string[];
  urgency: Urgency;
}

/* ------------------------------------------------------------------ */
/* 规则表：症状关键词 → 科室                                            */
/* ------------------------------------------------------------------ */

interface DeptRule {
  deptCode: string;
  deptName: string;
  /** 关键词命中权重 */
  keywords: Array<{ word: string; weight: number }>;
  /** 命中后给患者的理由模板 */
  reason: string;
}

/** 依据宪法：科室推荐基于症状关键词规则，确定性可解释。 */
const DEPT_RULES: DeptRule[] = [
  {
    deptCode: 'CARD',
    deptName: '心血管内科',
    keywords: [
      { word: '胸痛', weight: 90 },
      { word: '胸闷', weight: 80 },
      { word: '心慌', weight: 70 },
      { word: '心悸', weight: 70 },
      { word: '高血压', weight: 60 },
      { word: '压榨感', weight: 85 },
      { word: '气短', weight: 55 },
    ],
    reason: '症状与心血管疾病表现相关，建议优先到心血管内科面诊。',
  },
  {
    deptCode: 'NEURO',
    deptName: '神经内科',
    keywords: [
      { word: '头痛', weight: 70 },
      { word: '头晕', weight: 60 },
      { word: '眩晕', weight: 65 },
      { word: '偏瘫', weight: 95 },
      { word: '言语不清', weight: 95 },
      { word: '肢体麻木', weight: 60 },
      { word: '抽搐', weight: 90 },
      { word: '晕厥', weight: 85 },
      { word: '失眠', weight: 45 },
    ],
    reason: '症状涉及神经/脑血管，建议到神经内科评估。',
  },
  {
    deptCode: 'GASTRO',
    deptName: '消化内科',
    keywords: [
      { word: '腹痛', weight: 75 },
      { word: '胃痛', weight: 75 },
      { word: '腹泻', weight: 65 },
      { word: '恶心', weight: 55 },
      { word: '呕吐', weight: 60 },
      { word: '呕血', weight: 95 },
      { word: '黑便', weight: 90 },
      { word: '便血', weight: 85 },
      { word: '反酸', weight: 55 },
      { word: '腹胀', weight: 55 },
    ],
    reason: '症状集中在消化道，建议到消化内科就诊。',
  },
  {
    deptCode: 'RESP',
    deptName: '呼吸与危重症医学科',
    keywords: [
      { word: '咳嗽', weight: 70 },
      { word: '咳痰', weight: 65 },
      { word: '发热', weight: 55 },
      { word: '呼吸困难', weight: 90 },
      { word: '气喘', weight: 75 },
      { word: '咽痛', weight: 45 },
    ],
    reason: '症状与呼吸道疾病相关，建议到呼吸科就诊。',
  },
  {
    deptCode: 'ENDO',
    deptName: '内分泌科',
    keywords: [
      { word: '糖尿病', weight: 80 },
      { word: '血糖', weight: 70 },
      { word: '甲状腺', weight: 75 },
      { word: '甲亢', weight: 80 },
      { word: '甲减', weight: 80 },
      { word: '多饮', weight: 60 },
      { word: '多尿', weight: 60 },
      { word: '肥胖', weight: 40 },
    ],
    reason: '症状提示代谢/内分泌问题，建议到内分泌科就诊。',
  },
  {
    deptCode: 'ORTHO',
    deptName: '骨科',
    keywords: [
      { word: '腰痛', weight: 70 },
      { word: '颈痛', weight: 65 },
      { word: '关节痛', weight: 70 },
      { word: '骨折', weight: 90 },
      { word: '扭伤', weight: 65 },
      { word: '肩膀痛', weight: 60 },
    ],
    reason: '症状与骨骼/肌肉/关节相关，建议到骨科就诊。',
  },
  {
    deptCode: 'DERM',
    deptName: '皮肤科',
    keywords: [
      { word: '皮疹', weight: 80 },
      { word: '瘙痒', weight: 70 },
      { word: '皮肤过敏', weight: 80 },
      { word: '湿疹', weight: 75 },
      { word: '荨麻疹', weight: 80 },
      { word: '痘痘', weight: 50 },
    ],
    reason: '症状集中在皮肤表现，建议到皮肤科就诊。',
  },
  {
    deptCode: 'GYNE',
    deptName: '妇科',
    keywords: [
      { word: '月经不调', weight: 80 },
      { word: '痛经', weight: 75 },
      { word: '白带', weight: 70 },
      { word: '孕期', weight: 85 },
      { word: '怀孕', weight: 85 },
      { word: '下腹坠痛', weight: 60 },
    ],
    reason: '症状与妇科相关，建议到妇科就诊。',
  },
  {
    deptCode: 'PEDI',
    deptName: '儿科',
    keywords: [
      { word: '宝宝', weight: 80 },
      { word: '婴儿', weight: 85 },
      { word: '小儿', weight: 85 },
      { word: '小孩发烧', weight: 85 },
    ],
    reason: '患儿就医请挂儿科，便于专科评估。',
  },
  {
    deptCode: 'ENT',
    deptName: '耳鼻喉科',
    keywords: [
      { word: '咽痛', weight: 60 },
      { word: '耳痛', weight: 70 },
      { word: '鼻塞', weight: 60 },
      { word: '耳鸣', weight: 65 },
      { word: '鼻炎', weight: 70 },
      { word: '扁桃体', weight: 65 },
    ],
    reason: '症状涉及耳鼻喉，建议到耳鼻喉科就诊。',
  },
  {
    deptCode: 'OPH',
    deptName: '眼科',
    keywords: [
      { word: '视力下降', weight: 80 },
      { word: '眼痛', weight: 75 },
      { word: '红眼', weight: 70 },
      { word: '视物模糊', weight: 70 },
    ],
    reason: '症状集中在眼部，建议到眼科就诊。',
  },
  {
    deptCode: 'URO',
    deptName: '泌尿外科',
    keywords: [
      { word: '尿频', weight: 65 },
      { word: '尿急', weight: 65 },
      { word: '尿痛', weight: 70 },
      { word: '血尿', weight: 85 },
      { word: '肾结石', weight: 80 },
      { word: '排尿困难', weight: 70 },
    ],
    reason: '症状涉及泌尿系统，建议到泌尿外科就诊。',
  },
  {
    deptCode: 'PSYCH',
    deptName: '精神心理科',
    keywords: [
      { word: '抑郁', weight: 80 },
      { word: '焦虑', weight: 75 },
      { word: '失眠', weight: 60 },
      { word: '情绪低落', weight: 75 },
      { word: '压力大', weight: 45 },
    ],
    reason: '情绪/睡眠问题建议到精神心理科评估，保密性就诊。',
  },
];

/* ------------------------------------------------------------------ */
/* 红旗症状：触发急诊提示                                               */
/* ------------------------------------------------------------------ */

/** 依据宪法与急诊分诊规范：出现以下任一关键词 → 建议立即急诊/120。 */
const EMERGENCY_KEYWORDS: Array<{ word: string; level: UrgencyLevel }> = [
  { word: '胸痛', level: 'emergency' },
  { word: '压榨感', level: 'emergency' },
  { word: '偏瘫', level: 'emergency' },
  { word: '言语不清', level: 'emergency' },
  { word: '意识模糊', level: 'emergency' },
  { word: '昏迷', level: 'emergency' },
  { word: '抽搐', level: 'emergency' },
  { word: '呼吸困难', level: 'emergency' },
  { word: '大出血', level: 'emergency' },
  { word: '呕血', level: 'emergency' },
  { word: '休克', level: 'emergency' },
  { word: '剧烈头痛', level: 'emergency' },
  { word: '剧烈腹痛', level: 'urgent' },
  { word: '骨折', level: 'urgent' },
  { word: '高烧不退', level: 'urgent' },
];

/* ------------------------------------------------------------------ */
/* 就诊前准备建议规则                                                   */
/* ------------------------------------------------------------------ */

function buildPrepAdvice(
  deptCodes: string[],
  history: PatientHistory,
): string[] {
  const advice: string[] = [];

  // 通用
  advice.push('请携带身份证、医保卡与既往就诊卡。');

  // 慢病患者
  if (history.chronicConditions && history.chronicConditions.length > 0) {
    advice.push(`请携带近期检查报告与在用药物清单（当前慢病：${history.chronicConditions.join('、')}）。`);
  }
  // 过敏
  if (history.allergies && history.allergies.length > 0) {
    advice.push(`务必主动告知医生过敏史：${history.allergies.join('、')}。`);
  }
  // 消化/腹部 → 空腹
  if (deptCodes.includes('GASTRO') || deptCodes.includes('CARD')) {
    advice.push('如可能做抽血或腹部超声，请空腹 8 小时就诊。');
  }
  // 妇科
  if (deptCodes.includes('GYNE')) {
    advice.push('妇科检查建议避开经期；就诊前 24 小时避免阴道用药。');
  }
  // 内分泌（糖尿病）
  if (deptCodes.includes('ENDO')) {
    advice.push('糖尿病就诊请携带近期血糖记录；如复查糖化血红蛋白，请空腹。');
  }
  // 心血管
  if (deptCodes.includes('CARD')) {
    advice.push('高血压患者晨起请按常规服药，不要为检查停药。');
  }
  // 儿科
  if (deptCodes.includes('PEDI')) {
    advice.push('患儿就诊请携带疫苗本与出生记录。');
  }

  return advice;
}

/* ------------------------------------------------------------------ */
/* 紧急度判断                                                          */
/* ------------------------------------------------------------------ */

function assessUrgency(symptoms: string): Urgency {
  const text = symptoms ?? '';
  const redFlags: string[] = [];
  let level: UrgencyLevel = 'routine';

  for (const rule of EMERGENCY_KEYWORDS) {
    if (text.includes(rule.word)) {
      redFlags.push(rule.word);
      if (rule.level === 'emergency') level = 'emergency';
      else if (level !== 'emergency') level = 'urgent';
    }
  }

  if (level === 'emergency') {
    return {
      level,
      recommendER: true,
      message: '您描述的症状可能涉及急危重症，请立即前往急诊或拨打 120，不要自行驾车等待门诊。',
      redFlags,
    };
  }
  if (level === 'urgent') {
    return {
      level,
      recommendER: true,
      message: '症状较为紧急，建议今天到急诊或急诊科优先评估，不要拖延到普通门诊。',
      redFlags,
    };
  }
  return {
    level,
    recommendER: false,
    message: '症状暂不属于急危重症，可按门诊预约时间就诊；如途中加重请随时改走急诊。',
    redFlags,
  };
}

/* ------------------------------------------------------------------ */
/* 主入口：纯函数                                                       */
/* ------------------------------------------------------------------ */

/**
 * 智能导诊：根据症状描述 + 患者既往史 + 医生池，输出推荐科室/医生/准备建议/紧急度。
 *
 * 依据宪法：纯函数、可解释、不诊断；返回结果仅作为就医路径参考。
 *
 * @param symptoms 患者自由文本症状描述
 * @param history  患者既往史（脱敏）
 * @param doctorPool 可选医生池；为空则 recommendedDoctors 返回空数组
 */
export function buildPatientGuide(
  symptoms: string,
  history: PatientHistory = {},
  doctorPool: DoctorProfile[] = [],
): PatientGuideResult {
  const text = (symptoms ?? '').trim();
  if (!text) {
    return {
      topDepts: [],
      recommendedDoctors: [],
      prepAdvice: ['请先简要描述您的主要不适，例如「头痛三天，伴头晕」。'],
      urgency: {
        level: 'routine',
        recommendER: false,
        message: '尚未描述症状，请补充后再获取导诊建议。',
        redFlags: [],
      },
    };
  }

  // 1) 科室打分
  const scored: DepartmentHit[] = [];
  for (const rule of DEPT_RULES) {
    const matched: string[] = [];
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw.word)) {
        matched.push(kw.word);
        score += kw.weight;
      }
    }
    if (matched.length > 0) {
      // 既往慢病/近期诊断对该科室加权
      const chronic = (history.chronicConditions ?? []).join('、');
      const recent = (history.recentDiagnoses ?? []).join('、');
      if (chronic && rule.keywords.some((k) => chronic.includes(k.word))) score += 10;
      if (recent && rule.keywords.some((k) => recent.includes(k.word))) score += 8;
      scored.push({
        deptCode: rule.deptCode,
        deptName: rule.deptName,
        score: Math.min(100, score),
        matchedSymptoms: matched,
        reason: rule.reason,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const topDepts = scored.slice(0, 3);

  // 2) 医生推荐：从 doctorPool 中按 topDepts[0].deptCode 筛选
  const recommendedDoctors: RecommendedDoctor[] = [];
  if (topDepts.length > 0 && doctorPool.length > 0) {
    const primary = topDepts[0];
    const secondary = topDepts[1];
    for (const doc of doctorPool) {
      let matchScore = 0;
      let reason = '';
      if (doc.deptCode === primary.deptCode) {
        matchScore = 100 + (doc.rating ?? 0) * 5;
        reason = `与首选科室「${primary.deptName}」匹配，命中症状：${primary.matchedSymptoms.join('、')}`;
      } else if (secondary && doc.deptCode === secondary.deptCode) {
        matchScore = 60 + (doc.rating ?? 0) * 5;
        reason = `与次选科室「${secondary.deptName}」相关`;
      }
      if (matchScore > 0) {
        recommendedDoctors.push({
          id: doc.id,
          name: doc.name,
          title: doc.title ?? '医师',
          deptName: doc.deptName,
          matchScore: Math.round(matchScore),
          reason,
          scheduleTags: doc.scheduleTags ?? [],
        });
      }
    }
    recommendedDoctors.sort((a, b) => b.matchScore - a.matchScore);
  }
  const recommended = recommendedDoctors.slice(0, 5);

  // 3) 就诊前准备
  const prepAdvice = buildPrepAdvice(topDepts.map((d) => d.deptCode), history);

  // 4) 紧急度
  const urgency = assessUrgency(text);

  return { topDepts, recommendedDoctors: recommended, prepAdvice, urgency };
}

export default buildPatientGuide;
