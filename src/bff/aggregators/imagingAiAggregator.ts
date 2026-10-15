/**
 * 健澜科技 jlmedaios - 医学影像 AI 辅助聚合器（M138-A · 新业务场景）
 *
 * 纯函数规则引擎：
 *   - analyzeImaging(studyType, imageFeatures) -> AiSuggestion
 *       依据影像特征（透亮度、结节直径、有无积液/出血/骨折/占位）输出疑似发现列表与置信度。
 *   - generateImagingReport(studyType, findings) -> Report
 *       将结构化发现拼装成中文影像报告草稿（发现 / 印象 / 建议）。
 *
 * 医疗安全红线：
 *   - 本模块不调用任何 LLM、不直连 PACS，纯规则兜底；
 *   - 所有返回值均自带 disclaimer，AI 仅辅助，最终诊断由医师在前端点击「医生确认」后生效；
 *   - 不读患者隐私字段，不写库（落库由后续审计/确认流程负责）。
 *
 * 支持类型：
 *   chest_xray  胸片  -> 肺炎 / 结节 / 积液
 *   ct          CT    -> 脑出血 / 骨折 / 占位
 *   xray        X光   -> 骨折 / 肺炎
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 支持的检查类型 */
export type StudyType = 'chest_xray' | 'ct' | 'xray';

/** 影像特征入参（按检查类型取用对应字段，其余字段忽略） */
export interface ImageFeatures {
  /** 肺野透亮度降低程度 0~1（胸片 / X光 肺炎判定） */
  opacityScore?: number;
  /** 结节直径 mm（胸片），>0 即提示结节 */
  noduleSizeMm?: number;
  /** 有无胸腔积液（胸片） */
  pleuralEffusion?: boolean;
  /** 有无颅内出血（CT） */
  intracranialHemorrhage?: boolean;
  /** 有无骨折线（CT / X光） */
  fractureDetected?: boolean;
  /** 占位病灶直径 mm（CT），>0 即提示占位 */
  massSizeMm?: number;
}

/** 严重程度 */
export type Severity = 'normal' | 'mild' | 'moderate' | 'severe';

/** 单条 AI 建议发现 */
export interface Finding {
  code: string;
  name: string;
  severity: Severity;
  /** 0~1，该条发现的置信度 */
  confidence: number;
  description: string;
}

/** analyzeImaging 返回结构 */
export interface AiSuggestion {
  studyType: StudyType;
  findings: Finding[];
  /** 0~1，所有发现置信度的加权平均；无发现时为 0.1 */
  overallConfidence: number;
  /** 是否未见明显异常 */
  normal: boolean;
  disclaimer: string;
}

/** generateImagingReport 返回结构 */
export interface Report {
  title: string;
  studyType: StudyType;
  findings: string[];
  impression: string;
  recommendations: string[];
  disclaimer: string;
}

/** 统一医疗安全声明 */
export const IMAGING_AI_DISCLAIMER =
  '本报告由 AI 自动生成，仅作为医师阅片参考，不构成最终诊断；最终诊断由接诊医师结合临床确认。';

const STUDY_TYPE_LABEL: Record<StudyType, string> = {
  chest_xray: '胸片',
  ct: 'CT',
  xray: 'X光',
};

function clamp01(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function severityFromOpacity(opacity: number): Severity {
  if (opacity >= 0.8) return 'severe';
  if (opacity >= 0.6) return 'moderate';
  return 'mild';
}

function severityFromSizeMm(mm: number, mildMax: number, moderateMax: number): Severity {
  if (mm >= moderateMax) return 'severe';
  if (mm >= mildMax) return 'moderate';
  return 'mild';
}

/**
 * 【新业务场景】影像分析纯函数。
 * 输入检查类型 + 影像特征，输出疑似发现列表与整体置信度。
 * 纯函数、无 I/O、无随机、无当前时间依赖，便于单测。
 */
export function analyzeImaging(
  studyType: StudyType,
  imageFeatures: ImageFeatures = {},
): AiSuggestion {
  const findings: Finding[] = [];
  const f = imageFeatures ?? {};

  if (studyType === 'chest_xray') {
    // 肺炎：透亮度降低
    const opacity = clamp01(Number(f.opacityScore ?? 0));
    if (opacity >= 0.5) {
      const confidence = clamp01(0.4 + opacity * 0.5);
      findings.push({
        code: 'pneumonia',
        name: '肺部感染（肺炎可能）',
        severity: severityFromOpacity(opacity),
        confidence,
        description: `肺野透亮度降低（评分 ${opacity.toFixed(2)}），提示浸润性改变。`,
      });
    }
    // 结节：直径 >= 3mm
    const nodule = Number(f.noduleSizeMm ?? 0);
    if (Number.isFinite(nodule) && nodule >= 3) {
      findings.push({
        code: 'nodule',
        name: '肺结节',
        severity: severityFromSizeMm(nodule, 5, 10),
        confidence: clamp01(0.5 + nodule / 100),
        description: `检出结节直径约 ${nodule.toFixed(1)} mm，建议随访观察。`,
      });
    }
    // 积液
    if (f.pleuralEffusion === true) {
      findings.push({
        code: 'effusion',
        name: '胸腔积液',
        severity: 'moderate',
        confidence: 0.85,
        description: '肋膈角变钝 / 液面征象，提示胸腔积液。',
      });
    }
  } else if (studyType === 'ct') {
    if (f.intracranialHemorrhage === true) {
      findings.push({
        code: 'hemorrhage',
        name: '颅内出血',
        severity: 'severe',
        confidence: 0.95,
        description: 'CT 高密度影提示颅内出血，需紧急临床评估。',
      });
    }
    if (f.fractureDetected === true) {
      findings.push({
        code: 'fracture',
        name: '骨折',
        severity: 'moderate',
        confidence: 0.9,
        description: '可见骨折线 / 骨皮质不连续，提示骨折。',
      });
    }
    const mass = Number(f.massSizeMm ?? 0);
    if (Number.isFinite(mass) && mass >= 5) {
      findings.push({
        code: 'mass',
        name: '占位性病变',
        severity: severityFromSizeMm(mass, 10, 30),
        confidence: clamp01(0.6 + mass / 100),
        description: `检出占位病灶约 ${mass.toFixed(1)} mm，建议增强扫描 / 进一步定性。`,
      });
    }
  } else if (studyType === 'xray') {
    if (f.fractureDetected === true) {
      findings.push({
        code: 'fracture',
        name: '骨折',
        severity: 'moderate',
        confidence: 0.9,
        description: '可见骨折线 / 骨皮质不连续，提示骨折。',
      });
    }
    const opacity = clamp01(Number(f.opacityScore ?? 0));
    if (opacity >= 0.5) {
      findings.push({
        code: 'pneumonia',
        name: '肺部感染（肺炎可能）',
        severity: severityFromOpacity(opacity),
        confidence: clamp01(0.4 + opacity * 0.5),
        description: `肺野透亮度降低（评分 ${opacity.toFixed(2)}），提示浸润性改变。`,
      });
    }
  }

  const normal = findings.length === 0;
  const overallConfidence = normal
    ? 0.1
    : findings.reduce((s, x) => s + x.confidence, 0) / findings.length;

  return {
    studyType,
    findings,
    overallConfidence: Math.round(overallConfidence * 10000) / 10000,
    normal,
    disclaimer: IMAGING_AI_DISCLAIMER,
  };
}

/** 各发现对应的中文报告语句与建议 */
const FINDING_PRESENT: Record<string, string> = {
  pneumonia: '肺野可见浸润性密度增高影，透亮度降低。',
  nodule: '肺内可见结节状高密度影。',
  effusion: '肋膈角变钝，可见胸腔积液征象。',
  hemorrhage: '颅内可见高密度出血灶。',
  fracture: '骨皮质不连续，可见骨折线。',
  mass: '可见占位性软组织肿块影。',
};

const FINDING_ADVICE: Record<string, string> = {
  pneumonia: '建议结合血常规、C 反应蛋白，必要时抗感染治疗后短期复查。',
  nodule: '建议按肺结节随访指南定期复查胸部 CT，动态观察大小变化。',
  effusion: '建议评估积液量，必要时穿刺送检，结合心/肝/肾功能查找病因。',
  hemorrhage: '建议立即通知神经外科 / 急诊，控制血压，必要时手术干预。',
  fracture: '建议骨科会诊，制动固定，必要时手术复位。',
  mass: '建议完善增强扫描 / 肿瘤标志物，多学科会诊定性。',
};

/**
 * 【新业务场景】报告生成纯函数。
 * 将 analyzeImaging 产出的结构化发现拼装为中文影像报告草稿。
 * 纯函数、无 I/O。
 */
export function generateImagingReport(
  studyType: StudyType,
  findings: Finding[],
): Report {
  const list = Array.isArray(findings) ? findings : [];

  const findingsText = list.length
    ? list.map((x) => {
        const desc = FINDING_PRESENT[x.code] ?? x.description;
        return `${x.name}：${desc}（置信度 ${(x.confidence * 100).toFixed(0)}%）`;
      })
    : ['双肺/骨骼结构清晰，未见明显异常密度影及骨折线。'];

  const impression = list.length
    ? list.map((x) => x.name).join('；')
    : '未见明显异常（AI 初筛）';

  const recommendations = list.length
    ? list.map((x) => FINDING_ADVICE[x.code]).filter(Boolean)
    : ['建议结合临床症状定期随访，如有不适及时就诊。'];

  return {
    title: `${STUDY_TYPE_LABEL[studyType]}影像 AI 辅助报告`,
    studyType,
    findings: findingsText,
    impression,
    recommendations,
    disclaimer: IMAGING_AI_DISCLAIMER,
  };
}
