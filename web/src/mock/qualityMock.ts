/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗质量管理（质控）场景 - Mock 数据
 * 说明：所有患者均为虚拟数据，姓名/身份证等已脱敏，仅用于产品演示。
 */
import type {
  CoreSystemCheckResult,
  CoreSystemItem,
  DefectLevel,
  DefectType,
  FrontPageRecord,
  QualityDefect,
  QualityResult,
  QualityRule,
  QualityStats,
  QualityTask,
  RecordGrade,
  RecordSection,
  RectificationTask,
} from '@/types/quality';
import { rand } from '@/mock/utils';

/* ------------------------------ 基础字典 ------------------------------ */

export const QUALITY_DEPTS = [
  '心内科',
  '呼吸内科',
  '消化内科',
  '神经内科',
  '普外科',
  '骨科',
  '神经外科',
  '泌尿外科',
  '妇产科',
  '儿科',
  '肿瘤科',
  '急诊科',
];

export const QUALITY_DOCTORS = [
  '陈建国',
  '李晓东',
  '王慧敏',
  '张明远',
  '刘海燕',
  '赵德柱',
  '孙雅静',
  '周文斌',
  '吴桂芳',
  '郑天赐',
];

export const DOCTOR_TITLES = ['住院医师', '主治医师', '副主任医师', '主任医师'];

/** 已脱敏的虚拟患者姓名池 */
const MASKED_NAMES = [
  '张*明',
  '李*华',
  '王*英',
  '刘*强',
  '陈*兰',
  '杨*军',
  '赵*梅',
  '黄*涛',
  '周*红',
  '吴*龙',
  '徐*萍',
  '孙*伟',
  '马*娟',
  '朱*峰',
  '胡*燕',
  '郭*刚',
  '何*秀',
  '高*磊',
  '林*芳',
  '罗*军',
];

const RECORD_TYPES: QualityTask['recordType'][] = [
  '运行病历',
  '出院病历',
  '死亡病历',
  '手术病历',
  '门诊病历',
  '急诊病历',
];

/* ------------------------------ 质控任务列表（60条） ------------------------------ */

function buildTasks(): QualityTask[] {
  const list: QualityTask[] = [];
  const statuses: QualityTask['status'][] = [
    'pending',
    'pending',
    'pending',
    'checking',
    'checked',
    'checked',
    'to_rectify',
    'rectified',
  ];
  for (let i = 0; i < 60; i++) {
    const status = statuses[i % statuses.length];
    const dept = QUALITY_DEPTS[i % QUALITY_DEPTS.length];
    const doctor = QUALITY_DOCTORS[i % QUALITY_DOCTORS.length];
    const masked = MASKED_NAMES[i % MASKED_NAMES.length];
    const score = rand(62, 99);
    const grade: RecordGrade = score >= 90 ? 'A' : score >= 75 ? 'B' : 'C';
    const admit = new Date(Date.now() - rand(1, 30) * 86_400_000);
    list.push({
      taskId: `QT${(2026000 + i).toString()}`,
      recordNo: `BL${(2026000 + i).toString()}`,
      visitId: `MZ${(100000 + i).toString()}`,
      patientName: masked,
      gender: i % 2 === 0 ? 'male' : 'female',
      age: rand(18, 86),
      dept,
      ward: `${dept}${(i % 4) + 1}病区`,
      doctor,
      doctorTitle: DOCTOR_TITLES[i % DOCTOR_TITLES.length],
      recordType: RECORD_TYPES[i % RECORD_TYPES.length],
      admitDate: admit.toISOString().slice(0, 10),
      dischargeDate:
        status === 'checked' || status === 'to_rectify' || status === 'rectified'
          ? new Date(admit.getTime() + rand(2, 18) * 86_400_000).toISOString().slice(0, 10)
          : undefined,
      status,
      qualityDoctor: status === 'pending' ? undefined : '质控组·周慧',
      qualityTime:
        status === 'pending'
          ? undefined
          : new Date(Date.now() - rand(0, 5) * 3600_000).toISOString(),
      score: status === 'pending' ? undefined : score,
      grade: status === 'pending' ? undefined : grade,
      defectCount: status === 'pending' ? undefined : rand(0, 6),
      priority: i % 9 === 0 ? 'high' : i % 3 === 0 ? 'low' : 'normal',
      deadline: new Date(Date.now() + rand(1, 5) * 86_400_000).toISOString(),
    });
  }
  return list;
}

export const mockQualityTasks: QualityTask[] = buildTasks();

/* ------------------------------ 病历质控示例（含缺陷与评分） ------------------------------ */

function defect(
  id: string,
  type: DefectType,
  level: DefectLevel,
  description: string,
  deduction: number,
  section: string,
  anchor: string,
  suggestion: string,
  aiSuggested = true,
): QualityDefect {
  return {
    defectId: id,
    ruleCode: `RULE-${type.toUpperCase().slice(0, 3)}-${id}`,
    type,
    level,
    description,
    deduction,
    location: { section, anchor, startOffset: 0, endOffset: anchor.length },
    suggestion,
    aiSuggested,
    aiAction: aiSuggested ? 'pending' : 'adopted',
  };
}

export const mockRecordSections: RecordSection[] = [
  {
    id: 's1',
    title: '入院记录',
    editor: '陈建国',
    updatedAt: '2026-09-12 09:30',
    content:
      '患者张*明，男，68岁，因“反复胸闷胸痛3年，加重伴气促1周”入院。既往高血压病史10年，规律服用降压药物。入院查体：T 36.5℃，P 88次/分，R 20次/分，BP 158/96mmHg。双肺呼吸音清，未闻及干湿啰音。心界不大，心率88次/分，律齐，各瓣膜听诊区未闻及病理性杂音。腹软，无压痛。双下肢无水肿。初步诊断：冠状动脉粥样硬化性心脏病，不稳定型心绞痛；高血压病3级（很高危）。',
  },
  {
    id: 's2',
    title: '首次病程记录',
    editor: '陈建国',
    updatedAt: '2026-09-12 11:00',
    content:
      '2026-09-12 11:00 首次病程记录。病例特点：老年男性，慢性病程急性加重。临床表现为活动后胸骨后压榨样疼痛，持续3-5分钟，休息后可缓解。辅助检查：心电图示V1-V4导联ST段压低0.1-0.2mV。拟诊讨论：1.冠心病 不稳定型心绞痛：依据典型胸痛症状及心电图缺血改变，需与急性心肌梗死鉴别。2.高血压病3级：依据入院血压及既往史。诊疗计划：1.心内科护理常规，一级护理；2.完善心肌酶谱、BNP、冠脉CTA检查；3.抗血小板、调脂、降压、扩冠治疗；4.密切监测心电及血压变化。',
  },
  {
    id: 's3',
    title: '日常病程记录',
    editor: '陈建国',
    updatedAt: '2026-09-13 09:00',
    content:
      '2026-09-13 09:00 今日查房，患者诉胸闷较前缓解，仍有活动后气促。查体：BP 148/90mmHg，双肺呼吸音清，心率82次/分，律齐。辅助检查回报：肌钙蛋白I 0.08ng/ml（略高），BNP 320pg/ml。冠脉CTA提示前降支近段狭窄约70%。病情评估：目前考虑不稳定型心绞痛，心功能II级。治疗上继续抗血小板、调脂稳定斑块，择期行冠脉造影评估。嘱患者卧床休息，避免情绪激动。',
  },
  {
    id: 's4',
    title: '上级医师查房记录',
    editor: '王慧敏',
    updatedAt: '2026-09-13 15:00',
    content:
      '2026-09-13 15:00 王慧敏副主任医师查房记录。王慧敏副主任医师听取病史汇报并查阅病历后指出：患者老年男性，胸闷胸痛症状典型，心电图及心肌酶支持心肌缺血诊断，结合冠脉CTA结果，冠心病诊断明确。目前心功能II级，建议：1.完善心脏超声检查评估心功能及室壁运动；2.请导管室会诊，择期行冠脉造影，必要时PCI治疗；3.强化阿托伐他汀调脂，加用硝酸酯类药物扩冠；4.注意监测肝肾功能及心肌酶变化。遵嘱执行。',
  },
  {
    id: 's5',
    title: '疑难病例讨论',
    editor: '王慧敏',
    updatedAt: '2026-09-14 10:00',
    content:
      '2026-09-14 10:00 疑难病例讨论。主持人：王慧敏副主任医师。参加人员：心内科医疗组全体。讨论意见：患者造影提示前降支近段70%狭窄，结合症状及心电图改变，具备PCI指征。需鉴别是否合并微血管病变。讨论决定：择期行PCI治疗，术前充分告知手术风险及支架植入方案，术后规范双联抗血小板治疗12个月。',
  },
  {
    id: 's6',
    title: '交班前小结',
    editor: '陈建国',
    updatedAt: '2026-09-15 17:30',
    content:
      '2026-09-15 17:30 交班前小结。患者入院第4天，明日拟行PCI手术。目前一般情况可，胸闷症状基本缓解。今晚注意事项：1.监测生命体征及心电变化；2.术前禁食8小时；3.做好术前皮肤准备及碘过敏试验；4.如出现胸痛加重、大汗、血压下降等情况立即汇报并处理。',
  },
  {
    id: 's7',
    title: '出院小结',
    editor: '陈建国',
    updatedAt: '2026-09-18 10:00',
    content:
      '患者住院共6天，于2026-09-18行PCI术，前降支植入支架1枚，手术顺利。出院诊断：冠状动脉粥样硬化性心脏病，不稳定型心绞痛，PCI术后；高血压病3级（很高危）。出院情况：患者无明显胸痛胸闷，一般情况可。出院医嘱：1.规律服用阿司匹林、氯吡格雷双联抗血小板12个月；2.继续阿托伐他汀调脂；3.控制血压，心内科门诊随访；4.低盐低脂饮食，避免剧烈运动。',
  },
];

export const mockQualityResults: Record<string, QualityResult> = {
  BL2026000: {
    resultId: 'QR2026000',
    recordNo: 'BL2026000',
    score: 86,
    grade: 'B',
    defects: [
      defect(
        'D01',
        'integrity',
        'minor',
        '首次病程记录中鉴别诊断仅提及急性心肌梗死，未与主动脉夹层、肺栓塞等鉴别',
        3,
        '首次病程记录',
        '需与急性心肌梗死鉴别',
        '补充与主动脉夹层、肺栓塞、肋间神经痛等疾病的鉴别诊断。',
      ),
      defect(
        'D02',
        'timeliness',
        'major',
        '上级医师查房记录距入院超过48小时，不符合三级查房时效性要求',
        5,
        '上级医师查房记录',
        '2026-09-13 15:00',
        '副主任医师应在患者入院48小时内完成首次查房并记录。',
      ),
      defect(
        'D03',
        'standardization',
        'minor',
        '日常病程记录中血压“148/90mmHg”未规范记录收缩压/舒张压单位及测量体位',
        2,
        '日常病程记录',
        'BP 148/90mmHg',
        '规范记录血压测量体位与时间，如“坐位右上肢BP 148/90mmHg”。',
      ),
      defect(
        'D04',
        'logic',
        'minor',
        '出院小结中“住院共6天”与入院/出院日期推算住院日7天不一致',
        2,
        '出院小结',
        '患者住院共6天',
        '核对出入院日期，住院日计算应准确。',
      ),
    ],
    vetoItems: [],
    overallComment:
      '该病历书写基本完整，诊疗思路清晰，三级查房及疑难病例讨论记录规范。存在鉴别诊断不全、查房时效性欠缺等问题，经整改后可达到甲级病历标准。',
    strengths: '病史采集详细，体格检查记录规范，辅助检查回报分析到位，手术指征把握准确。',
    weaknesses: '鉴别诊断欠全面，首次上级查房超时限，部分病程记录书写不够规范。',
    rectifyRequirement: '请主管医生于3个工作日内补充鉴别诊断，规范病程记录书写并提交整改。',
    qualityDoctor: '周慧',
    qualityTime: '2026-09-18 16:20',
    signed: true,
  },
  BL2026001: {
    resultId: 'QR2026001',
    recordNo: 'BL2026001',
    score: 93,
    grade: 'A',
    defects: [
      defect(
        'D11',
        'standardization',
        'minor',
        '入院记录现病史未精确描述胸痛放射部位',
        2,
        '入院记录',
        '胸骨后压榨样疼痛',
        '补充胸痛是否向左肩、左臂、下颌放射。',
      ),
    ],
    vetoItems: [],
    overallComment: '病历书写规范完整，三级查房、疑难讨论、术前讨论齐全，逻辑严密，为甲级病历。',
    strengths: '诊疗计划详实，知情同意及手术记录完整规范。',
    weaknesses: '个别现病史细节可进一步完善。',
    rectifyRequirement: '无需整改，持续保持。',
    qualityDoctor: '周慧',
    qualityTime: '2026-09-17 10:10',
    signed: true,
  },
  BL2026002: {
    resultId: 'QR2026002',
    recordNo: 'BL2026002',
    score: 68,
    grade: 'C',
    defects: [
      defect(
        'D21',
        'integrity',
        'critical',
        '缺少术前讨论记录，违反手术安全核查相关要求（单项否决）',
        0,
        '手术病历',
        '术前讨论',
        '限期完成术前讨论记录，明确手术指征、术式及风险预案。',
      ),
      defect(
        'D22',
        'timeliness',
        'major',
        '术后首次病程记录未在术后即时完成（超过6小时）',
        8,
        '日常病程记录',
        '术后病程',
        '术后即时完成手术记录及首次病程记录。',
      ),
      defect(
        'D23',
        'logic',
        'major',
        '主诉与现病史时间逻辑不一致',
        6,
        '入院记录',
        '反复胸闷胸痛3年',
        '核对主诉与现病史时间线，确保一致。',
      ),
    ],
    vetoItems: ['缺少术前讨论记录，手术安全核查缺失'],
    overallComment:
      '该病历存在单项否决项（术前讨论缺失），评定为丙级病历，须限期整改并约谈主管医生。',
    strengths: '辅助检查记录较完整。',
    weaknesses: '核心制度执行不到位，手术相关记录缺失严重。',
    rectifyRequirement: '立即补记术前讨论及手术记录，科室质控小组重点复查。',
    qualityDoctor: '周慧',
    qualityTime: '2026-09-16 14:45',
    signed: true,
  },
};

/* ------------------------------ 病案首页质控数据（12份） ------------------------------ */

export const mockFrontPageRecords: FrontPageRecord[] = [
  {
    recordNo: 'BL2026000',
    patientName: '张*明',
    gender: 'male',
    age: 68,
    dept: '心内科',
    attendDoctor: '陈建国',
    admitDate: '2026-09-12',
    dischargeDate: '2026-09-18',
    los: 6,
    mainDiagnosis: {
      code: 'I21.400',
      name: '非ST段抬高型心肌梗死',
      admissionCondition: 'new',
      isValid: true,
    },
    otherDiagnoses: [
      {
        code: 'I10.x05',
        name: '高血压3级（很高危）',
        admissionCondition: 'comorbidity',
        isValid: true,
      },
      {
        code: 'I50.900',
        name: '慢性心功能不全',
        admissionCondition: 'complication',
        isValid: true,
      },
    ],
    surgeries: [
      {
        code: '36.06',
        name: '冠状动脉支架植入术（前降支）',
        date: '2026-09-15',
        surgeon: '王慧敏',
        anesthesia: '局部麻醉',
        incisionGrade: 'III',
        healingGrade: '甲',
      },
    ],
    totalCost: 48600.5,
    bedCost: 3600,
    drugCost: 18200,
    examCost: 9800,
    surgeryCost: 14500,
    codingIssues: [
      {
        field: '主要诊断',
        issue:
          '主要诊断编码 I21.400 与名称“非ST段抬高型心肌梗死”匹配，但住院期间行PCI，建议核对主要诊断是否应取操作相关诊断',
        level: 'major',
        suggestion: '结合手术操作，复核主要诊断选择是否符合DRG分组要求',
        aiRecommendedCode: 'I21.401',
        aiRecommendedName: '非ST段抬高型心肌梗死，伴支架植入',
      },
      {
        field: '其他诊断',
        issue: '“慢性心功能不全”未标注NYHA分级',
        level: 'minor',
        suggestion: '补充心功能分级后再编码',
      },
    ],
    logicIssues: [
      { rule: '入院日期≤出院日期', message: '日期逻辑正常', level: 'minor' },
      {
        rule: '手术日期在住院期间',
        message: '手术日期 2026-09-15 落在住院区间内，正常',
        level: 'minor',
      },
    ],
    drg: {
      groupCode: 'FM33',
      groupName: '冠状动脉搭桥/PTCA伴支架植入',
      weight: 1.82,
      rw: 1.82,
      estimatedCost: 45000,
      estimatedLOS: 6.5,
      actualCost: 48600.5,
      actualLOS: 6,
      costDeviation: 8.0,
      timeDeviation: -7.7,
      profitPrediction: 'balance',
      lowRiskDeath: false,
      lowRiskReadmit: false,
    },
    score: 88,
    grade: 'B',
  },
  {
    recordNo: 'BL2026003',
    patientName: '李*华',
    gender: 'female',
    age: 56,
    dept: '呼吸内科',
    attendDoctor: '李晓东',
    admitDate: '2026-09-10',
    dischargeDate: '2026-09-16',
    los: 6,
    mainDiagnosis: {
      code: 'J18.900',
      name: '社区获得性肺炎',
      admissionCondition: 'new',
      isValid: true,
    },
    otherDiagnoses: [
      {
        code: 'J44.900',
        name: '慢性阻塞性肺疾病',
        admissionCondition: 'comorbidity',
        isValid: true,
      },
    ],
    surgeries: [],
    totalCost: 12800,
    bedCost: 2400,
    drugCost: 6800,
    examCost: 3600,
    surgeryCost: 0,
    codingIssues: [
      {
        field: '其他诊断',
        issue: '“慢性阻塞性肺疾病”未标明急性加重',
        level: 'minor',
        suggestion: '如本次为急性加重，建议改为 J44.1',
        aiRecommendedCode: 'J44.1',
        aiRecommendedName: '慢性阻塞性肺疾病急性加重',
      },
    ],
    logicIssues: [
      { rule: '入院日期≤出院日期', message: '日期逻辑正常', level: 'minor' },
      { rule: '年龄与诊断合理性', message: '56岁女性肺炎诊断合理', level: 'minor' },
    ],
    drg: {
      groupCode: 'ES15',
      groupName: '呼吸系统感染伴合并症',
      weight: 0.92,
      rw: 0.92,
      estimatedCost: 13500,
      estimatedLOS: 7,
      actualCost: 12800,
      actualLOS: 6,
      costDeviation: -5.2,
      timeDeviation: -14.3,
      profitPrediction: 'profit',
      lowRiskDeath: false,
      lowRiskReadmit: false,
    },
    score: 92,
    grade: 'A',
  },
  {
    recordNo: 'BL2026007',
    patientName: '王*英',
    gender: 'female',
    age: 63,
    dept: '普外科',
    attendDoctor: '张明远',
    admitDate: '2026-09-08',
    dischargeDate: '2026-09-15',
    los: 7,
    mainDiagnosis: {
      code: 'K35.800',
      name: '急性阑尾炎',
      admissionCondition: 'new',
      isValid: true,
    },
    otherDiagnoses: [],
    surgeries: [
      {
        code: '47.09',
        name: '腹腔镜阑尾切除术',
        date: '2026-09-09',
        surgeon: '张明远',
        anesthesia: '全身麻醉',
        incisionGrade: 'II',
        healingGrade: '甲',
      },
    ],
    totalCost: 16500,
    bedCost: 2800,
    drugCost: 5200,
    examCost: 2600,
    surgeryCost: 5900,
    codingIssues: [
      {
        field: '手术编码',
        issue: '手术名称“腹腔镜阑尾切除术”对应编码 47.09，但缺少腹腔镜操作特殊编码',
        level: 'major',
        suggestion: '补充腹腔镜操作附加编码',
        aiRecommendedCode: '47.01',
        aiRecommendedName: '腹腔镜下阑尾切除术',
      },
    ],
    logicIssues: [
      { rule: '手术日期在住院期间', message: '手术日期正常', level: 'minor' },
      { rule: '性别与诊断合理性', message: '女性急性阑尾炎诊断合理', level: 'minor' },
    ],
    drg: {
      groupCode: 'GB25',
      groupName: '阑尾切除术伴合并症',
      weight: 0.88,
      rw: 0.88,
      estimatedCost: 15800,
      estimatedLOS: 6,
      actualCost: 16500,
      actualLOS: 7,
      costDeviation: 4.4,
      timeDeviation: 16.7,
      profitPrediction: 'balance',
      lowRiskDeath: false,
      lowRiskReadmit: false,
    },
    score: 85,
    grade: 'B',
  },
];

/* ------------------------------ 十八项核心制度 ------------------------------ */

const CORE_SYSTEM_NAMES = [
  '首诊负责制度',
  '三级查房制度',
  '会诊制度',
  '分级护理制度',
  '值班和交接班制度',
  '疑难病例讨论制度',
  '急危重患者抢救制度',
  '术前讨论制度',
  '死亡病例讨论制度',
  '查对制度',
  '手术安全核查制度',
  '手术分级管理制度',
  '新技术和新项目准入制度',
  '危急值报告制度',
  '病历管理制度',
  '抗菌药物分级管理制度',
  '临床用血审核制度',
  '信息安全管理制度',
];

function buildCoreSystems(): CoreSystemItem[] {
  return CORE_SYSTEM_NAMES.map((name, i) => {
    const status: CoreSystemItem['status'] =
      i === 7 ? 'not_executed' : i === 13 || i === 15 ? 'partial' : 'executed';
    return {
      key: `sys_${i + 1}`,
      name,
      status,
      checkPoints: [
        '病历中是否有相应执行记录',
        '记录时间、人员、内容是否完整',
        '是否符合制度时限要求',
      ],
      execRecords:
        status === 'not_executed'
          ? []
          : [
              {
                time: `2026-09-${10 + (i % 8)} ${8 + (i % 10)}:00`,
                personnel: QUALITY_DOCTORS[i % QUALITY_DOCTORS.length],
                content: `${name}执行记录：按制度要求完成相关流程并记录。`,
              },
            ],
      issues:
        status === 'not_executed'
          ? [`未检索到${name}相关执行记录`]
          : status === 'partial'
            ? [`${name}执行不完整，部分记录缺失`]
            : [],
      suggestion:
        status === 'not_executed'
          ? `限期补充${name}执行记录，科室组织专项培训。`
          : status === 'partial'
            ? `完善${name}执行记录，确保全程留痕。`
            : '执行规范，继续保持。',
    };
  });
}

export const mockCoreSystemResult: CoreSystemCheckResult = {
  recordNo: 'BL2026002',
  patientName: '赵*梅',
  dept: '普外科',
  items: buildCoreSystems(),
  execRate: 83.3,
  warningSystems: ['术前讨论制度'],
};

/* ------------------------------ 质控规则（36条） ------------------------------ */

function buildRules(): QualityRule[] {
  const rules: QualityRule[] = [];
  const catalog: {
    name: string;
    cat: QualityRule['category'];
    level: DefectLevel;
    deduction: number;
    desc: string;
  }[] = [
    {
      name: '入院记录24小时内完成',
      cat: 'timeliness',
      level: 'major',
      deduction: 5,
      desc: '患者入院24小时内未完成入院记录',
    },
    {
      name: '首次病程8小时内完成',
      cat: 'timeliness',
      level: 'major',
      deduction: 5,
      desc: '入院8小时内未完成首次病程记录',
    },
    {
      name: '三级查房时限',
      cat: 'timeliness',
      level: 'major',
      deduction: 5,
      desc: '副主任医师48小时内未完成首次查房',
    },
    {
      name: '出院记录24小时内完成',
      cat: 'timeliness',
      level: 'minor',
      deduction: 2,
      desc: '出院后24小时内未完成出院记录',
    },
    {
      name: '现病史完整性',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '现病史缺少起病情况、主要症状特点或演变',
    },
    {
      name: '既往史完整性',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '既往史缺失重要疾病史或手术外伤史',
    },
    {
      name: '体格检查完整性',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '体格检查记录不完整，缺主要系统体征',
    },
    {
      name: '鉴别诊断完整性',
      cat: 'integrity',
      level: 'minor',
      deduction: 3,
      desc: '首次病程鉴别诊断少于2个疾病',
    },
    {
      name: '诊疗计划完整性',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '诊疗计划不具体，缺乏针对性检查治疗安排',
    },
    {
      name: '出院小结完整性',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '出院小结缺出院诊断或出院医嘱',
    },
    {
      name: '主诉规范',
      cat: 'standardization',
      level: 'minor',
      deduction: 1,
      desc: '主诉超过20字或不简明扼要',
    },
    {
      name: '医学术语规范',
      cat: 'standardization',
      level: 'minor',
      deduction: 1,
      desc: '使用非规范医学术语或口语化表述',
    },
    {
      name: '签名规范',
      cat: 'standardization',
      level: 'major',
      deduction: 5,
      desc: '病历记录未签名或签名无法辨认',
    },
    {
      name: '计量单位规范',
      cat: 'standardization',
      level: 'minor',
      deduction: 1,
      desc: '血压、体温等计量单位不规范',
    },
    {
      name: '涂改规范',
      cat: 'standardization',
      level: 'major',
      deduction: 5,
      desc: '病历存在刮、粘、涂等不规范涂改',
    },
    {
      name: '主诉现病史一致',
      cat: 'logic',
      level: 'minor',
      deduction: 2,
      desc: '主诉与现病史时间逻辑不一致',
    },
    {
      name: '诊断与检查一致',
      cat: 'logic',
      level: 'major',
      deduction: 4,
      desc: '诊断与辅助检查结果不相符',
    },
    {
      name: '用药与诊断一致',
      cat: 'logic',
      level: 'major',
      deduction: 4,
      desc: '用药与主要诊断无关联',
    },
    {
      name: '性别诊断合理',
      cat: 'logic',
      level: 'major',
      deduction: 5,
      desc: '诊断与患者性别明显不符',
    },
    {
      name: '年龄诊断合理',
      cat: 'logic',
      level: 'minor',
      deduction: 2,
      desc: '诊断与患者年龄明显不符',
    },
    {
      name: '危重抢救记录',
      cat: 'integrity',
      level: 'critical',
      deduction: 10,
      desc: '危重患者抢救无抢救记录',
    },
    {
      name: '术前讨论必备',
      cat: 'veto',
      level: 'critical',
      deduction: 0,
      desc: '手术病例缺术前讨论记录（单项否决）',
    },
    {
      name: '手术安全核查',
      cat: 'veto',
      level: 'critical',
      deduction: 0,
      desc: '缺手术安全核查表（单项否决）',
    },
    {
      name: '死亡病例讨论',
      cat: 'veto',
      level: 'critical',
      deduction: 0,
      desc: '死亡病例未在1周内完成讨论（单项否决）',
    },
    {
      name: '知情同意书',
      cat: 'veto',
      level: 'critical',
      deduction: 0,
      desc: '手术/特殊治疗缺知情同意书（单项否决）',
    },
    {
      name: '交接班记录',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '值班交接班无书面记录',
    },
    {
      name: '会诊记录',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '急会诊未在规定时限内完成记录',
    },
    {
      name: '疑难病例讨论',
      cat: 'integrity',
      level: 'minor',
      deduction: 3,
      desc: '疑难病例无讨论记录',
    },
    {
      name: '危急值闭环',
      cat: 'logic',
      level: 'major',
      deduction: 5,
      desc: '危急值报告后无处置及记录闭环',
    },
    {
      name: '抗菌药物分级',
      cat: 'standardization',
      level: 'major',
      deduction: 4,
      desc: '特殊使用级抗菌药物无会诊记录',
    },
    {
      name: '用血审核',
      cat: 'integrity',
      level: 'major',
      deduction: 5,
      desc: '输血治疗无输血前评估及用血审核记录',
    },
    {
      name: '护理级别对应',
      cat: 'logic',
      level: 'minor',
      deduction: 2,
      desc: '护理级别与病情严重程度不匹配',
    },
    {
      name: '影像检查阳性追踪',
      cat: 'integrity',
      level: 'minor',
      deduction: 2,
      desc: '阳性检查结果无追踪处理记录',
    },
    {
      name: '医嘱时间逻辑',
      cat: 'timeliness',
      level: 'minor',
      deduction: 2,
      desc: '停止医嘱时间早于开立时间',
    },
    {
      name: '入院记录职业',
      cat: 'standardization',
      level: 'minor',
      deduction: 1,
      desc: '入院记录职业项空缺',
    },
    {
      name: '二十四小时入出院',
      cat: 'timeliness',
      level: 'minor',
      deduction: 2,
      desc: '24小时内入出院未完成专项记录',
    },
  ];
  catalog.forEach((r, i) => {
    rules.push({
      ruleId: `RULE-${1000 + i}`,
      code: `R${String(1000 + i)}`,
      name: r.name,
      description: r.desc,
      category: r.cat,
      level: r.level,
      deduction: r.deduction,
      conditions: [
        { field: 'record_type', operator: 'contains', value: '住院', logic: 'and' },
        { field: 'duration_hours', operator: '>', value: '24', logic: 'and' },
      ],
      suggestion: `请主管医生对照《病历书写基本规范》补充完善${r.name}相关内容。`,
      applicableRecordTypes: ['运行病历', '出院病历', '死亡病历', '手术病历'],
      applicableDepts: [],
      applicableDoctorTitles: ['住院医师', '主治医师'],
      status: i % 7 === 6 ? 'disabled' : 'enabled',
      version: `v1.${i % 3}.0`,
      updatedAt: `2026-0${(i % 8) + 1}-1${i % 9}`,
      updatedBy: '周慧',
      template: i % 5 === 0 ? 'specialty' : 'general',
      hitCount: rand(3, 120),
    });
  });
  return rules;
}

export const mockQualityRules: QualityRule[] = buildRules();

/* ------------------------------ 整改任务（24条） ------------------------------ */

function buildRectifyTasks(): RectificationTask[] {
  const list: RectificationTask[] = [];
  const statuses: RectificationTask['status'][] = [
    'pending',
    'pending',
    'in_progress',
    'rectified',
    'reviewed',
    'pending',
    'rectified',
  ];
  const defects = [
    '现病史不完整，缺主要症状特点描述',
    '首次上级查房超48小时未完成',
    '鉴别诊断少于2个疾病',
    '缺术前讨论记录',
    '出院小结缺出院医嘱',
    '病程记录未签名',
    '危急值处置无闭环记录',
  ];
  for (let i = 0; i < 24; i++) {
    const status = statuses[i % statuses.length];
    const overdue = i % 8 === 0;
    list.push({
      taskId: `RZ${(3000 + i).toString()}`,
      recordNo: `BL${(2026000 + i).toString()}`,
      patientName: MASKED_NAMES[i % MASKED_NAMES.length],
      dept: QUALITY_DEPTS[i % QUALITY_DEPTS.length],
      doctor: QUALITY_DOCTORS[i % QUALITY_DOCTORS.length],
      defectDesc: defects[i % defects.length],
      defectType: (['integrity', 'timeliness', 'logic', 'standardization'] as DefectType[])[i % 4],
      deduction: [2, 3, 5, 8][i % 4],
      qualityDoctor: '周慧',
      deadline: overdue
        ? new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)
        : new Date(Date.now() + rand(1, 4) * 86_400_000).toISOString().slice(0, 10),
      status,
      rectifyContent:
        status === 'rectified' || status === 'reviewed'
          ? '已补充完善相关病历记录，详见修订后病历。'
          : undefined,
      rectifyNote:
        status === 'rectified' || status === 'reviewed' ? '已按质控意见完成整改。' : undefined,
      rectifyTime:
        status === 'rectified' || status === 'reviewed'
          ? new Date(Date.now() - rand(0, 2) * 86_400_000).toISOString()
          : undefined,
      reviewResult: status === 'reviewed' ? 'approved' : undefined,
      reviewNote: status === 'reviewed' ? '整改到位，予以通过。' : undefined,
      rectifyScore: status === 'reviewed' ? 92 : undefined,
    });
  }
  return list;
}

export const mockRectificationTasks: RectificationTask[] = buildRectifyTasks();

/* ------------------------------ 质控统计 ------------------------------ */

export const mockQualityStats: QualityStats = {
  pendingToday: 18,
  pendingWeek: 56,
  pendingMonth: 132,
  checkedCount: 486,
  passRate: 86.4,
  avgDefects: 2.3,
  pendingRectify: 24,
  rectifiedCount: 218,
  todayChecked: 32,
  todayTarget: 40,
  deptRanking: [
    {
      name: '心内科',
      total: 86,
      passRate: 91.2,
      avgScore: 91.5,
      avgDefects: 1.6,
      rectifyRate: 95.8,
    },
    {
      name: '呼吸内科',
      total: 72,
      passRate: 89.7,
      avgScore: 90.2,
      avgDefects: 1.9,
      rectifyRate: 93.1,
    },
    {
      name: '消化内科',
      total: 64,
      passRate: 87.5,
      avgScore: 88.6,
      avgDefects: 2.1,
      rectifyRate: 90.4,
    },
    {
      name: '普外科',
      total: 78,
      passRate: 84.6,
      avgScore: 86.3,
      avgDefects: 2.6,
      rectifyRate: 86.7,
    },
    { name: '骨科', total: 58, passRate: 82.8, avgScore: 85.1, avgDefects: 2.8, rectifyRate: 82.3 },
    {
      name: '神经外科',
      total: 46,
      passRate: 78.3,
      avgScore: 82.4,
      avgDefects: 3.4,
      rectifyRate: 76.5,
    },
    {
      name: '急诊科',
      total: 82,
      passRate: 74.4,
      avgScore: 80.2,
      avgDefects: 3.9,
      rectifyRate: 71.2,
    },
  ],
  doctorRanking: [
    {
      name: '王慧敏',
      total: 68,
      passRate: 94.1,
      avgScore: 92.8,
      avgDefects: 1.3,
      rectifyRate: 97.0,
    },
    {
      name: '陈建国',
      total: 72,
      passRate: 90.3,
      avgScore: 90.5,
      avgDefects: 1.7,
      rectifyRate: 94.2,
    },
    {
      name: '李晓东',
      total: 65,
      passRate: 88.6,
      avgScore: 89.1,
      avgDefects: 2.0,
      rectifyRate: 91.5,
    },
    {
      name: '张明远',
      total: 60,
      passRate: 85.0,
      avgScore: 86.7,
      avgDefects: 2.4,
      rectifyRate: 88.0,
    },
    {
      name: '刘海燕',
      total: 55,
      passRate: 81.8,
      avgScore: 84.2,
      avgDefects: 2.9,
      rectifyRate: 80.6,
    },
  ],
  recordTypeDist: [
    { name: '运行病历', value: 186 },
    { name: '出院病历', value: 168 },
    { name: '手术病历', value: 92 },
    { name: '死亡病历', value: 18 },
    { name: '急诊病历', value: 32 },
  ],
  monthlyTrend: [
    { month: '4月', checked: 320, passRate: 82.1 },
    { month: '5月', checked: 358, passRate: 83.6 },
    { month: '6月', checked: 386, passRate: 84.9 },
    { month: '7月', checked: 412, passRate: 85.2 },
    { month: '8月', checked: 448, passRate: 86.0 },
    { month: '9月', checked: 486, passRate: 86.4 },
  ],
  defectTypeDist: [
    { name: '完整性缺陷', value: 426 },
    { name: '规范性缺陷', value: 358 },
    { name: '时效性缺陷', value: 212 },
    { name: '逻辑性缺陷', value: 148 },
  ],
  defectLevelDist: [
    { name: '一般缺陷', value: 782 },
    { name: '重要缺陷', value: 312 },
    { name: '严重缺陷', value: 50 },
  ],
  topDefects: [
    { name: '鉴别诊断不完整', count: 186 },
    { name: '现病史描述不全', count: 154 },
    { name: '三级查房超时限', count: 128 },
    { name: '病程记录未签名', count: 96 },
    { name: '出院记录不规范', count: 84 },
    { name: '既往史缺失', count: 72 },
    { name: '危急值无闭环', count: 58 },
    { name: '诊疗计划笼统', count: 51 },
    { name: '主诉不规范', count: 43 },
    { name: '用药与诊断不符', count: 32 },
  ],
  deptDefectHeatmap: QUALITY_DEPTS.slice(0, 6).flatMap((dept) =>
    (['完整性缺陷', '规范性缺陷', '时效性缺陷', '逻辑性缺陷'] as const).map((type) => ({
      dept,
      type,
      count: rand(8, 68),
    })),
  ),
  rectifyTrend: [
    { month: '4月', rate: 76.2 },
    { month: '5月', rate: 80.5 },
    { month: '6月', rate: 83.8 },
    { month: '7月', rate: 86.1 },
    { month: '8月', rate: 88.4 },
    { month: '9月', rate: 90.2 },
  ],
  overdueCount: 7,
  drgAdmissionRate: 93.6,
  lowRiskDeathRate: 0.12,
};

/* ------------------------------ 当前质控病历（详情） ------------------------------ */

export const mockCurrentRecord = (recordNo: string) => {
  const task = mockQualityTasks.find((t) => t.recordNo === recordNo) ?? mockQualityTasks[0];
  const result = mockQualityResults[recordNo] ?? null;
  const aiDefects: QualityDefect[] =
    recordNo === 'BL2026000'
      ? [
          defect(
            'AI01',
            'integrity',
            'minor',
            'AI提示：既往史中吸烟饮酒史未记录',
            1,
            '入院记录',
            '既往高血压病史10年',
            '建议补充吸烟史、饮酒史及家族史。',
          ),
          defect(
            'AI02',
            'standardization',
            'minor',
            'AI提示：辅助检查引用未注明检查日期',
            1,
            '日常病程记录',
            '肌钙蛋白I 0.08ng/ml',
            '建议补充检查日期，如“2026-09-13肌钙蛋白I…”。',
          ),
        ]
      : [];
  return {
    task,
    sections: mockRecordSections,
    result,
    aiDefects,
  };
};
