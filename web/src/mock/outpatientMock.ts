/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊问诊场景 - Mock 数据
 * 演示环境为虚拟患者，所有姓名/证件/电话均已脱敏。
 * 药品剂量、检验项目价格与临床参考范围符合基层医院门诊常规。
 */
import type {
  AIChatMessage,
  AuxExamResult,
  ConsultationRecord,
  DiagnosisItem,
  DoctorSession,
  DrugInfo,
  ImagingItem,
  IcdDiagnosis,
  LabPanel,
  LabTestItem,
  MedicalRecordTemplate,
  OutpatientStats,
  PatientBrief,
  Prescription,
  PrescriptionTemplate,
  TreatmentItem,
  VisitType,
  WaitingPatient,
} from '@/types/outpatient';

/* -------------------------------------------------------------------------- */
/*                                 医生/科室                                  */
/* -------------------------------------------------------------------------- */

export const mockDoctorSession: DoctorSession = {
  doctorId: 'D10086',
  doctorName: '陈维',
  title: '主任医师',
  deptName: '心血管内科',
  room: '门诊 3 楼 305 诊室',
  todayQuota: 40,
  calledQuota: 12,
};

/* -------------------------------------------------------------------------- */
/*                              候诊队列（脱敏）                               */
/* -------------------------------------------------------------------------- */

const surnamePool = [
  '张',
  '王',
  '李',
  '赵',
  '陈',
  '刘',
  '杨',
  '黄',
  '周',
  '吴',
  '徐',
  '孙',
  '胡',
  '朱',
  '高',
  '林',
  '何',
  '郭',
  '马',
  '罗',
];

function maskName(idx: number): string {
  const s = surnamePool[idx % surnamePool.length];
  return `${s}*`;
}

function makePatient(
  idx: number,
  gender: 'male' | 'female',
  age: number,
  insurance: PatientBrief['insurance'],
  allergies: string[],
  chronic: string[],
): PatientBrief {
  return {
    patientId: `P${String(100000 + idx).slice(-6)}`,
    nameMasked: maskName(idx),
    gender,
    age,
    idCardMasked: `3301**********${String(1000 + idx).slice(-4)}`,
    phoneMasked: `138****${String(1000 + idx).slice(-4)}`,
    insurance,
    allergies,
    chronicConditions: chronic,
    currentMedications:
      chronic.length > 0 ? ['阿司匹林肠溶片 100mg qd', '阿托伐他汀钙片 20mg qn'] : [],
    recentLabs:
      age > 50
        ? [
            {
              itemName: '甘油三酯',
              value: '2.86',
              unit: 'mmol/L',
              refRange: '<1.7',
              abnormal: 'high',
              reportDate: '2026-09-10',
            },
            {
              itemName: '空腹血糖',
              value: '6.3',
              unit: 'mmol/L',
              refRange: '3.9-6.1',
              abnormal: 'high',
              reportDate: '2026-09-10',
            },
          ]
        : undefined,
    lastVisit: '2026-08-22',
    vitalSigns: {
      temperature: 36.6,
      pulse: 78,
      respiration: 18,
      systolic: 128,
      diastolic: 82,
      spo2: 98,
    },
  };
}

/** 候诊队列：12 待诊 / 6 已诊 / 3 过号 / 1 停诊 */
export const mockWaitingQueue: WaitingPatient[] = [
  // 当前就诊中
  {
    encounterId: 'ENC-20260916-0013',
    queueNo: 13,
    ticketNo: 'GH202609160013',
    patient: makePatient(
      0,
      'male',
      58,
      'urban_employee',
      ['青霉素'],
      ['高血压病 2 级', '2 型糖尿病'],
    ),
    visitType: 'expert',
    registerTime: '08:12',
    appointmentTime: '08:30',
    status: 'in_consult',
    doctorName: '陈维',
    deptName: '心血管内科',
    chiefComplaint: '反复胸闷、心悸 1 周，加重 1 天',
    waitMinutes: 0,
  },
  // 待诊
  ...Array.from({ length: 12 }, (_, i) => {
    const idx = i + 1;
    const g: 'male' | 'female' = i % 2 === 0 ? 'male' : 'female';
    const age = 28 + ((i * 7) % 55);
    const insurances: PatientBrief['insurance'][] = [
      'urban_employee',
      'urban_resident',
      'self',
      'new_rural',
    ];
    const chiefComplaints = [
      '头晕伴头痛 3 天',
      '活动后气促 2 周',
      '体检发现血压升高',
      '反复胸痛 1 月',
      '夜间不能平卧 3 天',
      '心悸伴出汗',
      '下肢水肿 1 周',
      '血糖控制不佳复诊',
      '心电图异常咨询',
      '既往支架术后随访',
      '感冒后胸闷不适',
      '睡眠差伴心慌',
    ];
    return {
      encounterId: `ENC-20260916-${String(14 + i).padStart(4, '0')}`,
      queueNo: 14 + i,
      ticketNo: `GH20260916${String(14 + i).padStart(4, '0')}`,
      patient: makePatient(
        idx,
        g,
        age,
        insurances[i % insurances.length],
        i % 3 === 0 ? ['磺胺类'] : [],
        i % 4 === 0 ? ['高血压病'] : [],
      ),
      visitType: (i % 5 === 4 ? 'expert' : i % 7 === 3 ? 'emergency' : 'normal') as VisitType,
      registerTime: `08:${String(15 + i * 2).padStart(2, '0')}`,
      appointmentTime: `09:${String(0 + i * 5).padStart(2, '0')}`,
      status: 'waiting' as const,
      doctorName: '陈维',
      deptName: '心血管内科',
      chiefComplaint: chiefComplaints[i % chiefComplaints.length],
      waitMinutes: 8 + i * 3,
    };
  }),
  // 已诊
  ...Array.from({ length: 6 }, (_, i) => {
    const idx = i + 20;
    const g: 'male' | 'female' = i % 2 === 0 ? 'female' : 'male';
    return {
      encounterId: `ENC-20260916-${String(2 + i).padStart(4, '0')}`,
      queueNo: 2 + i,
      ticketNo: `GH20260916${String(2 + i).padStart(4, '0')}`,
      patient: makePatient(idx, g, 35 + ((i * 11) % 40), 'urban_resident', [], []),
      visitType: 'normal' as const,
      registerTime: `07:${String(40 + i).padStart(2, '0')}`,
      status: 'visited' as const,
      doctorName: '陈维',
      deptName: '心血管内科',
      chiefComplaint: '高血压随访',
      waitMinutes: 0,
    };
  }),
  // 过号
  ...Array.from({ length: 3 }, (_, i) => ({
    encounterId: `ENC-20260916-00${20 + i}`,
    queueNo: 20 + i,
    ticketNo: `GH2026091600${20 + i}`,
    patient: makePatient(
      30 + i,
      i % 2 === 0 ? 'female' : 'male',
      40 + i * 5,
      'self' as const,
      [],
      [],
    ),
    visitType: 'normal' as const,
    registerTime: '08:05',
    status: 'passed' as const,
    doctorName: '陈维',
    deptName: '心血管内科',
    chiefComplaint: '复诊取药',
    waitMinutes: 35,
  })),
  // 停诊
  {
    encounterId: 'ENC-20260916-0099',
    queueNo: 99,
    ticketNo: 'GH202609160099',
    patient: makePatient(40, 'female', 45, 'urban_employee', [], []),
    visitType: 'normal' as const,
    registerTime: '08:20',
    status: 'stopped',
    doctorName: '陈维',
    deptName: '心血管内科',
    chiefComplaint: '患者取消预约',
    waitMinutes: 0,
  },
];

/* -------------------------------------------------------------------------- */
/*                           当前就诊患者问诊记录                               */
/* -------------------------------------------------------------------------- */

export const mockCurrentPatient: PatientBrief = mockWaitingQueue[0].patient;

export const mockConsultation: ConsultationRecord = {
  encounterId: 'ENC-20260916-0013',
  chiefComplaint: '反复胸闷、心悸 1 周，加重 1 天',
  presentIllness: {
    onsetTime: '1 周前',
    trigger: '活动及情绪激动后出现',
    mainSymptom: '胸骨后压榨样胸闷，伴心悸',
    accompanying: '伴出汗、乏力，无放射痛',
    treatmentProcess: '未自行服药，今日症状加重来院',
    generalCondition: '精神欠佳，饮食睡眠可，二便正常',
    freeText: '',
  },
  pastHistory: {
    diseases: '高血压病 2 级 8 年，2 型糖尿病 5 年',
    surgery: '2021 年行冠状动脉支架植入术（LAD）',
    trauma: '否认',
    transfusion: '否认',
    allergy: '青霉素过敏',
    vaccination: '按计划预防接种',
  },
  personalFamilyHistory: '吸烟 30 年，每日 20 支；偶饮白酒。父亲患冠心病。',
  physicalExam: {
    vital: {
      temperature: 36.6,
      pulse: 88,
      respiration: 18,
      systolic: 148,
      diastolic: 92,
      weight: 72,
      height: 172,
      spo2: 97,
    },
    general: '神志清，精神偏软，慢性病容',
    skinLymph: '皮肤黏膜无黄染，浅表淋巴结未及肿大',
    headNeck: '颈静脉无怒张，甲状腺未及肿大',
    chest: '双肺呼吸音清，未闻及干湿啰音；心界不大，心率 88 次/分，律齐，A2>P2',
    abdomen: '腹平软，无压痛反跳痛，肝脾肋下未及',
    extremities: '双下肢无水肿，关节无红肿',
    neuro: '生理反射存在，病理征未引出',
  },
  auxiliaryExams: [
    {
      id: 'AX001',
      name: '心电图',
      date: '2026-09-16 08:20',
      conclusion: '窦性心律，V4-V6 ST 段压低 0.1mV，T 波低平',
    },
    {
      id: 'AX002',
      name: '心肌酶谱（门诊急查）',
      date: '2026-09-16 08:35',
      conclusion: '肌钙蛋白 I 0.04 ng/mL（轻度升高），CK-MB 正常',
    },
  ],
  updatedAt: '2026-09-16 08:55',
};

/* -------------------------------------------------------------------------- */
/*                              药品目录（脱敏厂家）                            */
/* -------------------------------------------------------------------------- */

function d(
  drugId: string,
  genericName: string,
  pinyin: string,
  spec: string,
  dosageForm: string,
  manufacturer: string,
  unit: string,
  price: number,
  stock: number,
  antibiotics = false,
  highRisk = false,
): DrugInfo {
  return {
    drugId,
    genericName,
    pinyin,
    spec,
    dosageForm,
    manufacturer,
    unit,
    price,
    stock,
    antibiotics,
    highRisk,
  };
}

export const mockDrugCatalog: DrugInfo[] = [
  d('D001', '阿司匹林肠溶片', 'asplcp', '100mg*30片', '片剂', '某制药一厂', '盒', 18.5, 320),
  d('D002', '硫酸氢氯吡格雷片', 'lbgbt', '75mg*7片', '片剂', '某制药二厂', '盒', 86.0, 150),
  d('D003', '阿托伐他汀钙片', 'atfgtt', '20mg*7片', '片剂', '某制药三厂', '盒', 42.0, 210),
  d(
    'D004',
    '琥珀酸美托洛尔缓释片',
    'hmtsler',
    '47.5mg*7片',
    '缓释片',
    '某制药一厂',
    '盒',
    35.6,
    180,
  ),
  d('D005', '苯磺酸氨氯地平片', 'bhsaldp', '5mg*14片', '片剂', '某制药四厂', '盒', 22.8, 260),
  d('D006', '缬沙坦胶囊', 'xstjn', '80mg*7粒', '胶囊', '某制药二厂', '盒', 28.4, 190),
  d(
    'D007',
    '单硝酸异山梨酯缓释片',
    'dxssyszp',
    '40mg*14片',
    '缓释片',
    '某制药五厂',
    '盒',
    32.0,
    140,
  ),
  d(
    'D008',
    '硝酸甘油片',
    'xsgnyp',
    '0.5mg*100片',
    '片剂',
    '某制药一厂',
    '瓶',
    25.0,
    60,
    false,
    true,
  ),
  d('D009', '盐酸二甲双胍缓释片', 'ejshghsp', '0.5g*30片', '缓释片', '某制药三厂', '盒', 19.8, 300),
  d('D010', '格列美脲片', 'glmn', '2mg*30片', '片剂', '某制药二厂', '盒', 26.5, 170),
  d(
    'D011',
    '门冬胰岛素注射液',
    'mdydszsy',
    '300IU*3ml',
    '注射剂',
    '某生物制药',
    '支',
    68.0,
    80,
    false,
    true,
  ),
  d('D012', '瑞舒伐他汀钙片', 'rsfgt', '10mg*7片', '片剂', '某制药四厂', '盒', 48.0, 130),
  d('D013', '呋塞米片', 'fsm', '20mg*100片', '片剂', '某制药一厂', '瓶', 12.0, 90),
  d('D014', '螺内酯片', 'lnz', '20mg*100片', '片剂', '某制药二厂', '瓶', 15.0, 80),
  d('D015', '华法林钠片', 'hflnp', '2.5mg*60片', '片剂', '某制药三厂', '盒', 28.0, 40, false, true),
  d(
    'D016',
    '达比加群酯胶囊',
    'dbjzj',
    '110mg*30粒',
    '胶囊',
    '某制药五厂',
    '盒',
    198.0,
    50,
    false,
    true,
  ),
  d('D017', '注射用头孢呋辛钠', 'ztbfxn', '1.5g/支', '注射剂', '某制药一厂', '支', 16.0, 200, true),
  d('D018', '阿莫西林胶囊', 'amxjn', '0.25g*24粒', '胶囊', '某制药二厂', '盒', 12.5, 240, true),
  d('D019', '注射用青霉素钠', 'zsqmsn', '80万U/支', '注射剂', '某制药三厂', '支', 2.8, 300, true),
  d('D020', '布洛芬缓释胶囊', 'blfhxjn', '0.3g*20粒', '缓释胶囊', '某制药四厂', '盒', 18.0, 220),
  d('D021', '对乙酰氨基酚片', 'dyxjanp', '0.5g*20片', '片剂', '某制药一厂', '盒', 8.5, 260),
  d('D022', '奥美拉唑肠溶胶囊', 'amzcrjn', '20mg*14粒', '胶囊', '某制药二厂', '盒', 22.0, 180),
  d('D023', '多潘立酮片', 'dpitp', '10mg*30片', '片剂', '某制药三厂', '盒', 14.0, 150),
  d('D024', '铝碳酸镁咀嚼片', 'ltsmj', '0.5g*20片', '咀嚼片', '某制药四厂', '盒', 19.0, 120),
  d('D025', '盐酸氨溴索口服液', 'axsokf', '100ml:0.6g', '口服液', '某制药一厂', '瓶', 21.0, 100),
  d(
    'D026',
    '布地奈德福莫特罗粉吸入剂',
    'bdnfmtl',
    '160/4.5μg*60吸',
    '吸入剂',
    '某生物制药',
    '支',
    185.0,
    40,
    false,
    true,
  ),
  d('D027', '沙丁胺醇气雾剂', 'sdncqpj', '100μg*200揿', '气雾剂', '某制药二厂', '支', 32.0, 60),
  d('D028', '氯雷他定片', 'lldtp', '10mg*6片', '片剂', '某制药三厂', '盒', 15.0, 160),
  d('D029', '盐酸西替利嗪片', 'xtlqp', '10mg*10片', '片剂', '某制药四厂', '盒', 12.0, 140),
  d('D030', '孟鲁司特钠片', 'mlstnp', '10mg*5片', '片剂', '某制药五厂', '盒', 38.0, 90),
  d('D031', '苯磺酸左氨氯地平片', 'bhsza', '2.5mg*14片', '片剂', '某制药一厂', '盒', 26.0, 150),
  d(
    'D032',
    '厄贝沙坦氢氯噻嗪片',
    'ebstqls',
    '150/12.5mg*7片',
    '片剂',
    '某制药二厂',
    '盒',
    32.0,
    110,
  ),
  d('D033', '培哚普利叔丁胺片', 'pddls', '4mg*30片', '片剂', '某制药三厂', '盒', 45.0, 70),
  d('D034', '阿司匹林维生素C泡腾片', 'asplvc', '10片', '泡腾片', '某制药四厂', '盒', 24.0, 80),
  d('D035', '银杏叶片', 'yxyp', '19.2mg*24片', '片剂', '某中药一厂', '盒', 28.0, 200),
  d('D036', '丹参滴丸', 'dsgw', '27mg*180丸', '滴丸', '某中药二厂', '瓶', 35.0, 150),
  d('D037', '稳心颗粒', 'wxkl', '9g*9袋', '颗粒剂', '某中药一厂', '盒', 32.0, 130),
  d('D038', '通心络胶囊', 'txln', '0.26g*30粒', '胶囊', '某中药三厂', '盒', 42.0, 90),
  d('D039', '麝香保心丸', 'sxbxw', '22.5mg*42丸', '丸剂', '某中药二厂', '盒', 38.0, 100),
  d('D040', '脑心通胶囊', 'nxtn', '0.4g*36粒', '胶囊', '某中药一厂', '盒', 36.0, 110),
  d('D041', '六味地黄丸', 'lwdh', '360粒', '浓缩丸', '某中药三厂', '瓶', 22.0, 180),
  d('D042', '硝苯地平控释片', 'xbdpksp', '30mg*7片', '控释片', '某制药一厂', '盒', 28.0, 140),
  d('D043', '特拉唑嗪片', 'tlqp', '2mg*14片', '片剂', '某制药二厂', '盒', 18.0, 80),
  d('D044', '非那雄胺片', 'fnxap', '5mg*30片', '片剂', '某制药三厂', '盒', 42.0, 60),
  d('D045', '坦索罗辛缓释胶囊', 'tslshx', '0.2mg*10粒', '缓释胶囊', '某制药四厂', '盒', 48.0, 50),
  d(
    'D046',
    '甘精胰岛素注射液',
    'gjyds',
    '300IU*3ml',
    '注射剂',
    '某生物制药',
    '支',
    168.0,
    30,
    false,
    true,
  ),
  d('D047', '达格列净片', 'dgljp', '10mg*14片', '片剂', '某制药一厂', '盒', 88.0, 60),
  d('D048', '恩格列净片', 'egljp', '10mg*10片', '片剂', '某制药二厂', '盒', 92.0, 50),
  d('D049', '利格列汀片', 'lgljp', '5mg*14片', '片剂', '某制药三厂', '盒', 78.0, 40),
  d('D050', '阿卡波糖片', 'akbtp', '50mg*30片', '片剂', '某制药四厂', '盒', 35.0, 120),
  d('D051', '甲钴胺片', 'jgap', '0.5mg*20片', '片剂', '某制药一厂', '盒', 22.0, 90),
  d('D052', '依帕司他片', 'ypstp', '50mg*10片', '片剂', '某制药二厂', '盒', 42.0, 40),
  d(
    'D053',
    '氯吡格雷阿司匹林片',
    'lbgaspl',
    '75/100mg*30片',
    '片剂',
    '某制药三厂',
    '盒',
    158.0,
    30,
  ),
  d(
    'D054',
    '注射用硝普钠',
    'zxpnn',
    '50mg/支',
    '注射剂',
    '某制药一厂',
    '支',
    45.0,
    20,
    false,
    true,
  ),
  d('D055', '呋塞米注射液', 'fsmzsy', '20mg*2ml', '注射剂', '某制药二厂', '支', 8.0, 60),
  d('D056', '红花黄色素氯化钠注射液', 'hhhsl', '100ml', '注射剂', '某中药一厂', '瓶', 68.0, 40),
  d('D057', '舒肝解郁胶囊', 'sgjyn', '0.36g*36粒', '胶囊', '某中药二厂', '盒', 58.0, 30),
  d('D058', '艾司唑仑片', 'aszlp', '1mg*20片', '片剂', '某制药一厂', '盒', 12.0, 70, false, true),
  d('D059', '右佐匹克隆片', 'yzpkl', '3mg*7片', '片剂', '某制药二厂', '盒', 45.0, 30, false, true),
  d('D060', '草酸艾司西酞普兰片', 'asxtpl', '10mg*14片', '片剂', '某制药三厂', '盒', 88.0, 25),
];

/* -------------------------------------------------------------------------- */
/*                              检验项目目录                                    */
/* -------------------------------------------------------------------------- */

function lab(
  itemId: string,
  name: string,
  code: string,
  pinyin: string,
  specimen: string,
  price: number,
  turnaroundHours: number,
  fasting: boolean,
  note?: string,
  clinicalSignificance?: string,
): LabTestItem {
  return {
    itemId,
    name,
    code,
    pinyin,
    specimen,
    price,
    turnaroundHours,
    fasting,
    note,
    clinicalSignificance,
  };
}

export const mockLabCatalog: LabTestItem[] = [
  lab(
    'L001',
    '血常规（五分类）',
    'LAB-CBC',
    'xcg',
    'EDTA抗凝血',
    25,
    2,
    false,
    '无需空腹',
    '评估感染、贫血、血小板',
  ),
  lab(
    'L002',
    '尿常规',
    'LAB-URINE',
    'ng',
    '随机尿',
    12,
    1,
    false,
    '清洁中段尿',
    '泌尿系感染、肾功筛查',
  ),
  lab('L003', '粪便常规+隐血', 'LAB-FOB', 'fb', '粪便', 18, 2, false, '标本新鲜', '消化道出血筛查'),
  lab(
    'L004',
    '肝功能全套',
    'LAB-LFT',
    'ggnq',
    '空腹血清',
    65,
    4,
    true,
    '空腹 8 小时',
    '肝损伤、黄疸评估',
  ),
  lab(
    'L005',
    '肾功能（肌酐/尿素/尿酸）',
    'LAB-RFT',
    'sng',
    '空腹血清',
    35,
    3,
    true,
    '空腹',
    '肾功能评估、造影前必查',
  ),
  lab('L006', '空腹血糖', 'LAB-FBG', 'kft', '血清', 8, 1, true, '空腹 8 小时', '糖尿病诊断与监测'),
  lab(
    'L007',
    '糖化血红蛋白',
    'LAB-HbA1c',
    'hbdb',
    '全血',
    45,
    24,
    false,
    '无需空腹',
    '近 3 月血糖平均水平',
  ),
  lab(
    'L008',
    '血脂四项',
    'LAB-LIPID',
    'xzsx',
    '空腹血清',
    40,
    4,
    true,
    '空腹 12 小时',
    '高脂血症评估',
  ),
  lab(
    'L009',
    '电解质（钾钠氯钙）',
    'LAB-ES',
    'djz',
    '血清',
    22,
    1,
    false,
    '',
    '心律失常、利尿剂监测',
  ),
  lab(
    'L010',
    '凝血四项（PT/APTT/TT/FIB）',
    'LAB-Coag',
    'nx',
    '枸橼酸化血浆',
    55,
    3,
    false,
    '',
    '抗凝治疗监测、出血风险',
  ),
  lab(
    'L011',
    '心肌酶谱（CK/CK-MB/LDH）',
    'LAB-CK',
    'xjmp',
    '血清',
    48,
    2,
    false,
    '',
    '心肌损伤辅助诊断',
  ),
  lab('L012', '肌钙蛋白 I（cTnI）', 'LAB-cTnI', 'jgdb', '血清', 65, 1, false, '', '心肌损伤金指标'),
  lab('L013', 'B 型脑钠肽（BNP）', 'LAB-BNP', 'bnp', '血浆', 120, 2, false, '', '心衰严重程度评估'),
  lab('L014', 'D-二聚体', 'LAB-DD', 'eerjt', '血浆', 75, 2, false, '', '肺栓塞/DIC 筛查'),
  lab('L015', '甲状腺功能三项', 'LAB-TF3', 'jzxgn', '血清', 120, 24, false, '', '甲亢/甲减筛查'),
  lab('L016', '甲状腺功能五项', 'LAB-TF5', 'jzxgn5', '血清', 180, 24, false, '', '甲状腺疾病鉴别'),
  lab(
    'L017',
    '肿瘤标志物五项',
    'LAB-TM5',
    'zlbz',
    '血清',
    220,
    24,
    false,
    '',
    '肿瘤筛查（非确诊）',
  ),
  lab('L018', 'C 反应蛋白（CRP）', 'LAB-CRP', 'crp', '血清', 30, 1, false, '', '炎症活动度'),
  lab('L019', '降钙素原（PCT）', 'LAB-PCT', 'jgsy', '血清', 120, 2, false, '', '细菌感染严重程度'),
  lab('L020', '糖化白蛋白', 'LAB-GA', 'thbdb', '血清', 60, 24, false, '', '近 2 周血糖水平'),
  lab('L021', '空腹胰岛素', 'LAB-INS', 'kfyds', '血清', 55, 24, true, '空腹', '胰岛素抵抗评估'),
  lab('L022', '同型半胱氨酸', 'LAB-Hcy', 'txbga', '血清', 80, 24, false, '', '心脑血管风险因子'),
  lab('L023', '血气分析', 'LAB-ABG', 'qx', '动脉血', 120, 0.5, false, '床边检测', '呼吸衰竭评估'),
  lab('L024', '乙肝五项', 'LAB-HBV5', 'yxwx', '血清', 60, 24, false, '', '乙肝感染筛查'),
  lab('L025', '丙肝抗体', 'LAB-HCV', 'bkg', '血清', 45, 24, false, '', '丙肝感染筛查'),
  lab(
    'L026',
    'HIV 抗原抗体联合检测',
    'LAB-HIV',
    'hiv',
    '血清',
    80,
    24,
    false,
    '',
    '术前/输血前筛查',
  ),
  lab('L027', '梅毒螺旋体抗体', 'LAB-TP', 'mdt', '血清', 50, 24, false, '', '术前/输血前筛查'),
  lab('L028', '血沉（ESR）', 'LAB-ESR', 'xc', '枸橼酸化血浆', 15, 4, false, '', '炎症活动度'),
  lab('L029', '类风湿因子（RF）', 'LAB-RF', 'lfyz', '血清', 35, 24, false, '', '类风湿关节炎筛查'),
  lab('L030', '抗 O（ASO）', 'LAB-ASO', 'kaso', '血清', 30, 24, false, '', '链球菌感染后状态'),
  lab(
    'L031',
    '尿微量白蛋白/肌酐比',
    'LAB-ACR',
    'nwdb',
    '随机尿',
    50,
    24,
    false,
    '晨尿最佳',
    '早期肾损伤',
  ),
  lab(
    'L032',
    '24 小时尿蛋白定量',
    'LAB-UP24',
    'ndb',
    '24h 尿',
    60,
    48,
    false,
    '留取 24h 尿',
    '肾病综合征评估',
  ),
  lab(
    'L033',
    '电解质+肾功能+血糖+血脂（生化全套）',
    'LAB-BIO',
    'shtq',
    '空腹血清',
    180,
    4,
    true,
    '空腹 12 小时',
    '住院/体检大生化',
  ),
  lab('L034', '肌红蛋白（Myo）', 'LAB-Myo', 'jhdb', '血清', 45, 1, false, '', '早期心肌损伤'),
  lab(
    'L035',
    '妊娠试验（尿 HCG）',
    'LAB-HCG',
    'rsy',
    '尿',
    15,
    0.5,
    false,
    '',
    '妊娠诊断（育龄女性必查）',
  ),
  lab('L036', '维生素 D（25-OH-VD）', 'LAB-VD', 'wssd', '血清', 90, 48, false, '', '骨代谢评估'),
  lab('L037', '铁代谢四项', 'LAB-Fe', 'tdx', '血清', 110, 24, false, '', '贫血病因鉴别'),
  lab(
    'L038',
    '尿培养+药敏',
    'LAB-UC',
    'npy',
    '清洁尿',
    120,
    72,
    false,
    '抗生素前留取',
    '尿路感染病原学',
  ),
  lab(
    'L039',
    '血培养（需氧+厌氧）',
    'LAB-BC',
    'xpy',
    '静脉血',
    150,
    120,
    false,
    '寒战/发热时双瓶',
    '菌血症诊断',
  ),
  lab(
    'L040',
    'D-二聚体+凝血（血栓套餐）',
    'LAB-THR',
    'xstc',
    '枸橼酸化血浆',
    130,
    2,
    false,
    '',
    '静脉血栓评估',
  ),
];

export const mockLabPanels: LabPanel[] = [
  {
    panelId: 'LP01',
    name: '血常规+CRP',
    itemIds: ['L001', 'L018'],
    price: 55,
    note: '发热/感染首选',
  },
  { panelId: 'LP02', name: '生化全套', itemIds: ['L033'], price: 180, note: '空腹 12 小时' },
  {
    panelId: 'LP03',
    name: '心梗三项',
    itemIds: ['L012', 'L011', 'L034'],
    price: 158,
    note: '胸痛急诊首选',
  },
  {
    panelId: 'LP04',
    name: '糖尿病套餐',
    itemIds: ['L006', 'L007', 'L020', 'L021'],
    price: 205,
    note: '空腹',
  },
  { panelId: 'LP05', name: '甲状腺功能全套', itemIds: ['L016'], price: 180 },
  {
    panelId: 'LP06',
    name: '术前四项',
    itemIds: ['L024', 'L025', 'L026', 'L027'],
    price: 235,
    note: '术前必查',
  },
  { panelId: 'LP07', name: '血栓风险套餐', itemIds: ['L040', 'L010'], price: 185 },
];

/* -------------------------------------------------------------------------- */
/*                              检查项目目录                                    */
/* -------------------------------------------------------------------------- */

function img(
  itemId: string,
  name: string,
  modality: ImagingItem['modality'],
  pinyin: string,
  price: number,
  waitHours: number,
  needsContrast: boolean,
  note?: string,
): ImagingItem {
  return { itemId, name, modality, pinyin, price, waitHours, needsContrast, note };
}

export const mockImagingCatalog: ImagingItem[] = [
  img('I001', '胸部正位片（DR）', 'DR', 'xbz', 80, 1, false, '去除胸前金属物品'),
  img('I002', '胸部 CT 平扫', 'CT', 'xcb', 280, 4, false, '去除金属饰物'),
  img('I003', '胸部 CT 增强', 'CT', 'xbzq', 580, 24, true, '需肾功能及碘过敏评估'),
  img('I004', '头颅 CT 平扫', 'CT', 'tnb', 280, 2, false, '急诊优先'),
  img('I005', '头颅 CT 增强', 'CT', 'tnzq', 580, 24, true, '需肾功能及碘过敏评估'),
  img(
    'I006',
    '头颅 MRI 平扫',
    'MRI',
    'tnmri',
    680,
    48,
    false,
    '去除所有金属物品，禁忌：体内金属植入物',
  ),
  img('I007', '头颅 MRI 增强', 'MRI', 'tnmrizq', 1180, 72, true, '需肾功能及钆过敏评估'),
  img('I008', '颈椎 MRI', 'MRI', 'jzmri', 680, 48, false, '去除金属物品'),
  img('I009', '腰椎 MRI', 'MRI', 'yzmri', 680, 48, false, '去除金属物品'),
  img('I010', '冠状动脉 CTA', 'CT', 'gdmcta', 1580, 48, true, '需肾功能、碘过敏评估，控制心率'),
  img('I011', '腹部超声', 'US', 'fbc', 120, 2, false, '空腹 8 小时'),
  img('I012', '甲状腺超声', 'US', 'jzxcs', 100, 2, false),
  img('I013', '心脏超声（彩超）', 'US', 'xzcs', 180, 4, false),
  img('I014', '颈动脉超声', 'US', 'jdmcs', 150, 4, false),
  img('I015', '泌尿系超声', 'US', 'mnxcs', 120, 2, false, '检查前憋尿'),
  img('I016', '心电图（静息）', 'ECG', 'xdt', 25, 0.2, false),
  img(
    'I017',
    '24 小时动态心电图（Holter）',
    'ECG',
    'holter',
    180,
    24,
    false,
    '佩带 24 小时避免洗澡',
  ),
  img('I018', '运动负荷心电图', 'ECG', 'ydh', 80, 2, false, '餐后 2 小时'),
  img('I019', '胃镜', '内镜', 'wj', 350, 48, false, '空腹 8 小时，停用抗凝药需评估'),
  img('I020', '肠镜', '内镜', 'cj', 450, 72, false, '肠道准备，停用抗凝药需评估'),
  img('I021', '消化内镜（无痛）', '内镜', 'wtwj', 800, 72, false, '需麻醉评估，禁食禁水'),
  img('I022', '冠状动脉造影（介入）', 'CT', 'gdmzy', 3500, 24, true, '住院手术，需肾功能评估'),
  img('I023', '骨密度检测', '其他', 'gmd', 120, 4, false),
  img('I024', '肺功能检查', '其他', 'fgn', 150, 4, false, '需配合吹气动作'),
  img('I025', '24 小时动态血压', '其他', 'hdyx', 120, 24, false, '佩带 24 小时'),
  img('I026', '腹部 CT 平扫', 'CT', 'fbt', 280, 4, false, '空腹 4 小时'),
  img('I027', '腹部 CT 增强', 'CT', 'fbzq', 580, 24, true, '需肾功能及碘过敏评估'),
  img('I028', '乳腺超声', 'US', 'rxcs', 110, 2, false),
];

export const mockTreatmentCatalog: TreatmentItem[] = [
  {
    treatmentId: 'T001',
    name: '雾化吸入治疗',
    pinyin: 'whxr',
    price: 35,
    durationMin: 20,
    note: '呼吸科常用',
  },
  {
    treatmentId: 'T002',
    name: '心电监护',
    pinyin: 'xdjh',
    price: 50,
    durationMin: 60,
    note: '卧床患者',
  },
  { treatmentId: 'T003', name: '静脉输液（普通）', pinyin: 'jmss', price: 25, durationMin: 60 },
  { treatmentId: 'T004', name: '换药', pinyin: 'hy', price: 30, durationMin: 15 },
  { treatmentId: 'T005', name: '理疗（中频）', pinyin: 'll', price: 45, durationMin: 30 },
  { treatmentId: 'T006', name: '氧气吸入', pinyin: 'yq', price: 20, durationMin: 30 },
  { treatmentId: 'T007', name: '血糖监测', pinyin: 'xtjc', price: 10, durationMin: 5 },
];

/* -------------------------------------------------------------------------- */
/*                              ICD-10 诊断字典                                */
/* -------------------------------------------------------------------------- */

export const mockIcdCatalog: IcdDiagnosis[] = [
  { code: 'I10.x00', name: '原发性高血压', category: '循环系统' },
  { code: 'I11.900', name: '高血压性心脏病', category: '循环系统' },
  { code: 'I20.000', name: '不稳定型心绞痛', category: '循环系统' },
  { code: 'I20.900', name: '心绞痛', category: '循环系统' },
  { code: 'I21.400', name: '非 ST 段抬高型心肌梗死', category: '循环系统' },
  { code: 'I25.100', name: '冠状动脉粥样硬化性心脏病', category: '循环系统' },
  { code: 'I25.200', name: '陈旧性心肌梗死', category: '循环系统' },
  { code: 'I44.200', name: '房室传导阻滞', category: '循环系统' },
  { code: 'I48.x00', name: '心房颤动', category: '循环系统' },
  { code: 'I49.900', name: '心律失常', category: '循环系统' },
  { code: 'I50.900', name: '心力衰竭', category: '循环系统' },
  { code: 'I50.100', name: '左心衰竭', category: '循环系统' },
  { code: 'I63.900', name: '脑梗死', category: '循环系统' },
  { code: 'I67.200', name: '脑动脉硬化', category: '循环系统' },
  { code: 'E11.900', name: '2 型糖尿病', category: '内分泌' },
  { code: 'E11.400', name: '2 型糖尿病伴神经系统并发症', category: '内分泌' },
  { code: 'E11.500', name: '2 型糖尿病伴周围循环并发症', category: '内分泌' },
  { code: 'E78.500', name: '高脂血症', category: '内分泌' },
  { code: 'E03.900', name: '甲状腺功能减退', category: '内分泌' },
  { code: 'E05.900', name: '甲状腺功能亢进', category: '内分泌' },
  { code: 'J18.900', name: '肺炎', category: '呼吸系统' },
  { code: 'J40.x00', name: '急性支气管炎', category: '呼吸系统' },
  { code: 'J45.900', name: '支气管哮喘', category: '呼吸系统' },
  { code: 'J44.900', name: '慢性阻塞性肺疾病', category: '呼吸系统' },
  { code: 'J20.900', name: '急性上呼吸道感染', category: '呼吸系统' },
  { code: 'R07.400', name: '胸痛', category: '症状体征' },
  { code: 'R00.200', name: '心悸', category: '症状体征' },
  { code: 'R42.x00', name: '头晕', category: '症状体征' },
  { code: 'R51.x00', name: '头痛', category: '症状体征' },
  { code: 'R06.000', name: '呼吸困难', category: '症状体征' },
  { code: 'K02.900', name: '胃食管反流病', category: '消化系统' },
  { code: 'K29.500', name: '慢性胃炎', category: '消化系统' },
  { code: 'K25.900', name: '消化性溃疡', category: '消化系统' },
  { code: 'K59.000', name: '便秘', category: '消化系统' },
  { code: 'N18.900', name: '慢性肾脏病', category: '泌尿系统' },
  { code: 'N39.000', name: '尿路感染', category: '泌尿系统' },
  { code: 'M54.500', name: '腰痛', category: '肌肉骨骼' },
  { code: 'M25.500', name: '关节痛', category: '肌肉骨骼' },
  { code: 'M47.800', name: '颈椎病', category: '肌肉骨骼' },
  { code: 'M51.200', name: '腰椎间盘突出', category: '肌肉骨骼' },
  { code: 'F32.900', name: '抑郁状态', category: '精神心理' },
  { code: 'F41.900', name: '焦虑状态', category: '精神心理' },
  { code: 'G43.900', name: '偏头痛', category: '神经系统' },
  { code: 'G44.200', name: '紧张性头痛', category: '神经系统' },
  { code: 'L23.900', name: '过敏性皮炎', category: '皮肤' },
  { code: 'Z00.000', name: '一般体格检查', category: '健康查体' },
  { code: 'Z71.200', name: '健康咨询', category: '健康查体' },
  { code: 'I26.900', name: '肺栓塞', category: '循环系统' },
  { code: 'I27.900', name: '肺动脉高压', category: '循环系统' },
  { code: 'D64.900', name: '贫血', category: '血液系统' },
  { code: 'D50.900', name: '缺铁性贫血', category: '血液系统' },
  { code: 'J30.900', name: '过敏性鼻炎', category: '呼吸系统' },
  { code: 'K21.900', name: '胃食管反流', category: '消化系统' },
  { code: 'I83.900', name: '下肢静脉曲张', category: '循环系统' },
  { code: 'I84.900', name: '痔', category: '消化系统' },
];

/** 本科室常见诊断 Top10 */
export const mockCommonDiagnoses: IcdDiagnosis[] = mockIcdCatalog.slice(0, 10);

/* -------------------------------------------------------------------------- */
/*                              处方模板                                        */
/* -------------------------------------------------------------------------- */

export const mockPrescriptionTemplates: PrescriptionTemplate[] = [
  {
    templateId: 'PT01',
    name: '冠心病二级预防基础方',
    type: 'western',
    indication: '冠状动脉粥样硬化性心脏病',
    lines: [
      {
        drugId: 'D001',
        dose: 100,
        doseUnit: 'mg',
        frequency: 'qd',
        route: 'po',
        days: 30,
        instruction: '饭后服用，长期维持',
      },
      {
        drugId: 'D003',
        dose: 20,
        doseUnit: 'mg',
        frequency: 'qn',
        route: 'po',
        days: 30,
        instruction: '睡前服用，监测肝功',
      },
      {
        drugId: 'D004',
        dose: 47.5,
        doseUnit: 'mg',
        frequency: 'qd',
        route: 'po',
        days: 30,
        instruction: '晨起服用，监测心率',
      },
    ],
  },
  {
    templateId: 'PT02',
    name: '高血压二联方案',
    type: 'western',
    indication: '原发性高血压',
    lines: [
      {
        drugId: 'D005',
        dose: 5,
        doseUnit: 'mg',
        frequency: 'qd',
        route: 'po',
        days: 30,
        instruction: '晨起服用',
      },
      {
        drugId: 'D006',
        dose: 80,
        doseUnit: 'mg',
        frequency: 'qd',
        route: 'po',
        days: 30,
        instruction: '与进餐无关',
      },
    ],
  },
  {
    templateId: 'PT03',
    name: '2 型糖尿病口服方案',
    type: 'western',
    indication: '2 型糖尿病',
    lines: [
      {
        drugId: 'D009',
        dose: 0.5,
        doseUnit: 'g',
        frequency: 'bid',
        route: 'po',
        days: 30,
        instruction: '餐中服用',
      },
      {
        drugId: 'D047',
        dose: 10,
        doseUnit: 'mg',
        frequency: 'qd',
        route: 'po',
        days: 30,
        instruction: '晨起服用，多饮水',
      },
    ],
  },
  {
    templateId: 'PT04',
    name: '上呼吸道感染对症',
    type: 'western',
    indication: '急性上呼吸道感染',
    lines: [
      {
        drugId: 'D021',
        dose: 0.5,
        doseUnit: 'g',
        frequency: 'prn',
        route: 'po',
        days: 3,
        instruction: '发热 >38.5℃ 时服用',
      },
      {
        drugId: 'D025',
        dose: 10,
        doseUnit: 'ml',
        frequency: 'tid',
        route: 'po',
        days: 5,
        instruction: '饭后服用',
      },
    ],
  },
  {
    templateId: 'PT05',
    name: '冠心病中成药辅助',
    type: 'chinese_patent',
    indication: '冠状动脉粥样硬化性心脏病',
    lines: [
      {
        drugId: 'D036',
        dose: 10,
        doseUnit: '丸',
        frequency: 'tid',
        route: 'po',
        days: 14,
        instruction: '舌下含服或饭后服用',
      },
      {
        drugId: 'D039',
        dose: 2,
        doseUnit: '丸',
        frequency: 'tid',
        route: 'po',
        days: 14,
        instruction: '胸闷发作时含服',
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                              病历模板                                        */
/* -------------------------------------------------------------------------- */

export const mockRecordTemplates: MedicalRecordTemplate[] = [
  {
    templateId: 'RT01',
    name: '心内科门诊通用模板',
    scope: 'dept',
    content: {
      chiefComplaint: '',
      presentIllness:
        '患者因【起病时间】出现【主要症状】，【诱因】下加重/缓解，【伴随症状】，【诊疗经过】。',
      pastHistory: '',
      physicalExam: 'T ℃，P 次/分，R 次/分，BP / mmHg。神志清，心肺腹（详见体格检查）。',
      diagnosis: '',
      treatment: '',
      healthEducation: '低盐低脂饮食，规律作息，监测血压心率，不适随诊。',
    },
  },
  {
    templateId: 'RT02',
    name: '胸痛门诊模板',
    scope: 'personal',
    content: {
      chiefComplaint: '',
      presentIllness: '',
      physicalExam: '生命体征平稳，心肺听诊详见专项。',
      treatment: '完善心电图、心肌酶谱，必要时冠脉 CTA。',
    },
  },
];

/* -------------------------------------------------------------------------- */
/*                              AI 辅助数据                                     */
/* -------------------------------------------------------------------------- */

export const mockAIFollowups = [
  {
    questionId: 'Q1',
    question: '胸闷具体位于哪个部位？是胸骨后、心前区还是左肩臂放射？',
    reason: '定位胸痛部位，鉴别心源性/非心源性',
  },
  {
    questionId: 'Q2',
    question: '胸闷的性质是压榨样、针刺样还是烧灼样？每次持续多长时间？',
    reason: '性质与持续时间鉴别心绞痛与肋间神经痛',
  },
  {
    questionId: 'Q3',
    question: '症状是否在活动后加重、休息后缓解？与进食、情绪有关吗？',
    reason: '鉴别劳力性心绞痛与胃食管反流',
  },
  { questionId: 'Q4', question: '有无夜间憋醒、端坐呼吸？有无下肢水肿？', reason: '排查心力衰竭' },
  {
    questionId: 'Q5',
    question: '近期有无感冒、发热、腹泻？有无出血倾向？',
    reason: '排查病毒性心肌炎与抗凝相关出血',
  },
];

export const mockAIDifferentials = [
  {
    name: '不稳定型心绞痛',
    code: 'I20.000',
    supports: ['胸骨后压榨样胸闷', '活动后加重', '既往支架植入史', '心电图 ST 段压低'],
    opposes: ['肌钙蛋白仅轻度升高', '无持续>20 分钟静息痛'],
    likelihood: 'high' as const,
  },
  {
    name: '急性非 ST 段抬高型心肌梗死',
    code: 'I21.400',
    supports: ['肌钙蛋白 I 升高', '症状加重 1 天', '糖尿病/高血压基础'],
    opposes: ['无持续静息剧痛', 'CK-MB 正常', '心电图无动态演变'],
    likelihood: 'medium' as const,
  },
  {
    name: '胃食管反流病',
    code: 'K21.900',
    supports: ['胸骨后不适', '可与进食相关'],
    opposes: ['无反酸烧心', '活动后加重更支持心源性'],
    likelihood: 'low' as const,
  },
  {
    name: '心律失常（房颤/早搏）',
    code: 'I48.x00',
    supports: ['心悸主诉', '可伴出汗'],
    opposes: ['查体心率齐', '心电图未见心律失常'],
    likelihood: 'low' as const,
  },
  {
    name: '心力衰竭（早期）',
    code: 'I50.900',
    supports: ['活动后气促', '高血压/糖尿病基础'],
    opposes: ['无夜间阵发性呼吸困难', '无双下肢水肿', '需查 BNP 进一步排除'],
    likelihood: 'medium' as const,
  },
];

export const mockAIExamSuggestions = [
  '建议急查心肌酶谱+肌钙蛋白 I（已开），3 小时复查一次',
  '建议完善 BNP 评估心功能',
  '建议完善血脂、糖化血红蛋白评估危险因素',
  '建议择期行冠状动脉 CTA 或住院造影评估血管',
  '建议 24 小时动态心电图排查阵发性心律失常',
];

export const mockAIMedSuggestions = [
  '阿司匹林 100mg qd（已在用），注意出血风险',
  '若考虑不稳定心绞痛，可加用氯吡格雷 75mg qd 双联抗血小板',
  '美托洛尔缓释片 47.5mg qd 控制心率，目标静息心率 55-60 次/分',
  '他汀类继续强化降脂，LDL-C 目标 <1.4 mmol/L',
];

export const mockCDSReminders = [
  {
    level: 'danger' as const,
    title: '青霉素过敏',
    detail:
      '患者既往青霉素过敏史明确，禁止开具青霉素类及头孢类需皮试药物，已自动拦截注射用青霉素钠。',
  },
  {
    level: 'warning' as const,
    title: '抗血小板与出血风险',
    detail: '患者阿司匹林+氯吡格雷双联时，需警惕消化道出血，建议联用 PPI 保护胃黏膜。',
  },
  {
    level: 'warning' as const,
    title: '造影剂使用前评估',
    detail: '拟行增强 CT/CTA 前需评估肾功能（肌酐/eGFR）并核对碘过敏史。',
  },
  {
    level: 'info' as const,
    title: '血脂管理目标',
    detail: '冠心病二级预防 LDL-C 目标值 <1.4 mmol/L，当前 LDL-C 未达标，建议强化他汀。',
  },
  {
    level: 'success' as const,
    title: '诊疗规范匹配',
    detail: '当前方案符合《稳定性冠心病诊断与治疗指南》二级预防推荐。',
  },
];

/* -------------------------------------------------------------------------- */
/*                              AI 对话历史                                     */
/* -------------------------------------------------------------------------- */

export const mockAIChatHistory: AIChatMessage[] = [
  {
    msgId: 'AM0',
    role: 'ai',
    content:
      '陈医生您好，已接入患者 张*（58 岁男性），既往冠心病支架术后、高血压、糖尿病。主诉：反复胸闷心悸 1 周加重 1 天。我已为您预生成追问与鉴别诊断，请查看右栏。',
    time: '08:55',
  },
];

/* -------------------------------------------------------------------------- */
/*                              处方/申请/病历初值                             */
/* -------------------------------------------------------------------------- */

export const mockInitialPrescription: Prescription = {
  prescriptionId: 'RX-20260916-0001',
  type: 'western',
  lines: [],
  warnings: [],
  totalFee: 0,
  signed: false,
  createdAt: '2026-09-16 09:00',
};

export const mockInitialOrders: import('@/types/outpatient').OrderItem[] = [
  {
    orderId: 'ORD-001',
    kind: 'lab',
    catalogId: 'L012',
    name: '肌钙蛋白 I（cTnI）',
    price: 65,
    status: 'pending',
    clinicalReason: '胸痛待查，评估心肌损伤',
    createdAt: '2026-09-16 08:35',
  },
  {
    orderId: 'ORD-002',
    kind: 'lab',
    catalogId: 'L008',
    name: '血脂四项',
    price: 40,
    status: 'pending',
    clinicalReason: '冠心病二级预防随访',
    createdAt: '2026-09-16 08:35',
  },
];

export const mockAuxExamResults: AuxExamResult[] = mockConsultation.auxiliaryExams;

/* -------------------------------------------------------------------------- */
/*                              统计                                            */
/* -------------------------------------------------------------------------- */

export const mockStats: OutpatientStats = {
  todayRegistered: 40,
  todayVisited: 12,
  todayWaiting: 13,
  todayPassed: 3,
  avgWaitMinutes: 18,
  avgVisitMinutes: 11,
  prescriptionCount: 11,
  orderCount: 18,
  monthVisits: 860,
  monthPrescriptions: 720,
  monthRecords: 856,
  avgPrescriptionFee: 186.5,
};

/* -------------------------------------------------------------------------- */
/*                              历史诊断                                        */
/* -------------------------------------------------------------------------- */

export const mockHistoryDiagnoses: DiagnosisItem[] = [
  { id: 'HD1', code: 'I10.x00', name: '原发性高血压', kind: 'secondary', confirmed: true },
  { id: 'HD2', code: 'E11.900', name: '2 型糖尿病', kind: 'secondary', confirmed: true },
  {
    id: 'HD3',
    code: 'I25.100',
    name: '冠状动脉粥样硬化性心脏病',
    kind: 'primary',
    confirmed: true,
    note: 'LAD 支架术后',
  },
];
