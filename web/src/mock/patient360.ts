/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者360聚合 Mock：依据诊断与护理级别生成医学合理的
 * 就诊记录 / 检验报告 / 影像报告 / 医嘱 / 病历文书（全部虚拟、脱敏、确定性生成）。
 * 用药严格规避患者过敏史（青霉素、磺胺、造影剂等）。
 */
import type {
  Patient,
  Encounter,
  LabReport,
  LabItem,
  ImagingReport,
  OrderRecord,
  MedicalDocument,
} from '@/types/patient';
import { uid } from './utils';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * DAY).toISOString();
const inDays = (d: number) => new Date(Date.now() + d * DAY).toISOString();

/** 由字符串生成确定性伪随机数，保证同一患者每次打开数据一致 */
function seeded(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hasAllergy = (p: Patient, kw: string) => (p.allergies ?? []).some((a) => a.includes(kw));
const diag = (p: Patient, ...kw: string[]) => kw.some((k) => (p.diagnosis ?? '').includes(k));

function item(
  name: string,
  value: number | string,
  unit: string,
  refRange: string,
  flag: LabItem['flag'] = 'normal',
): LabItem {
  return { name, value, unit, refRange, flag };
}

/* ============================= 就诊记录 ============================= */
export function buildEncounters(p: Patient): Encounter[] {
  const rnd = seeded(p.patientNo + 'enc');
  const list: Encounter[] = [
    {
      id: uid('enc_'),
      patientId: p.id,
      encounterNo: `ZY${p.patientNo.slice(2)}`,
      type: 'inpatient',
      deptName: p.deptName ?? '',
      doctorName: '陈*（主治医师）',
      startTime: daysAgo(3 + Math.floor(rnd() * 4)),
      chiefComplaint: chiefComplaint(p),
      status: 'ongoing',
    },
  ];
  if (rnd() > 0.25) {
    list.push({
      id: uid('enc_'),
      patientId: p.id,
      encounterNo: `MZ${p.patientNo.slice(2, 8)}0${1 + Math.floor(rnd() * 8)}`,
      type: 'outpatient',
      deptName: p.deptName ?? '',
      doctorName: '王*（副主任医师）',
      startTime: daysAgo(40 + Math.floor(rnd() * 120)),
      endTime: daysAgo(40 + Math.floor(rnd() * 120)),
      chiefComplaint: '门诊随访，复查调整用药',
      status: 'finished',
    });
  }
  return list;
}

function chiefComplaint(p: Patient): string {
  if (diag(p, '肺部感染', '肺炎', 'COPD', '阻塞性肺')) return '咳嗽、咳痰伴发热、气促 3 天';
  if (diag(p, '心绞痛', '冠心病')) return '反复胸闷、胸痛 1 周，加重 6 小时';
  if (diag(p, '脑梗')) return '右侧肢体乏力伴言语不清 2 天';
  if (diag(p, '糖尿病')) return '口干、多饮、多尿伴血糖升高';
  if (diag(p, '高血压')) return '头晕、头痛，自测血压升高';
  if (diag(p, '甲亢')) return '心悸、怕热、多汗、消瘦 1 月';
  return '身体不适，要求住院进一步诊治';
}

/* ============================= 检验报告 ============================= */
export function buildLabReports(p: Patient): LabReport[] {
  const reports: LabReport[] = [];

  // 血常规（感染相关疾病给异常）
  const infected = diag(p, '感染', '肺炎', '阻塞性肺');
  reports.push({
    id: uid('lab_'),
    reportNo: `L${p.patientNo.slice(-4)}-01`,
    category: '血常规',
    specimen: '静脉血',
    reportTime: hoursAgo(20),
    status: 'final',
    reporter: '林*（检验技师）',
    items: [
      item('白细胞计数 WBC', infected ? 12.6 : 6.8, '10^9/L', '3.5-9.5', infected ? 'high' : 'normal'),
      item('中性粒细胞比例 N%', infected ? 86.4 : 62.1, '%', '40-75', infected ? 'high' : 'normal'),
      item('血红蛋白 HGB', 128, 'g/L', '115-150'),
      item('血小板 PLT', 214, '10^9/L', '125-350'),
      item('C反应蛋白 CRP', infected ? 96.5 : 6.2, 'mg/L', '0-8', infected ? 'high' : 'normal'),
    ],
  });

  // 生化 / 专科检验
  const bio: LabItem[] = [
    item('谷丙转氨酶 ALT', 24, 'U/L', '9-50'),
    item('肌酐 Cr', 78, 'umol/L', '57-111'),
    item('尿素氮 BUN', 5.6, 'mmol/L', '3.1-8.0'),
    item('血钾 K', potassium(p), 'mmol/L', '3.5-5.3', potassiumFlag(p)),
    item('血钠 Na', 140, 'mmol/L', '137-147'),
    item('空腹血糖 GLU', glucose(p), 'mmol/L', '3.9-6.1', glucoseFlag(p)),
  ];
  if (diag(p, '糖尿病')) {
    bio.push(item('糖化血红蛋白 HbA1c', 8.9, '%', '4.0-6.0', 'high'));
    bio.push(item('尿微量白蛋白', 46, 'mg/L', '0-30', 'high'));
  }
  if (diag(p, '甲亢')) {
    bio.push(item('促甲状腺激素 TSH', 0.05, 'mIU/L', '0.27-4.2', 'low'));
    bio.push(item('游离T3 FT3', 9.8, 'pmol/L', '3.1-6.8', 'high'));
    bio.push(item('游离T4 FT4', 28.6, 'pmol/L', '12.0-22.0', 'high'));
  }
  reports.push({
    id: uid('lab_'),
    reportNo: `L${p.patientNo.slice(-4)}-02`,
    category: '生化' + (diag(p, '糖尿病') ? ' / 糖代谢' : diag(p, '甲亢') ? ' / 甲状腺功能' : ''),
    specimen: '静脉血',
    reportTime: hoursAgo(18),
    status: 'final',
    reporter: '黄*（主管检验师）',
    items: bio,
  });

  // 心血管专项
  if (diag(p, '心绞痛', '冠心病', '脑梗')) {
    reports.push({
      id: uid('lab_'),
      reportNo: `L${p.patientNo.slice(-4)}-03`,
      category: '心肌损伤标志物',
      specimen: '静脉血',
      reportTime: hoursAgo(8),
      status: 'final',
      reporter: '林*（检验技师）',
      items: [
        item('肌钙蛋白I cTnI', diag(p, '心绞痛') ? 0.06 : 0.02, 'ng/mL', '0-0.04', diag(p, '心绞痛') ? 'high' : 'normal'),
        item('肌酸激酶 CK', 96, 'U/L', '50-310'),
        item('CK-MB', 18, 'U/L', '0-25'),
        item('B型钠尿肽 BNP', 186, 'pg/mL', '0-100', 'high'),
        item('低密度脂蛋白 LDL-C', 3.42, 'mmol/L', '0-3.37', 'high'),
      ],
    });
  }

  // 呼吸专项（血气）
  if (diag(p, '阻塞性肺', '肺炎', '感染')) {
    const severe = diag(p, '阻塞性肺');
    reports.push({
      id: uid('lab_'),
      reportNo: `L${p.patientNo.slice(-4)}-04`,
      category: '动脉血气分析',
      specimen: '动脉血',
      reportTime: hoursAgo(6),
      status: severe ? 'critical' : 'final',
      reporter: '赵*（检验技师）',
      items: [
        item('酸碱度 pH', severe ? 7.31 : 7.40, '', '7.35-7.45', severe ? 'low' : 'normal'),
        item('氧分压 PaO2', severe ? 54 : 88, 'mmHg', '83-108', severe ? 'critical' : 'normal'),
        item('二氧化碳分压 PaCO2', severe ? 57 : 40, 'mmHg', '35-45', severe ? 'high' : 'normal'),
        item('血氧饱和度 SaO2', severe ? 86 : 96, '%', '95-100', severe ? 'critical' : 'normal'),
      ],
    });
  }

  return reports;
}

function potassium(p: Patient): number {
  // 王**（糖尿病合并感染，已在告警中给高钾）给危急高钾；其余正常
  if (p.diagnosis?.includes('糖尿病合并肺部感染')) return 6.8;
  return 4.2;
}
function potassiumFlag(p: Patient): LabItem['flag'] {
  return potassium(p) >= 6.0 ? 'critical' : 'normal';
}
function glucose(p: Patient): number {
  if (diag(p, '糖尿病')) return 11.8;
  return 5.4;
}
function glucoseFlag(p: Patient): LabItem['flag'] {
  return diag(p, '糖尿病') ? 'high' : 'normal';
}

/* ============================= 影像报告 ============================= */
export function buildImagings(p: Patient): ImagingReport[] {
  const list: ImagingReport[] = [];
  if (diag(p, '阻塞性肺', '肺炎', '感染')) {
    list.push({
      id: uid('img_'),
      reportNo: `CT${p.patientNo.slice(-4)}`,
      modality: 'CT',
      part: '胸部',
      reportTime: hoursAgo(16),
      finding:
        '双肺纹理增多、紊乱，' +
        (diag(p, '阻塞性肺') ? '双肺透亮度增高，双下肺可见斑片状模糊影；' : '双下肺可见斑片状渗出影；') +
        '气管及主支气管通畅，纵隔未见明显肿大淋巴结，双侧胸腔未见明显积液。',
      impression: diag(p, '阻塞性肺') ? '慢性支气管炎、肺气肿改变；双下肺感染，建议治疗后复查' : '双下肺感染性病变，建议抗炎后复查',
      reporter: '周*（放射科副主任医师）',
      status: 'final',
    });
  }
  if (diag(p, '脑梗')) {
    list.push({
      id: uid('img_'),
      reportNo: `MR${p.patientNo.slice(-4)}`,
      modality: 'MR',
      part: '头颅',
      reportTime: hoursAgo(30),
      finding: '右侧基底节区可见点片状长T1、长T2信号，DWI序列呈高信号；脑室系统大小形态正常，中线结构居中。',
      impression: '右侧基底节区急性脑梗死灶，建议结合临床及MRI复查',
      reporter: '周*（放射科副主任医师）',
      status: 'final',
    });
  }
  if (diag(p, '心绞痛', '冠心病')) {
    list.push({
      id: uid('img_'),
      reportNo: `ECG${p.patientNo.slice(-4)}`,
      modality: 'ECG',
      part: '十二导联心电图',
      reportTime: hoursAgo(10),
      finding: '窦性心律，V1-V4导联ST段压低0.1-0.2mV，T波低平倒置。',
      impression: 'ST-T改变，提示心肌缺血，请结合临床',
      reporter: '吴*（心电诊断医师）',
      status: 'final',
    });
  }
  if (diag(p, '甲亢')) {
    list.push({
      id: uid('img_'),
      reportNo: `US${p.patientNo.slice(-4)}`,
      modality: 'US',
      part: '甲状腺',
      reportTime: daysAgo(2),
      finding: '甲状腺弥漫性对称性增大，包膜光滑，内部回声不均匀、增粗减低，血流信号明显增多呈“火海征”。',
      impression: '甲状腺弥漫性病变，符合甲状腺功能亢进超声表现',
      reporter: '孙*（超声主治医师）',
      status: 'final',
    });
  }
  if (list.length === 0) {
    list.push({
      id: uid('img_'),
      reportNo: `DR${p.patientNo.slice(-4)}`,
      modality: 'DR',
      part: '胸部正位',
      reportTime: daysAgo(1),
      finding: '双肺纹理清晰，未见明显实变影；心影大小形态正常；双侧膈面光滑，肋膈角锐利。',
      impression: '心肺膈未见明显异常',
      reporter: '周*（放射科医师）',
      status: 'final',
    });
  }
  return list;
}

/* ============================= 医嘱 ============================= */
const CARE_ORDER: Record<string, string> = {
  special: '特级护理',
  first: '一级护理',
  second: '二级护理',
  third: '三级护理',
};

export function buildOrders(p: Patient): OrderRecord[] {
  const orders: OrderRecord[] = [];
  const add = (o: Omit<OrderRecord, 'id' | 'startDate' | 'doctorName'>, dayAgo: number) =>
    orders.push({
      id: uid('ord_'),
      startDate: daysAgo(dayAgo),
      doctorName: '陈*（主治医师）',
      ...o,
    });

  add(
    { category: 'nursing', content: CARE_ORDER[p.careLevel ?? 'second'] ?? '二级护理', longTerm: true, frequency: '持续', status: 'active', priority: p.careLevel === 'special' ? 'stat' : 'routine' },
    3,
  );
  add(
    {
      category: 'diet',
      content: diag(p, '糖尿病') ? '糖尿病饮食' : diag(p, '高血压', '心绞痛', '冠心病') ? '低盐低脂饮食' : '普食',
      longTerm: true,
      frequency: '每日三餐',
      status: 'active',
    },
    3,
  );

  // 用药（规避过敏史）
  const penicillinAllergic = hasAllergy(p, '青霉素');
  const sulfaAllergic = hasAllergy(p, '磺胺');
  if (diag(p, '感染', '肺炎', '阻塞性肺')) {
    const antibiotic =
      penicillinAllergic || sulfaAllergic
        ? '乳酸左氧氟沙星氯化钠注射液 0.5g'
        : '注射用头孢哌酮钠舒巴坦钠 3g';
    add({ category: 'medication', content: antibiotic, dosage: 'ivgtt', frequency: '每日1次', longTerm: true, status: 'active', priority: 'urgent' }, 3);
    add({ category: 'medication', content: '盐酸氨溴索注射液 30mg', dosage: 'ivgtt', frequency: '每日2次', longTerm: true, status: 'active' }, 3);
  }
  if (diag(p, '糖尿病')) {
    add({ category: 'medication', content: '盐酸二甲双胍片 0.5g', dosage: 'po', frequency: '每日3次 餐中', longTerm: true, status: 'active' }, 3);
    add({ category: 'medication', content: '门冬胰岛素30注射液', dosage: '皮下注射', frequency: '早12U 晚10U 餐前', longTerm: true, status: 'active' }, 2);
    add({ category: 'treatment', content: '血糖监测', frequency: '空腹及三餐后2小时', longTerm: true, status: 'active' }, 2);
  }
  if (diag(p, '高血压')) {
    add({ category: 'medication', content: '苯磺酸氨氯地平片 5mg', dosage: 'po', frequency: '每日1次 晨服', longTerm: true, status: 'active' }, 3);
    add({ category: 'medication', content: '缬沙坦胶囊 80mg', dosage: 'po', frequency: '每日1次', longTerm: true, status: 'active' }, 3);
    add({ category: 'treatment', content: '血压监测', frequency: '每日3次', longTerm: true, status: 'active' }, 3);
  }
  if (diag(p, '心绞痛', '冠心病')) {
    add({ category: 'medication', content: '阿司匹林肠溶片 100mg', dosage: 'po', frequency: '每日1次', longTerm: true, status: 'active' }, 3);
    add({ category: 'medication', content: '硫酸氢氯吡格雷片 75mg', dosage: 'po', frequency: '每日1次', longTerm: true, status: 'active' }, 3);
    add({ category: 'medication', content: '阿托伐他汀钙片 20mg', dosage: 'po', frequency: '每晚1次', longTerm: true, status: 'active' }, 3);
    add({ category: 'medication', content: '硝酸甘油片 0.5mg', dosage: '舌下含服', frequency: '胸痛时', longTerm: false, status: 'active', priority: 'stat' }, 1);
  }
  if (diag(p, '脑梗')) {
    add({ category: 'medication', content: '阿司匹林肠溶片 100mg', dosage: 'po', frequency: '每日1次', longTerm: true, status: 'active' }, 2);
    add({ category: 'medication', content: '丁苯酞软胶囊 0.2g', dosage: 'po', frequency: '每日3次', longTerm: true, status: 'active' }, 2);
  }
  if (diag(p, '甲亢')) {
    add({ category: 'medication', content: '甲巯咪唑片 10mg', dosage: 'po', frequency: '每日2次', longTerm: true, status: 'active' }, 2);
  }

  // 通用监测与检查
  add({ category: 'treatment', content: '生命体征监测', frequency: '每日4次', longTerm: true, status: 'active' }, 3);
  add({ category: 'lab', content: '血常规、生化、电解质复查', longTerm: false, frequency: '明晨采血', status: 'pending' }, 0);
  // 一条已停医嘱，体现状态闭环
  orders.push({
    id: uid('ord_'),
    category: 'medication',
    content: '注射用头孢呋辛钠 1.5g',
    dosage: 'ivgtt',
    frequency: '每日2次',
    longTerm: true,
    startDate: daysAgo(3),
    stopDate: daysAgo(1),
    doctorName: '陈*（主治医师）',
    status: 'stopped',
  });
  return orders;
}

/* ============================= 病历文书 ============================= */
export function buildDocuments(p: Patient): MedicalDocument[] {
  return [
    {
      id: uid('doc_'),
      docType: 'admission',
      title: '入院记录',
      authorName: '陈*（主治医师）',
      recordTime: daysAgo(3),
      status: 'signed',
      summary: `患者因"${chiefComplaint(p)}"入院。既往史、个人史、家族史已采集，查体及辅助检查见病历正文，初步诊断：${p.diagnosis}。`,
    },
    {
      id: uid('doc_'),
      docType: 'progress',
      title: '首次病程记录',
      authorName: '陈*（住院医师）',
      recordTime: daysAgo(3),
      status: 'signed',
      summary: '病例特点、拟诊讨论与诊疗计划已记录，明确诊断依据及鉴别诊断，予对症支持治疗并完善相关检查。',
    },
    {
      id: uid('doc_'),
      docType: 'round',
      title: '上级医师查房记录',
      authorName: '王*（副主任医师）',
      recordTime: daysAgo(2),
      status: 'signed',
      summary: '上级医师查房，同意目前诊断与治疗方案，指示密切观察病情变化、及时复查关键指标，注意用药安全与过敏史核对。',
    },
    {
      id: uid('doc_'),
      docType: 'consent',
      title: '住院知情同意书',
      authorName: '陈*（主治医师）',
      recordTime: daysAgo(3),
      status: 'signed',
      summary: '已向患者及家属告知病情、诊疗方案、潜在风险与替代方案，患者及家属表示理解并签署知情同意。',
    },
    {
      id: uid('doc_'),
      docType: 'progress',
      title: '日常病程记录',
      authorName: '陈*（住院医师）',
      recordTime: hoursAgo(20),
      status: 'audited',
      summary: '患者神志清楚，生命体征趋稳，症状较前缓解，继续当前治疗，护理级别与饮食按医嘱执行。',
    },
  ];
}

/* 预留出院日期（用于在院患者预估，非病历） */
export { inDays };
