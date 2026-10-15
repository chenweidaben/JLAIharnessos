/**
 * 健澜科技 jlmedaios - 医学影像 AI 能力深化 · 病灶级分析聚合器（M152-A）
 *
 * 【AI能力深化】在 M138-A 规则初筛基础上，从"有无异常"深化到"病灶级"刻画：
 *   - analyzeLesion(imageFeatures, modality): LesionAnalysis
 *       对单处病灶输出：病灶定位 lesion_location / 病灶大小 lesion_size /
 *       置信度 confidence / 鉴别诊断列表 differential_list[]。
 *   - generateImagingStructuredReport(studyUid, findings): StructuredReport
 *       按 DICOM SR 思路拼装结构化影像报告（所见 / 定位 / 大小 / 鉴别诊断 / 建议）。
 *
 * 支持模态：CT / MRI / X-ray / Ultrasound（超声）。
 *
 * 医疗安全红线（最高优先级）：
 *   - AI 只是辅助，最终诊断由医生确认；所有返回值自带 disclaimer；
 *   - 本模块为纯函数规则引擎：不调 LLM、不直连 PACS、不读患者隐私、不写库；
 *   - 纯函数、无 I/O、无随机数、无当前时间依赖，便于单测与回归。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 统一医疗安全声明（AI 辅助，最终由医生确认） */
export const IMAGING_DEEP_DISCLAIMER =
  '本结果由 AI 辅助生成，仅供影像科医师阅片参考，不构成最终诊断；辅助诊断，最终由医生确认。';

/** 支持的成像模态 */
export type ImagingModality = 'CT' | 'MRI' | 'X-ray' | 'Ultrasound';

/** 病灶边界 / 形态 */
export type LesionBoundary = 'clear' | 'blurred' | 'spiculated' | 'irregular';
export type LesionMorphology = 'round' | 'oval' | 'lobulated' | 'spiculated' | 'irregular';
/** 密度（CT）/ 信号（MRI）/ 回声（超声）的统一抽象 */
export type LesionDensitySignal =
  | 'low'
  | 'iso'
  | 'high'
  | 'mixed'
  | 'anechoic'
  | 'hypoechoic'
  | 'hyperechoic'
  | 'mixed-echo';

/** 病灶影像特征入参（按模态取用相关字段，其余忽略） */
export interface LesionImageFeatures {
  /** 是否检出病灶（未检出时其余字段忽略） */
  lesionDetected?: boolean;
  /** 解剖定位，如「右肺上叶」「肝 S7 段」「左股骨近端」 */
  lesionLocation?: string;
  /** 病灶最大径 mm */
  lesionSizeMm?: number;
  /** 边界 */
  boundary?: LesionBoundary;
  /** 形态 */
  morphology?: LesionMorphology;
  /** 密度 / 信号 / 回声 */
  densityOrSignal?: LesionDensitySignal;
  /** 有无钙化 */
  calcification?: boolean;
  /** 有无肿大淋巴结 */
  lymphNodeEnlarged?: boolean;
  /** 瘤周水肿（MRI / CT） */
  perilesionalEdema?: boolean;
}

/** 严重程度 */
export type LesionSeverity = 'mild' | 'moderate' | 'severe';

/** 单处病灶的 AI 结构化刻画（对应新增字段 lesion_location / lesion_size / confidence / differential_list） */
export interface LesionFinding {
  /** 病灶分类码 */
  lesionCode: string;
  /** 病灶名称 */
  lesionName: string;
  /** 病灶定位 lesion_location */
  lesionLocation: string;
  /** 病灶大小 lesion_size（人类可读，如「约 20.0 mm」） */
  lesionSize: string;
  /** 置信度 confidence 0~1 */
  confidence: number;
  severity: LesionSeverity;
  /** 鉴别诊断列表 differential_list[] */
  differentialList: string[];
  /** 影像所见描述 */
  description: string;
}

/** analyzeLesion 返回结构 */
export interface LesionAnalysis {
  modality: ImagingModality;
  /** 是否检出病灶 */
  lesionDetected: boolean;
  lesions: LesionFinding[];
  /** 0~1，整体置信度（无病灶时取低基线 0.1） */
  overallConfidence: number;
  /** 汇总鉴别诊断（取所有病灶鉴别诊断去重后的前若干项） */
  differentialList: string[];
  disclaimer: string;
}

/** 结构化报告单节 */
export interface ReportSection {
  title: string;
  items: string[];
}

/** generateImagingStructuredReport 返回结构 */
export interface StructuredReport {
  /** 结构化报告 ID（由 studyUid 派生，保持纯函数确定性） */
  reportId: string;
  /** 检查唯一标识（透传入参） */
  studyUid: string;
  modality: ImagingModality;
  sections: ReportSection[];
  impression: string;
  differentialDiagnosis: string[];
  recommendation: string[];
  disclaimer: string;
}

const MODALITY_LABEL: Record<ImagingModality, string> = {
  CT: 'CT',
  MRI: 'MRI',
  'X-ray': 'X 线',
  Ultrasound: '超声',
};

function clamp01(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function safeSizeMm(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function severityFrom(sizeMm: number, flags: { lymphNode: boolean; spiculated: boolean }): LesionSeverity {
  if (sizeMm >= 30 || flags.lymphNode) return 'severe';
  if (sizeMm >= 15 || flags.spiculated) return 'moderate';
  return 'mild';
}

/**
 * 按模态 + 边界/回声特征给出鉴别诊断列表。
 * 纯查表，便于测试断言。
 */
function differentialFor(modality: ImagingModality, f: LesionImageFeatures): string[] {
  const boundary = f.boundary;
  const echo = f.densityOrSignal;

  switch (modality) {
    case 'CT':
      if (boundary === 'spiculated') {
        return ['周围型肺癌', '肺结核球', '炎性假瘤'];
      }
      if (f.calcification) {
        return ['错构瘤', '结核球', '良性钙化结节'];
      }
      return ['良性结节', '感染性病变', '肿瘤性病变待排'];
    case 'MRI':
      if (f.perilesionalEdema) {
        return ['胶质瘤', '脑转移瘤', '脑膜瘤'];
      }
      return ['颅内肿瘤待排', '脱髓鞘病变', '血管性病变'];
    case 'X-ray':
      if (boundary === 'irregular') {
        return ['骨肿瘤', '骨囊肿', '骨髓炎'];
      }
      return ['退行性改变', '陈旧性损伤', '良性骨病变'];
    case 'Ultrasound':
      if (echo === 'anechoic') {
        return ['囊肿', '血管瘤', '正常解剖变异'];
      }
      if (echo === 'hypoechoic') {
        return ['实性占位', '恶性肿瘤待排', '炎性结节'];
      }
      return ['良性结节', '增生性改变', '占位待排'];
    default:
      return ['占位待排', '良性病变', '恶性病变待排'];
  }
}

/**
 * 【AI能力深化】病灶级分析纯函数。
 * 输入模态 + 影像特征，输出病灶定位 / 大小 / 置信度 / 鉴别诊断。
 * 纯函数、无 I/O、无随机、无当前时间依赖。
 */
export function analyzeLesion(
  imageFeatures: LesionImageFeatures = {},
  modality: ImagingModality = 'CT',
): LesionAnalysis {
  const f = imageFeatures ?? {};
  const location = (f.lesionLocation ?? '').trim() || '未定位';
  const sizeMm = safeSizeMm(f.lesionSizeMm);
  const sizeText = sizeMm > 0 ? `约 ${sizeMm.toFixed(1)} mm` : '未测量';

  // 未检出病灶：直接返回低置信基线，不生成病灶条目。
  if (f.lesionDetected !== true) {
    return {
      modality,
      lesionDetected: false,
      lesions: [],
      overallConfidence: 0.1,
      differentialList: [],
      disclaimer: IMAGING_DEEP_DISCLAIMER,
    };
  }

  // 置信度：基准 + 影像征象加权（毛刺 / 淋巴结 / 水肿 / 钙化 / 大小）。
  let confidence = 0.55;
  if (f.boundary === 'spiculated') confidence += 0.15;
  if (f.lymphNodeEnlarged === true) confidence += 0.1;
  if (f.perilesionalEdema === true) confidence += 0.08;
  if (f.calcification === true) confidence += 0.05;
  confidence += Math.min(sizeMm / 100, 0.15);
  confidence = clamp01(confidence);

  const severity = severityFrom(sizeMm, {
    lymphNode: f.lymphNodeEnlarged === true,
    spiculated: f.boundary === 'spiculated',
  });

  const differentialList = differentialFor(modality, f);

  const descriptionParts: string[] = [
    `${MODALITY_LABEL[modality]} 于 ${location} 检出病灶`,
    sizeMm > 0 ? `最大径 ${sizeMm.toFixed(1)} mm` : '',
    f.boundary ? `边界${boundaryLabel(f.boundary)}` : '',
    f.lymphNodeEnlarged === true ? '伴肿大淋巴结' : '',
    f.perilesionalEdema === true ? '伴瘤周水肿' : '',
  ].filter(Boolean);

  const finding: LesionFinding = {
    lesionCode: `${modality.toLowerCase().replace('-', '_')}_lesion`,
    lesionName: `${MODALITY_LABEL[modality]}占位性病灶`,
    lesionLocation: location,
    lesionSize: sizeText,
    confidence: round4(confidence),
    severity,
    differentialList,
    description: descriptionParts.join('，') + '。',
  };

  return {
    modality,
    lesionDetected: true,
    lesions: [finding],
    overallConfidence: round4(confidence),
    differentialList,
    disclaimer: IMAGING_DEEP_DISCLAIMER,
  };
}

function boundaryLabel(b: LesionBoundary): string {
  switch (b) {
    case 'clear':
      return '清晰';
    case 'blurred':
      return '模糊';
    case 'spiculated':
      return '毛刺状';
    case 'irregular':
      return '不规则';
    default:
      return b;
  }
}

/**
 * 【AI能力深化】结构化影像报告生成纯函数。
 * 将 analyzeLesion 产出的病灶条目按「所见 / 病灶详情 / 鉴别诊断 / 建议」拼装为报告草稿。
 * 纯函数、无 I/O、无当前时间依赖（reportId 由 studyUid 派生，保证可复现）。
 */
export function generateImagingStructuredReport(
  studyUid: string,
  findings: LesionFinding[] = [],
): StructuredReport {
  const uid = (studyUid ?? '').trim() || 'UNKNOWN-STUDY';
  const list = Array.isArray(findings) ? findings : [];
  const modality: ImagingModality = list[0]?.lesionCode?.startsWith('mri')
    ? 'MRI'
    : list[0]?.lesionCode?.startsWith('x_ray')
      ? 'X-ray'
      : list[0]?.lesionCode?.startsWith('ultrasound')
        ? 'Ultrasound'
        : 'CT';

  const impression = list.length
    ? list.map((x) => `${x.lesionName}（${x.lesionLocation}，${x.lesionSize}）`).join('；')
    : '本次检查未见明确占位性病灶（AI 辅助初筛）';

  const differentialSet: string[] = [];
  for (const x of list) {
    for (const d of x.differentialList ?? []) {
      if (!differentialSet.includes(d)) differentialSet.push(d);
    }
  }

  const recommendation = list.length
    ? [
        '建议结合增强扫描 / 多序列成像进一步定性；',
        '建议多学科会诊（MDT）并动态随访观察病灶大小变化；',
        '本报告为 AI 草稿，须由影像科医师核对修改后签发。',
      ]
    : ['建议结合临床定期随访，如有症状变化及时复查。'];

  const sections: ReportSection[] = list.length
    ? [
        {
          title: '影像所见',
          items: list.map((x) => x.description),
        },
        {
          title: '病灶详情',
          items: list.map(
            (x) =>
              `${x.lesionName}｜定位：${x.lesionLocation}｜大小：${x.lesionSize}｜` +
              `置信度：${(x.confidence * 100).toFixed(0)}%｜严重程度：${x.severity}`,
          ),
        },
        {
          title: '鉴别诊断',
          items: differentialSet,
        },
      ]
    : [{ title: '影像所见', items: ['各序列/切面未见明确异常信号/回声灶。'] }];

  return {
    reportId: `SR-${uid}`,
    studyUid: uid,
    modality,
    sections,
    impression,
    differentialDiagnosis: differentialSet,
    recommendation,
    disclaimer: IMAGING_DEEP_DISCLAIMER,
  };
}
