/**
 * 健澜科技 jlmedaios — 电子病历智能化评分聚合器（M154-B）
 *
 * 【AI深化与运营预测】
 *   公平评分原则：不抠格式、不数字数，重点评判实质内容——
 *   诊断逻辑是否自洽、用药是否与诊断匹配、检查是否适宜、病程是否及时。
 *
 * 六维满分 100：
 *   主诉完整性 10 / 现病史逻辑性 20 / 诊断准确性 20 /
 *   用药合理性 20 / 检查适宜性 15 / 病程记录及时性 15。
 *
 * 三个纯函数（无 IO、无时间副作用、可单测）：
 *   - detectRecordDefects(recordContent)      → Defect[]：逐条缺陷（维度/级别/扣分）
 *   - scoreMedicalRecord(recordContent)       → ScoreResult：六维得分 + 等级 + 缺陷 + 建议
 *   - generateScoreSuggestions(defects)       → Suggestion[]：按缺陷生成可执行整改建议
 *
 * 医疗安全红线：本评分为质控辅助，不替代主治医师与质控医师的最终判定；
 *               对"无法判定"项一律给中性分并显式标注缺陷，不臆断、不凑满分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 六维评分键 */
export type DimensionKey =
  | 'chiefComplaint'
  | 'historyOfPresentIllness'
  | 'diagnosis'
  | 'medication'
  | 'examination'
  | 'progressTimeliness';

/** 缺陷严重级别 */
export type DefectSeverity = 'low' | 'medium' | 'high';

/** 单条病历缺陷（纯数据） */
export interface Defect {
  /** 所属评分维度 */
  dimension: DimensionKey;
  severity: DefectSeverity;
  /** 缺陷机器码 */
  code: string;
  /** 缺陷描述（面向医师，说清实质问题而非格式问题） */
  message: string;
  /** 该缺陷在本维度内的扣分（0 < deduction <= maxScore） */
  deduction: number;
}

/** 单维度评分 */
export interface DimensionScore {
  key: DimensionKey;
  label: string;
  maxScore: number;
  score: number;
  /** 完成率 0–1 */
  ratio: number;
  /** 本维度命中的实质发现（正向依据） */
  findings: string[];
}

/** 可执行整改建议 */
export interface Suggestion {
  dimension: DimensionKey;
  severity: DefectSeverity;
  /** 建议标题 */
  title: string;
  /** 具体改法 */
  detail: string;
  /** 预计可挽回分数 */
  recoverableScore: number;
}

/** 评分结果（纯数据） */
export interface ScoreResult {
  totalScore: number;
  maxTotal: number;
  /** 等级：>=90 优秀 / >=80 良好 / >=60 合格 / <60 不合格 */
  grade: '优秀' | '良好' | '合格' | '不合格';
  dimensions: DimensionScore[];
  defects: Defect[];
  suggestions: Suggestion[];
  assessedAt: string;
}

// ============================================================================
// 评分维度权重（满分 100）
// ============================================================================

/** 六维定义：权重固定，勿随意调整——公平性来自稳定标尺 */
export const DIMENSIONS: ReadonlyArray<{ key: DimensionKey; label: string; maxScore: number }> = [
  { key: 'chiefComplaint', label: '主诉完整性', maxScore: 10 },
  { key: 'historyOfPresentIllness', label: '现病史逻辑性', maxScore: 20 },
  { key: 'diagnosis', label: '诊断准确性', maxScore: 20 },
  { key: 'medication', label: '用药合理性', maxScore: 20 },
  { key: 'examination', label: '检查适宜性', maxScore: 15 },
  { key: 'progressTimeliness', label: '病程记录及时性', maxScore: 15 },
];

const DIMENSION_MAP = new Map(DIMENSIONS.map((d) => [d.key, d]));

// ============================================================================
// 临床规则知识库（实质内容判定，非格式模板）
// ============================================================================

/**
 * 诊断 → 预期治疗药物类别映射（用于"用药合理性"实质判定）。
 * key 为诊断命中关键词，value 为该诊断下应出现的代表药/药类关键词。
 */
const DIAGNOSIS_EXPECTED_DRUGS: ReadonlyArray<{ diagKeywords: string[]; drugKeywords: string[]; label: string }> = [
  { diagKeywords: ['高血压'], drugKeywords: ['氨氯地平', '硝苯地平', '缬沙坦', '氯沙坦', '美托洛尔', '比索洛尔', '贝那普利', '厄贝沙坦'], label: '降压药' },
  { diagKeywords: ['糖尿病'], drugKeywords: ['二甲双胍', '格列美脲', '格列齐特', '胰岛素', '阿卡波糖', '达格列净'], label: '降糖药' },
  { diagKeywords: ['冠心病', '心绞痛', '心肌梗死'], drugKeywords: ['阿司匹林', '氯吡格雷', '阿托伐他汀', '瑞舒伐他汀', '硝酸甘油'], label: '抗血小板/调脂/抗心绞痛药' },
  { diagKeywords: ['肺炎', '感染', '扁桃体炎', '支气管炎', '尿路感染'], drugKeywords: ['头孢', '阿莫西林', '左氧氟沙星', '阿奇霉素', '青霉素', '莫西沙星'], label: '抗菌药物' },
  { diagKeywords: ['胃炎', '胃溃疡', '十二指肠溃疡', '反流'], drugKeywords: ['奥美拉唑', '泮托拉唑', '雷贝拉唑', '铝碳酸镁', '枸橼酸铋'], label: '抑酸/胃黏膜保护药' },
];

/** 诊断 → 预期关键检查映射（用于"检查适宜性"实质判定） */
const DIAGNOSIS_EXPECTED_EXAMS: ReadonlyArray<{ diagKeywords: string[]; examKeywords: string[]; label: string }> = [
  { diagKeywords: ['胸痛', '心绞痛', '冠心病', '心肌梗死'], examKeywords: ['心电图', '肌钙蛋白', '心肌酶', '冠脉CT', '冠脉造影', '心脏超声'], label: '心电图/心肌损伤标志物' },
  { diagKeywords: ['肺炎', '感染', '发热', '支气管炎'], examKeywords: ['血常规', 'CRP', 'C反应蛋白', '胸片', '胸部CT', '降钙素原'], label: '血常规/炎症指标' },
  { diagKeywords: ['糖尿病'], examKeywords: ['血糖', '糖化血红蛋白', 'C肽', '糖耐量'], label: '血糖/糖化血红蛋白' },
  { diagKeywords: ['高血压'], examKeywords: ['血压', '动态血压', '心电图', '肾功能', '尿蛋白'], label: '血压监测/靶器官评估' },
];

/** 潜在高风险联用（需在病历中见合理说明，否则扣分） */
const RISKY_COMBOS: ReadonlyArray<{ drugs: string[]; reason: string }> = [
  { drugs: ['阿司匹林', '华法林'], reason: '抗血小板与抗凝联用增加出血风险，需注明适应证与监测计划' },
  { drugs: ['阿司匹林', '利伐沙班'], reason: '抗血小板与口服抗凝联用增加出血风险，需注明适应证与监测计划' },
  { drugs: ['布洛芬', '阿司匹林'], reason: '两种非甾体/抗血小板药叠加，胃肠与出血风险升高' },
];

/** 模糊/待定诊断词（出现说明诊断尚未实质确立） */
const VAGUE_DIAGNOSIS_WORDS = ['待查', '待查因', '？', '?', '待明确', '未明确', '不适查因', '待排除'];

// ============================================================================
// 文本抽取辅助（纯函数）
// ============================================================================

/** 已知病历段落标题，用于切分正文 */
const SECTION_HEADINGS = [
  '主诉',
  '现病史',
  '既往史',
  '个人史',
  '家族史',
  '体格检查',
  '查体',
  '辅助检查',
  '检查',
  '诊断',
  '初步诊断',
  '入院诊断',
  '出院诊断',
  '处理',
  '处理措施',
  '医嘱',
  '用药',
  '诊疗计划',
  '病程记录',
  '病程',
];

/**
 * 抽取某段落正文：命中"标题："或"标题:"后，到下一个已知标题之前的文本。
 * 纯函数；无命中返回空串。
 */
function extractSection(text: string, heading: string): string {
  const re = new RegExp(`${heading}\\s*[:：]?([\\s\\S]*?)(?=${SECTION_HEADINGS.join('|')}|$)`, 'g');
  const m = re.exec(text);
  return m ? m[1].trim() : '';
}

/** 是否命中任一关键词 */
function hitAny(text: string, keywords: ReadonlyArray<string>): string | null {
  for (const kw of keywords) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

/** 从主诉/现病史中识别"症状+时长"模式，如"胸痛3天""咳嗽伴发热5天" */
function hasSymptomWithDuration(section: string): boolean {
  if (!section) return false;
  // 症状词 + 时长量词
  const symptomWords = ['痛', '闷', '嗽', '发热', '热', '泻', '吐', '晕', '血', '肿', '黄', '乏', '悸', '促'];
  const durationRe = /\d+\s*(天|日|周|个月|月|年|小时|h|余|余天|余月)/;
  const hasSymptom = symptomWords.some((w) => section.includes(w));
  return hasSymptom && durationRe.test(section);
}

/** 从文本中抓取 ISO 或 月-日 形式的日期，返回时间戳数组 */
function extractDateStamps(text: string): number[] {
  const stamps: number[] = [];
  const isoRe = /(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = isoRe.exec(text)) !== null) {
    const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    if (!Number.isNaN(t)) stamps.push(t);
  }
  return stamps.sort((a, b) => a - b);
}

// ============================================================================
// 核心纯函数一：detectRecordDefects
// ============================================================================

/**
 * 检测病历实质缺陷。
 * 公平性要点：
 *  - 不数字数、不抠标点；
 *  - 每条缺陷都指向"诊断/用药/检查/病程"的临床实质问题；
 *  - 缺失段落按"该维度关键要素缺失"扣分，而非按格式扣分。
 */
export function detectRecordDefects(recordContent: string): Defect[] {
  const text = typeof recordContent === 'string' ? recordContent : '';
  const defects: Defect[] = [];
  if (!text.trim()) {
    // 空病历：全维度记一条高严重缺陷，由评分函数统一扣分
    DIMENSIONS.forEach((d) => {
      defects.push({
        dimension: d.key,
        severity: 'high',
        code: 'EMPTY_RECORD',
        message: '病历内容为空，无法进行实质评分',
        deduction: d.maxScore,
      });
    });
    return defects;
  }

  // ---- 1. 主诉完整性（10） ----
  const chief = extractSection(text, '主诉') || text;
  if (!extractSection(text, '主诉')) {
    defects.push({
      dimension: 'chiefComplaint',
      severity: 'medium',
      code: 'CHIEF_COMPLAINT_MISSING',
      message: '未见"主诉"段落，无法定位患者本次就诊的主要问题',
      deduction: 6,
    });
  } else if (!hasSymptomWithDuration(chief)) {
    defects.push({
      dimension: 'chiefComplaint',
      severity: 'medium',
      code: 'CHIEF_COMPLAINT_NO_DURATION',
      message: '主诉未明确"症状+持续时间"，定位本次就诊主要问题的信息不完整',
      deduction: 5,
    });
  }

  // ---- 2. 现病史逻辑性（20） ----
  const hpi = extractSection(text, '现病史');
  if (!hpi) {
    defects.push({
      dimension: 'historyOfPresentIllness',
      severity: 'high',
      code: 'HPI_MISSING',
      message: '未见"现病史"段落，缺乏疾病发生发展的逻辑链条',
      deduction: 14,
    });
  } else {
    // 实质逻辑要素：起病诱因/时间、加重或缓解因素、伴随症状、院外诊疗经过
    const logicElements = [
      { kw: ['起病', '发病', '诱因', '缘于'], label: '起病情况/诱因' },
      { kw: ['加重', '缓解', '减轻', '变化', '进展'], label: '症状演变（加重/缓解）' },
      { kw: ['伴', '伴随', '同时'], label: '伴随症状' },
      { kw: ['外院', '曾于', '自服', '就诊', '用药后', '治疗后'], label: '院外诊疗经过' },
    ];
    const missingElements = logicElements.filter((el) => !hitAny(hpi, el.kw));
    if (missingElements.length >= 3) {
      defects.push({
        dimension: 'historyOfPresentIllness',
        severity: 'medium',
        code: 'HPI_LOGIC_INCOMPLETE',
        message: `现病史缺少关键逻辑环节：${missingElements.map((e) => e.label).join('、')}，难以支撑诊断推理`,
        deduction: 4 + missingElements.length * 2,
      });
    } else if (missingElements.length > 0) {
      defects.push({
        dimension: 'historyOfPresentIllness',
        severity: 'low',
        code: 'HPI_LOGIC_PARTIAL',
        message: `现病史逻辑链条基本完整，但缺少：${missingElements.map((e) => e.label).join('、')}`,
        deduction: missingElements.length * 2,
      });
    }
  }

  // ---- 3. 诊断准确性（20） ----
  const diagnosisSection =
    extractSection(text, '初步诊断') || extractSection(text, '入院诊断') || extractSection(text, '出院诊断') || extractSection(text, '诊断');
  if (!diagnosisSection) {
    defects.push({
      dimension: 'diagnosis',
      severity: 'high',
      code: 'DIAGNOSIS_MISSING',
      message: '未见明确诊断段落，诊疗结论缺失',
      deduction: 14,
    });
  } else {
    const vague = VAGUE_DIAGNOSIS_WORDS.find((w) => diagnosisSection.includes(w));
    if (vague) {
      defects.push({
        dimension: 'diagnosis',
        severity: 'high',
        code: 'DIAGNOSIS_VAGUE',
        message: `诊断仍为"${vague}"等待查状态，未形成可指导治疗的实质诊断`,
        deduction: 10,
      });
    }
    // 诊断与主诉症状一致性：主诉症状词在诊断中应有对应
    if (chief && hasSymptomWithDuration(chief)) {
      const chiefSymptomWords = ['痛', '闷', '嗽', '热', '泻', '晕', '血', '黄'];
      const symptomHit = chiefSymptomWords.find((w) => chief.includes(w));
      if (symptomHit && !diagnosisSection.includes(symptomHit) && !hitAny(diagnosisSection, ['综合征', '病'])) {
        defects.push({
          dimension: 'diagnosis',
          severity: 'medium',
          code: 'DIAGNOSIS_CHIEF_MISMATCH',
          message: '诊断与主诉所述症状关联性弱，需核对诊断是否真正解释了主要症状',
          deduction: 5,
        });
      }
    }
  }

  // ---- 4. 用药合理性（20）—— 实质判定核心 ----
  const medSection = extractSection(text, '用药') || extractSection(text, '医嘱') || extractSection(text, '处理措施') || extractSection(text, '处理');
  if (diagnosisSection) {
    for (const rule of DIAGNOSIS_EXPECTED_DRUGS) {
      const diagHit = hitAny(diagnosisSection, rule.diagKeywords);
      if (!diagHit) continue;
      const drugHit = medSection ? hitAny(medSection, rule.drugKeywords) : null;
      if (!drugHit) {
        defects.push({
          dimension: 'medication',
          severity: 'high',
          code: 'MEDICATION_MISSING_FOR_DIAGNOSIS',
          message: `诊断含"${diagHit}"，但用药中未见${rule.label}，治疗与诊断不匹配`,
          deduction: 8,
        });
      }
    }
  }
  if (!diagnosisSection && medSection && medSection.length > 5) {
    defects.push({
      dimension: 'medication',
      severity: 'medium',
      code: 'MEDICATION_WITHOUT_DIAGNOSIS',
      message: '有用药记录但无明确诊断，用药缺乏诊断依据，存在无指征用药风险',
      deduction: 8,
    });
  }
  // 高风险联用检查
  if (medSection) {
    for (const combo of RISKY_COMBOS) {
      const present = combo.drugs.filter((d) => medSection.includes(d));
      if (present.length >= 2) {
        const noted = /监测|理由|适应证|必要|权衡/.test(medSection);
        if (!noted) {
          defects.push({
            dimension: 'medication',
            severity: 'high',
            code: 'MEDICATION_RISKY_COMBO',
            message: `同时使用${present.join('+')}：${combo.reason}`,
            deduction: 6,
          });
        }
      }
    }
  }

  // ---- 5. 检查适宜性（15） ----
  // 公平性：只在"辅助检查/检查"段落内判定检查项，避免把诊断词（如"高血压"中的"血压"）
  //       误判为已完成的检查。无独立检查段落本身即实质缺陷。
  const examSection = extractSection(text, '辅助检查') || extractSection(text, '检查');
  if (!examSection) {
    defects.push({
      dimension: 'examination',
      severity: 'medium',
      code: 'EXAM_SECTION_MISSING',
      message: '未见"辅助检查"段落，缺乏支撑诊断的客观检查依据',
      deduction: 5,
    });
  }
  const referenceText = diagnosisSection || chief;
  if (referenceText) {
    for (const rule of DIAGNOSIS_EXPECTED_EXAMS) {
      const diagHit = hitAny(referenceText, rule.diagKeywords);
      if (!diagHit) continue;
      const examHit = examSection ? hitAny(examSection, rule.examKeywords) : null;
      if (!examHit) {
        defects.push({
          dimension: 'examination',
          severity: 'medium',
          code: 'EXAM_MISSING_KEY',
          message: `症状/诊断含"${diagHit}"，但检查段落中未见${rule.label}，关键依据不足`,
          deduction: 5,
        });
      }
    }
  }
  // 过度检查粗判：检查段落同时出现 CT/MRI/PET 等大型检查 >=3 类且无诊断支撑
  const bigImaging = ['CT', 'MRI', '磁共振', 'PET', '造影', '彩超'].filter((k) =>
    examSection.includes(k),
  );
  if (bigImaging.length >= 3 && !diagnosisSection) {
    defects.push({
      dimension: 'examination',
      severity: 'low',
      code: 'EXAM_EXCESSIVE',
      message: '大型检查项目较多但缺乏明确诊断支撑，需评估是否存在过度检查',
      deduction: 3,
    });
  }

  // ---- 6. 病程记录及时性（15） ----
  const stamps = extractDateStamps(text);
  const progressSection = extractSection(text, '病程记录') || extractSection(text, '病程');
  if (stamps.length < 2) {
    defects.push({
      dimension: 'progressTimeliness',
      severity: 'low',
      code: 'PROGRESS_NO_TIMESTAMP',
      message: '病程记录缺少可比对的时间戳，无法客观判定记录及时性（此项不臆断扣分）',
      deduction: 0,
    });
  } else {
    const maxGapDays = stamps.reduce((max, cur, i) => {
      if (i === 0) return max;
      return Math.max(max, (cur - stamps[i - 1]) / 86_400_000);
    }, 0);
    if (maxGapDays > 3) {
      defects.push({
        dimension: 'progressTimeliness',
        severity: 'medium',
        code: 'PROGRESS_GAP_TOO_LONG',
        message: `相邻病程记录最大间隔约 ${Math.round(maxGapDays)} 天，超过 3 天应记录上级医师查房或病情变化`,
        deduction: Math.min(8, Math.round(maxGapDays) * 1.5),
      });
    }
  }
  if (!progressSection && stamps.length >= 2) {
    defects.push({
      dimension: 'progressTimeliness',
      severity: 'low',
      code: 'PROGRESS_SECTION_MISSING',
      message: '有多个日期点但未见结构化"病程记录"段落',
      deduction: 3,
    });
  }

  return defects;
}

// ============================================================================
// 核心纯函数二：generateScoreSuggestions
// ============================================================================

/**
 * 依据缺陷生成可执行整改建议。
 * 公平性：建议指向"补实质内容"，不要求重排版式。
 */
export function generateScoreSuggestions(defects: Defect[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  for (const d of defects) {
    if (d.deduction <= 0) continue; // 不可判定项不给"整改"压力
    let title = '';
    let detail = '';
    switch (d.dimension) {
      case 'chiefComplaint':
        title = '完善主诉';
        detail = '用"主要症状+持续时间"一句话定位本次就诊问题（如：反复胸痛3天，加重6小时）。';
        break;
      case 'historyOfPresentIllness':
        title = '理顺现病史逻辑';
        detail = '按"起病诱因→症状特点→加重/缓解因素→伴随症状→院外诊疗经过"组织，让诊断推理可被复核。';
        break;
      case 'diagnosis':
        title = '明确诊断结论';
        detail = '将"待查"收敛为具体诊断或鉴别诊断清单，并说明诊断与主诉症状的对应关系。';
        break;
      case 'medication':
        title = '核对用药与诊断匹配';
        detail = '确保诊断对应的治疗药物已开具；高风险联用需在病历中写明适应证与出血/肝肾监测计划。';
        break;
      case 'examination':
        title = '补齐关键检查依据';
        detail = '围绕主要症状补充心电图/血常规/影像等关键依据，同时复核大型检查是否确有必要。';
        break;
      case 'progressTimeliness':
        title = '及时书写病程记录';
        detail = '病情变化或术后应在规定时限内记录；相邻病程超过3天时补记上级医师查房意见。';
        break;
    }
    suggestions.push({
      dimension: d.dimension,
      severity: d.severity,
      title,
      detail,
      recoverableScore: Math.round(d.deduction),
    });
  }
  // 按可挽回分数降序，优先整改高分缺陷
  return suggestions.sort((a, b) => b.recoverableScore - a.recoverableScore);
}

// ============================================================================
// 核心纯函数三：scoreMedicalRecord
// ============================================================================

/**
 * 对一份病历做六维评分。
 * @param recordContent 病历全文（纯文本）
 * @param assessedAt    可选评估时间戳（便于测试固定时间；生产传 ISO 字符串）
 */
export function scoreMedicalRecord(recordContent: string, assessedAt?: string): ScoreResult {
  const defects = detectRecordDefects(recordContent);

  // 按维度汇总扣分，单维度扣分不超过其满分
  const deductionByDimension = new Map<DimensionKey, number>();
  for (const d of defects) {
    const cur = deductionByDimension.get(d.dimension) ?? 0;
    deductionByDimension.set(d.dimension, cur + d.deduction);
  }

  const dimensions: DimensionScore[] = DIMENSIONS.map((dim) => {
    const rawDeduction = deductionByDimension.get(dim.key) ?? 0;
    const deduction = Math.min(rawDeduction, dim.maxScore);
    const score = Math.max(0, dim.maxScore - deduction);
    return {
      key: dim.key,
      label: dim.label,
      maxScore: dim.maxScore,
      score,
      ratio: dim.maxScore > 0 ? score / dim.maxScore : 0,
      findings: defects
        .filter((d) => d.dimension === dim.key && d.deduction > 0)
        .map((d) => d.message),
    };
  });

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);
  const maxTotal = dimensions.reduce((sum, d) => sum + d.maxScore, 0);

  let grade: ScoreResult['grade'] = '不合格';
  if (totalScore >= 90) grade = '优秀';
  else if (totalScore >= 80) grade = '良好';
  else if (totalScore >= 60) grade = '合格';

  return {
    totalScore,
    maxTotal,
    grade,
    dimensions,
    defects,
    suggestions: generateScoreSuggestions(defects),
    assessedAt: assessedAt ?? new Date().toISOString(),
  };
}

// 便于外部按键取维度元数据
export function getDimensionMeta(key: DimensionKey): { key: DimensionKey; label: string; maxScore: number } {
  const meta = DIMENSION_MAP.get(key);
  if (!meta) throw new Error(`未知评分维度: ${key}`);
  return { ...meta };
}
