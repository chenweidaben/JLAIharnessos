/**
 * 健澜科技 jlmedaios - 智能病历草稿生成（M126-A）
 *
 * 纯函数 generateMedicalRecordDraft：汇聚 患者信息 / 症状主诉 / 检验结果 / 初步诊断，
 * 按门诊/住院病历规范七段式组织：主诉 / 现病史 / 既往史 / 体格检查 / 辅助检查 /
 * 初步诊断 / 处理意见，输出结构化 sections + 可直接预览编辑的整稿 content。
 *
 * 【AI能力升级】不依赖外部大模型调用，本地规则引擎确定性生成：
 *  - 主诉取首项症状，现病史按「因…就诊」句式拼接；
 *  - 辅助检查自动识别异常指标并标注 ↑/↓，正常指标聚合计数；
 *  - 处理意见按诊断关键词命中诊疗规则包（抗感染 / 术后 / 通用支持）；
 *  - 患者原始标识一律脱敏后输出，不落库、不留明文。
 *
 * 医疗合规定位：本草稿为"起稿助手"，所有内容需经主治医师审核修改后方可归档。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 患者/就诊信息（仅接收医师已录入或授权展示的字段） */
export interface DraftPatientInfo {
  /** 原始患者/就诊标识：仅服务端内部使用，输出统一脱敏，禁止回显明文 */
  patientId?: string;
  name?: string;
  gender?: string;
  age?: number | null;
  department?: string;
}

/** 单条检验指标 */
export interface DraftLabItem {
  markerName: string;
  value: string;
  unit: string;
  abnormal?: 'high' | 'low' | 'normal' | null;
}

/** 病历七段（键名与病历规范段名一一对应） */
export interface DraftRecordSections {
  chiefComplaint: string; // 主诉
  presentIllness: string; // 现病史
  pastHistory: string; // 既往史
  physicalExam: string; // 体格检查
  auxiliaryExam: string; // 辅助检查
  diagnosis: string; // 初步诊断
  treatmentPlan: string; // 处理意见
}

/** 病历草稿输出结构 */
export interface DraftRecord {
  visitId: string;
  patientIdMasked: string;
  sections: DraftRecordSections;
  /** 整稿纯文本（七段拼接，供前端 TextArea 直接预览/编辑） */
  content: string;
  disclaimer: string;
  generatedAt: string;
  modelVersion: string;
}

const DRAFT_MODEL_VERSION = 'jlmedaios-record-draft-v1';

export const DRAFT_DISCLAIMER =
  '本草稿由健澜科技 AI 辅助生成，仅供医师起稿参考，需经主治医师审核确认后方可归入正式病历。';

/** 患者标识脱敏：保留首尾各 2 位，中间以 * 替代；过短标识全掩 */
function maskPatientId(raw: string): string {
  const id = raw.trim();
  if (!id) return '未提供';
  if (id.length <= 4) return '****';
  return `${id.slice(0, 2)}****${id.slice(-2)}`;
}

/** 主诉：取首项症状；缺失则提示待补充 */
function buildChiefComplaint(symptoms: string[]): string {
  const first = symptoms[0]?.trim();
  return first ? first : '待补充，请医师填写主诉。';
}

/** 现病史：按「因…就诊」句式组织；症状为空时给出待补提示 */
function buildPresentIllness(symptoms: string[]): string {
  const cleaned = symptoms.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return '起病时间、诱因及伴随症状待补充，请医师完善现病史描述。';
  }
  return (
    `患者近期出现${cleaned.join('、')}，遂来我院就诊。` +
    '发病以来精神、食欲、睡眠及大小便情况待补充，体重变化待补充；' +
    '本次就诊前是否自行用药及疗效待补充。'
  );
}

/** 既往史：默认通用否认模板（医师可在编辑态修改） */
function buildPastHistory(): string {
  return (
    '既往平素体健，否认高血压、糖尿病、冠心病、脑血管病等慢性病史；' +
    '否认肝炎、结核等传染病史；否认手术、外伤、输血史；' +
    '否认食物及药物过敏史；预防接种史随社会计划。'
  );
}

/** 体格检查：默认通用查体模板，生命体征项显式留待现场测量 */
function buildPhysicalExam(): string {
  return (
    '体温、脉搏、呼吸、血压待现场测量填写。一般情况可，神志清楚，精神可；' +
    '全身皮肤黏膜无黄染及出血点，浅表淋巴结未触及肿大；' +
    '双肺呼吸音清，未闻及明显干湿性啰音；心率齐，各瓣膜听诊区未闻及病理性杂音；' +
    '腹平软，无压痛及反跳痛，肝脾肋下未触及；双下肢无水肿；神经系统查体未见明显异常。'
  );
}

/** 辅助检查：异常指标逐条列示并标注方向，正常指标聚合计数；无数据则待回报 */
function buildAuxiliaryExam(labs: DraftLabItem[]): string {
  const valid = labs.filter((l) => l && l.markerName?.trim());
  if (valid.length === 0) return '相关辅助检查待回报。';

  const abnormal = valid.filter((l) => l.abnormal === 'high' || l.abnormal === 'low');
  const normalCount = valid.length - abnormal.length;

  const lines: string[] = [];
  if (abnormal.length > 0) {
    lines.push(
      '异常指标：' +
        abnormal
          .map((l) => `${l.markerName.trim()} ${String(l.value).trim()}${l.unit || ''}（${l.abnormal === 'high' ? '↑' : '↓'}）`)
          .join('；'),
    );
  } else {
    lines.push('本次送检指标未见明显异常。');
  }
  if (normalCount > 0) lines.push(`其余 ${normalCount} 项指标在参考范围内。`);
  return lines.join(' ');
}

/** 初步诊断：多诊断以分号连接；为空时给出待明确提示 */
function buildDiagnosis(diagnosis: string[]): string {
  const cleaned = diagnosis.map((d) => d.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join('；') : '待明确，请结合病史及辅助检查结果拟定。';
}

interface TreatmentRule {
  keywords: string[];
  plan: string;
}

/** 处理意见规则包：按诊断关键词命中；多关键词同时命中时按顺序合并 */
const TREATMENT_RULES: TreatmentRule[] = [
  {
    keywords: ['肺炎', '感染', '发热', '呼吸道'],
    plan: '1. 完善痰培养、胸部影像学等病原学及影像学检查；2. 经验性抗感染治疗，待病原学结果回报后调整用药；3. 必要时吸氧、雾化等对症处理；4. 密切监测体温、呼吸及血氧变化。',
  },
  {
    keywords: ['术后', '手术', '切口', '外伤'],
    plan: '1. 保持切口敷料干燥固定，定期换药、观察愈合情况；2. 疼痛评估并按需镇痛；3. 早期床上活动、循序渐进下床，预防深静脉血栓；4. 观察排气排便及经口进食耐受情况。',
  },
  {
    keywords: ['高血压', '血压'],
    plan: '1. 规范监测血压并记录；2. 完善心电图、心脏超声及靶器官评估；3. 按指南起始或调整降压方案；4. 低盐饮食宣教，定期随访。',
  },
  {
    keywords: ['糖尿病', '血糖'],
    plan: '1. 监测空腹及餐后血糖谱；2. 完善糖化血红蛋白及胰岛功能评估；3. 按指南起始或调整降糖方案；4. 糖尿病饮食与运动宣教，警惕低血糖。',
  },
];

const DEFAULT_TREATMENT =
  '1. 完善血、尿、便常规及肝肾功能、电解质、心电图、胸片等入院常规检查；' +
  '2. 对症支持治疗，维持水电解质及能量平衡；' +
  '3. 待辅助检查结果回报后进一步明确诊断并调整诊疗方案；' +
  '4. 密切观察病情变化，及时记录病程。';

/** 处理意见：诊断关键词命中规则包，未命中走通用支持方案 */
function buildTreatmentPlan(diagnosis: string[]): string {
  const merged = diagnosis.map((d) => d.trim()).filter(Boolean).join('；');
  const hit = TREATMENT_RULES.filter((rule) => rule.keywords.some((k) => merged.includes(k)));
  if (hit.length === 0) return DEFAULT_TREATMENT;
  // 去重合并命中规则，最多取前 2 组，避免意见过长
  return [...new Set(hit.map((h) => h.plan))].slice(0, 2).join('\n');
}

/**
 * AI能力升级：智能病历草稿生成纯函数
 *
 * @param visitId    就诊ID（必填，用于草稿溯源）
 * @param patientInfo 患者信息（原始 patientId 仅内部使用，输出自动脱敏）
 * @param symptoms   症状/主诉素材列表（逐行为一项）
 * @param labs       检验指标列表（含异常标记）
 * @param diagnosis  初步诊断列表
 */
export function generateMedicalRecordDraft(
  visitId: string,
  patientInfo: DraftPatientInfo,
  symptoms: string[],
  labs: DraftLabItem[],
  diagnosis: string[],
): DraftRecord {
  const sections: DraftRecordSections = {
    chiefComplaint: buildChiefComplaint(symptoms),
    presentIllness: buildPresentIllness(symptoms),
    pastHistory: buildPastHistory(),
    physicalExam: buildPhysicalExam(),
    auxiliaryExam: buildAuxiliaryExam(labs),
    diagnosis: buildDiagnosis(diagnosis),
    treatmentPlan: buildTreatmentPlan(diagnosis),
  };

  const patientIdMasked = maskPatientId(patientInfo?.patientId ?? '');
  const genderAge =
    [patientInfo?.gender, patientInfo?.age != null ? `${patientInfo.age}岁` : null]
      .filter(Boolean)
      .join('，') || '性别年龄待补充';

  const content = [
    '【AI辅助病历草稿 · 智能生成 M126-A】',
    `就诊ID：${visitId?.trim() || '未提供'}`,
    `患者标识：${patientIdMasked}（${genderAge}${patientInfo?.department ? `，科室：${patientInfo.department.trim()}` : ''}）`,
    '',
    `主诉：${sections.chiefComplaint}`,
    `现病史：${sections.presentIllness}`,
    `既往史：${sections.pastHistory}`,
    `体格检查：${sections.physicalExam}`,
    `辅助检查：${sections.auxiliaryExam}`,
    `初步诊断：${sections.diagnosis}`,
    `处理意见：${sections.treatmentPlan}`,
    '',
    `—— ${DRAFT_DISCLAIMER}`,
  ].join('\n');

  return {
    visitId: visitId?.trim() || '',
    patientIdMasked,
    sections,
    content,
    disclaimer: DRAFT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    modelVersion: DRAFT_MODEL_VERSION,
  };
}
