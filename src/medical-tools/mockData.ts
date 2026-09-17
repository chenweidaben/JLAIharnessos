/**
 * 健澜科技数智医院智能体 - 医疗工具Mock数据
 *
 * 提供真实可信的模拟医疗数据，供工具开发和测试使用。
 * 所有数据均为虚构，不涉及真实患者隐私。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 患者Mock数据
// ============================================================================

export interface MockPatient {
  patientId: string;
  name: string;
  gender: '男' | '女';
  age: number;
  birthDate: string;
  idCard: string;
  phone: string;
  address: string;
  bloodType: string;
  medicalRecordNo: string;
  department: string;
  currentDiagnosis: string | null;
  lastVisitDate: string;
  isEmergency: boolean;
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: '轻度' | '中度' | '重度' | '危及生命';
    recordedAt: string;
  }>;
  pastHistory: Array<{
    disease: string;
    diagnosedAt: string | null;
    status: '治愈' | '好转' | '未愈' | '死亡';
  }>;
  currentMedications: Array<{
    drugName: string;
    dosage: string;
    frequency: string;
    startDate: string;
    prescribingDoctor: string;
  }>;
  latestVitals: {
    temperature: number | null;
    pulse: number | null;
    respiration: number | null;
    bloodPressure: string | null;
    spo2: number | null;
    measuredAt: string | null;
  };
}

export const MOCK_PATIENTS: MockPatient[] = [
  {
    patientId: 'P2026090001',
    name: '张建国',
    gender: '男',
    age: 58,
    birthDate: '1968-03-15',
    idCard: '330106196803152318',
    phone: '13812345678',
    address: '浙江省杭州市西湖区文三路123号',
    bloodType: 'A型',
    medicalRecordNo: 'MR000001',
    department: '心血管内科',
    currentDiagnosis: '冠状动脉粥样硬化性心脏病、不稳定型心绞痛',
    lastVisitDate: '2026-09-12',
    isEmergency: false,
    allergies: [
      {
        allergen: '青霉素',
        reaction: '皮疹、瘙痒',
        severity: '中度',
        recordedAt: '2019-05-20',
      },
    ],
    pastHistory: [
      { disease: '高血压2级', diagnosedAt: '2015-08-10', status: '未愈' },
      { disease: '2型糖尿病', diagnosedAt: '2018-11-03', status: '未愈' },
      { disease: '高脂血症', diagnosedAt: '2017-06-15', status: '未愈' },
    ],
    currentMedications: [
      {
        drugName: '阿司匹林肠溶片',
        dosage: '100mg',
        frequency: 'qd(每日一次)',
        startDate: '2026-09-01',
        prescribingDoctor: '王主任',
      },
      {
        drugName: '氯吡格雷片',
        dosage: '75mg',
        frequency: 'qd(每日一次)',
        startDate: '2026-09-01',
        prescribingDoctor: '王主任',
      },
      {
        drugName: '阿托伐他汀钙片',
        dosage: '20mg',
        frequency: 'qn(每晚一次)',
        startDate: '2026-09-01',
        prescribingDoctor: '王主任',
      },
      {
        drugName: '美托洛尔缓释片',
        dosage: '47.5mg',
        frequency: 'qd(每日一次)',
        startDate: '2026-09-01',
        prescribingDoctor: '王主任',
      },
    ],
    latestVitals: {
      temperature: 36.5,
      pulse: 72,
      respiration: 18,
      bloodPressure: '138/85mmHg',
      spo2: 97,
      measuredAt: '2026-09-12T08:30:00',
    },
  },
  {
    patientId: 'P2026090002',
    name: '李秀英',
    gender: '女',
    age: 65,
    birthDate: '1961-07-22',
    idCard: '330102196107224567',
    phone: '13987654321',
    address: '浙江省杭州市上城区解放路456号',
    bloodType: 'O型',
    medicalRecordNo: 'MR000002',
    department: '呼吸内科',
    currentDiagnosis: '社区获得性肺炎、慢性阻塞性肺疾病急性加重',
    lastVisitDate: '2026-09-13',
    isEmergency: false,
    allergies: [
      {
        allergen: '磺胺类药物',
        reaction: '口唇发绀、呼吸困难',
        severity: '重度',
        recordedAt: '2010-03-15',
      },
    ],
    pastHistory: [
      { disease: '慢性阻塞性肺疾病', diagnosedAt: '2012-09-01', status: '未愈' },
      { disease: '肺源性心脏病', diagnosedAt: '2020-01-20', status: '未愈' },
    ],
    currentMedications: [
      {
        drugName: '头孢曲松钠',
        dosage: '2g',
        frequency: 'qd(每日一次)静滴',
        startDate: '2026-09-10',
        prescribingDoctor: '陈医生',
      },
      {
        drugName: '氨溴索注射液',
        dosage: '30mg',
        frequency: 'bid(每日两次)静滴',
        startDate: '2026-09-10',
        prescribingDoctor: '陈医生',
      },
      {
        drugName: '沙丁胺醇气雾剂',
        dosage: '100μg',
        frequency: 'prn(必要时)',
        startDate: '2026-09-10',
        prescribingDoctor: '陈医生',
      },
    ],
    latestVitals: {
      temperature: 37.8,
      pulse: 96,
      respiration: 24,
      bloodPressure: '142/88mmHg',
      spo2: 93,
      measuredAt: '2026-09-13T10:15:00',
    },
  },
  {
    patientId: 'P2026090003',
    name: '王明远',
    gender: '男',
    age: 45,
    birthDate: '1981-01-08',
    idCard: '330108198101087890',
    phone: '13611112222',
    address: '浙江省杭州市滨江区江南大道789号',
    bloodType: 'B型',
    medicalRecordNo: 'MR000003',
    department: '消化内科',
    currentDiagnosis: '急性胃炎、幽门螺杆菌感染',
    lastVisitDate: '2026-09-11',
    isEmergency: false,
    allergies: [],
    pastHistory: [{ disease: '慢性胃炎', diagnosedAt: '2022-04-10', status: '未愈' }],
    currentMedications: [
      {
        drugName: '奥美拉唑肠溶胶囊',
        dosage: '20mg',
        frequency: 'bid(每日两次)',
        startDate: '2026-09-11',
        prescribingDoctor: '刘医生',
      },
      {
        drugName: '阿莫西林胶囊',
        dosage: '1g',
        frequency: 'bid(每日两次)',
        startDate: '2026-09-11',
        prescribingDoctor: '刘医生',
      },
      {
        drugName: '克拉霉素片',
        dosage: '0.5g',
        frequency: 'bid(每日两次)',
        startDate: '2026-09-11',
        prescribingDoctor: '刘医生',
      },
    ],
    latestVitals: {
      temperature: 36.8,
      pulse: 78,
      respiration: 16,
      bloodPressure: '125/80mmHg',
      spo2: 98,
      measuredAt: '2026-09-11T14:20:00',
    },
  },
  {
    patientId: 'P2026090004',
    name: '赵雪梅',
    gender: '女',
    age: 32,
    birthDate: '1994-11-30',
    idCard: '330105199411301234',
    phone: '13755556666',
    address: '浙江省杭州市拱墅区莫干山路321号',
    bloodType: 'AB型',
    medicalRecordNo: 'MR000004',
    department: '内分泌科',
    currentDiagnosis: '甲状腺功能亢进症',
    lastVisitDate: '2026-09-10',
    isEmergency: false,
    allergies: [],
    pastHistory: [],
    currentMedications: [
      {
        drugName: '甲巯咪唑片',
        dosage: '10mg',
        frequency: 'tid(每日三次)',
        startDate: '2026-08-15',
        prescribingDoctor: '孙主任',
      },
      {
        drugName: '普萘洛尔片',
        dosage: '10mg',
        frequency: 'tid(每日三次)',
        startDate: '2026-08-15',
        prescribingDoctor: '孙主任',
      },
    ],
    latestVitals: {
      temperature: 36.7,
      pulse: 88,
      respiration: 18,
      bloodPressure: '130/75mmHg',
      spo2: 99,
      measuredAt: '2026-09-10T09:00:00',
    },
  },
  {
    patientId: 'P2026090005',
    name: '陈大伟',
    gender: '男',
    age: 72,
    birthDate: '1954-05-18',
    idCard: '330104195405185678',
    phone: '13599998888',
    address: '浙江省杭州市江干区庆春东路654号',
    bloodType: 'A型',
    medicalRecordNo: 'MR000005',
    department: '神经内科',
    currentDiagnosis: '急性脑梗死、心房颤动',
    lastVisitDate: '2026-09-14',
    isEmergency: true,
    allergies: [
      {
        allergen: '华法林',
        reaction: '严重出血、INR显著升高',
        severity: '危及生命',
        recordedAt: '2023-12-01',
      },
    ],
    pastHistory: [
      { disease: '心房颤动', diagnosedAt: '2019-03-20', status: '未愈' },
      { disease: '高血压3级', diagnosedAt: '2010-07-08', status: '未愈' },
      { disease: '2型糖尿病', diagnosedAt: '2016-02-14', status: '未愈' },
    ],
    currentMedications: [
      {
        drugName: '利伐沙班片',
        dosage: '20mg',
        frequency: 'qd(每日一次)',
        startDate: '2026-09-14',
        prescribingDoctor: '周主任',
      },
      {
        drugName: '阿托伐他汀钙片',
        dosage: '40mg',
        frequency: 'qn(每晚一次)',
        startDate: '2026-09-14',
        prescribingDoctor: '周主任',
      },
      {
        drugName: '氨氯地平片',
        dosage: '5mg',
        frequency: 'qd(每日一次)',
        startDate: '2026-09-14',
        prescribingDoctor: '周主任',
      },
    ],
    latestVitals: {
      temperature: 36.6,
      pulse: 102,
      respiration: 20,
      bloodPressure: '165/95mmHg',
      spo2: 95,
      measuredAt: '2026-09-14T07:45:00',
    },
  },
  {
    patientId: 'P2026090006',
    name: '刘芳',
    gender: '女',
    age: 28,
    birthDate: '1998-09-25',
    idCard: '330106199809253456',
    phone: '13800001111',
    address: '浙江省杭州市西湖区文一西路987号',
    bloodType: 'O型',
    medicalRecordNo: 'MR000006',
    department: '妇产科',
    currentDiagnosis: null,
    lastVisitDate: '2026-09-08',
    isEmergency: false,
    allergies: [],
    pastHistory: [],
    currentMedications: [],
    latestVitals: {
      temperature: 36.4,
      pulse: 70,
      respiration: 16,
      bloodPressure: '115/72mmHg',
      spo2: 99,
      measuredAt: '2026-09-08T10:30:00',
    },
  },
];

// ============================================================================
// 就诊历史Mock数据
// ============================================================================

export interface MockVisit {
  encounterId: string;
  patientId: string;
  visitType: string;
  visitDate: string;
  department: string;
  doctor: string;
  primaryDiagnosis: string | null;
  secondaryDiagnosis: string[];
  dischargeSummary: string | null;
  hasRecords: boolean;
}

export const MOCK_VISITS: MockVisit[] = [
  {
    encounterId: 'E20260912001',
    patientId: 'P2026090001',
    visitType: '门诊',
    visitDate: '2026-09-12',
    department: '心血管内科',
    doctor: '王主任',
    primaryDiagnosis: '冠状动脉粥样硬化性心脏病',
    secondaryDiagnosis: ['不稳定型心绞痛', '高血压2级'],
    dischargeSummary: null,
    hasRecords: true,
  },
  {
    encounterId: 'E20260901002',
    patientId: 'P2026090001',
    visitType: '住院',
    visitDate: '2026-09-01',
    department: '心血管内科',
    doctor: '王主任',
    primaryDiagnosis: '急性非ST段抬高型心肌梗死',
    secondaryDiagnosis: ['高血压2级', '2型糖尿病', '高脂血症'],
    dischargeSummary:
      '患者因"反复胸痛3天，加重6小时"入院，冠脉造影示前降支近段狭窄90%，植入支架1枚，术后恢复良好，病情稳定出院。',
    hasRecords: true,
  },
  {
    encounterId: 'E20260815003',
    patientId: 'P2026090001',
    visitType: '门诊',
    visitDate: '2026-08-15',
    department: '内分泌科',
    doctor: '孙主任',
    primaryDiagnosis: '2型糖尿病',
    secondaryDiagnosis: ['糖尿病周围神经病变'],
    dischargeSummary: null,
    hasRecords: true,
  },
  {
    encounterId: 'E20260910004',
    patientId: 'P2026090002',
    visitType: '住院',
    visitDate: '2026-09-10',
    department: '呼吸内科',
    doctor: '陈医生',
    primaryDiagnosis: '社区获得性肺炎',
    secondaryDiagnosis: ['慢性阻塞性肺疾病急性加重', 'Ⅱ型呼吸衰竭'],
    dischargeSummary: null,
    hasRecords: true,
  },
  {
    encounterId: 'E20260720005',
    patientId: 'P2026090002',
    visitType: '门诊',
    visitDate: '2026-07-20',
    department: '呼吸内科',
    doctor: '陈医生',
    primaryDiagnosis: '慢性阻塞性肺疾病稳定期',
    secondaryDiagnosis: [],
    dischargeSummary: null,
    hasRecords: true,
  },
  {
    encounterId: 'E20260914006',
    patientId: 'P2026090005',
    visitType: '急诊',
    visitDate: '2026-09-14',
    department: '神经内科',
    doctor: '周主任',
    primaryDiagnosis: '急性脑梗死',
    secondaryDiagnosis: ['心房颤动', '高血压3级'],
    dischargeSummary: null,
    hasRecords: true,
  },
  {
    encounterId: 'E20260911007',
    patientId: 'P2026090003',
    visitType: '门诊',
    visitDate: '2026-09-11',
    department: '消化内科',
    doctor: '刘医生',
    primaryDiagnosis: '急性胃炎',
    secondaryDiagnosis: ['幽门螺杆菌感染'],
    dischargeSummary: null,
    hasRecords: true,
  },
];

// ============================================================================
// 病历Mock数据
// ============================================================================

export interface MockMedicalRecord {
  recordId: string;
  encounterId: string;
  patientId: string;
  recordType: string;
  title: string;
  content: string;
  status: '草稿' | '待复核' | '已确认' | '已归档';
  createdAt: string;
  createdBy: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  qcScore: number | null;
}

export const MOCK_MEDICAL_RECORDS: MockMedicalRecord[] = [
  {
    recordId: 'R20260912001',
    encounterId: 'E20260912001',
    patientId: 'P2026090001',
    recordType: '门诊病历',
    title: '胸痛门诊病历记录',
    content: `主诉：反复胸痛1月，加重3天。
现病史：患者1月前无明显诱因出现胸骨后压榨样疼痛，每次持续约5-10分钟，休息后可缓解，未予重视。3天前胸痛发作频繁，每日2-3次，伴胸闷、出汗，含服硝酸甘油后约3分钟缓解。无恶心呕吐，无呼吸困难。
既往史：高血压病史11年，最高160/100mmHg，规律服用氨氯地平。2型糖尿病8年，口服二甲双胍。高脂血症9年。
查体：T 36.5℃，P 72次/分，R 18次/分，BP 138/85mmHg。神志清，精神可，双肺呼吸音清，未闻及干湿啰音。心率72次/分，律齐，各瓣膜听诊区未闻及病理性杂音。腹软，无压痛。双下肢无水肿。
辅助检查：心电图（2026-09-12）：窦性心律，V4-V6导联ST段压低0.1mV。肌钙蛋白I：0.02ng/mL（正常）。
初步诊断：1.冠状动脉粥样硬化性心脏病 不稳定型心绞痛；2.高血压2级；3.2型糖尿病；4.高脂血症。
处理建议：1.建议住院行冠脉造影检查；2.阿司匹林100mg qd + 氯吡格雷75mg qd双联抗血小板；3.阿托伐他汀20mg qn；4.美托洛尔47.5mg qd；5.硝酸甘油片必要时含服；6.监测血压、血糖。`,
    status: '已确认',
    createdAt: '2026-09-12T09:30:00',
    createdBy: '王主任',
    confirmedAt: '2026-09-12T10:15:00',
    confirmedBy: '王主任',
    qcScore: 92,
  },
  {
    recordId: 'R20260901002',
    encounterId: 'E20260901002',
    patientId: 'P2026090001',
    recordType: '入院记录',
    title: '急性非ST段抬高型心肌梗死入院记录',
    content: `患者张建国，男，58岁，因"反复胸痛3天，加重6小时"于2026-09-01 14:30急诊入院。
现病史：患者3天前无明显诱因出现胸骨后压榨样疼痛，向背部放射，伴大汗，持续约15分钟，自行含服硝酸甘油后缓解。6小时前胸痛再次发作，程度较前加重，持续不缓解，伴胸闷、气促、出冷汗，无恶心呕吐。急诊查心电图示V3-V6导联ST段压低0.15mV，肌钙蛋白I 0.15ng/mL升高，以"急性冠脉综合征"收入院。
既往史：高血压11年，2型糖尿病8年，高脂血症9年。青霉素过敏（皮疹）。
查体：T 36.8℃，P 88次/分，R 22次/分，BP 145/90mmHg。急性病容，双肺底可闻及少量湿啰音。心率88次/分，律齐，心尖部可闻及2/6级收缩期杂音。
诊疗计划：1.心内科护理常规，一级护理，低盐低脂糖尿病饮食；2.完善血常规、生化、凝血、心肌酶谱等检查；3.阿司匹林+氯吡格雷双联抗血小板，低分子肝素抗凝，阿托伐他汀调脂，美托洛尔控制心率；4.择期行冠脉造影+PCI术。`,
    status: '已归档',
    createdAt: '2026-09-01T15:00:00',
    createdBy: '李住院医',
    confirmedAt: '2026-09-01T17:30:00',
    confirmedBy: '王主任',
    qcScore: 88,
  },
  {
    recordId: 'R20260910003',
    encounterId: 'E20260910004',
    patientId: 'P2026090002',
    recordType: '入院记录',
    title: '社区获得性肺炎入院记录',
    content: `患者李秀英，女，65岁，因"咳嗽咳痰1周，发热伴气促2天"入院。
现病史：患者1周前受凉后出现咳嗽，咳黄脓痰，量中等，2天前出现发热，体温最高38.5℃，伴活动后气促，无畏寒寒战，无胸痛咯血。门诊查血常规白细胞12.5×10^9/L，中性粒细胞85%，胸片示右下肺斑片状阴影，以"社区获得性肺炎"收入院。
既往史：慢性阻塞性肺疾病14年，肺源性心脏病6年。磺胺类药物过敏（口唇发绀、呼吸困难）。
查体：T 37.8℃，P 96次/分，R 24次/分，BP 142/88mmHg，SpO2 93%（未吸氧）。口唇轻度发绀，桶状胸，双肺呼吸音低，右下肺可闻及湿啰音。心率96次/分，律齐，P2>A2。
初步诊断：1.社区获得性肺炎；2.慢性阻塞性肺疾病急性加重；3.Ⅱ型呼吸衰竭；4.慢性肺源性心脏病。
诊疗计划：1.呼吸内科护理常规，二级护理，低盐饮食；2.头孢曲松2g qd静滴抗感染，氨溴索30mg bid静滴化痰；3.低流量吸氧，沙丁胺醇雾化吸入平喘；4.完善血气分析、痰培养、降钙素原等检查。`,
    status: '已确认',
    createdAt: '2026-09-10T11:00:00',
    createdBy: '吴住院医',
    confirmedAt: '2026-09-10T14:00:00',
    confirmedBy: '陈医生',
    qcScore: 85,
  },
  {
    recordId: 'R20260914004',
    encounterId: 'E20260914006',
    patientId: 'P2026090005',
    recordType: '急诊病历',
    title: '急性脑梗死急诊病历',
    content: `患者陈大伟，男，72岁，因"突发右侧肢体无力伴言语不清2小时"急诊就诊。
现病史：患者2小时前晨起时发现右侧肢体无力，右手持物掉落，右下肢行走拖曳，伴言语不清，能理解问话但表达困难，无头痛呕吐，无意识障碍，无抽搐。家属呼叫120送入急诊。
既往史：心房颤动7年，高血压16年，2型糖尿病10年。华法林过敏（严重出血）。
查体：T 36.6℃，P 102次/分，R 20次/分，BP 165/95mmHg。神志清，运动性失语，双侧瞳孔等大等圆，对光反射灵敏。右侧鼻唇沟变浅，伸舌右偏，右上肢肌力2级，右下肢肌力3级，右侧巴氏征阳性。NIHSS评分8分。
辅助检查：头颅CT（2026-09-14）：未见出血及明显低密度灶。心电图：心房颤动，心室率105次/分。
初步诊断：1.急性脑梗死（左侧大脑中动脉供血区）；2.心房颤动；3.高血压3级（很高危）；4.2型糖尿病。
处理：1.发病2小时，在静脉溶栓时间窗内，评估无溶栓禁忌，予阿替普酶静脉溶栓治疗；2.收入神经内科重症监护室；3.完善头颅MRI+MRA、凝血功能、血糖等检查；4.监测生命体征及神经功能变化。`,
    status: '已确认',
    createdAt: '2026-09-14T08:15:00',
    createdBy: '急诊张医生',
    confirmedAt: '2026-09-14T09:00:00',
    confirmedBy: '周主任',
    qcScore: 90,
  },
];

// ============================================================================
// 医嘱Mock数据
// ============================================================================

export interface MockOrder {
  orderId: string;
  patientId: string;
  encounterId: string;
  orderType: string;
  itemName: string;
  dosage: string | null;
  frequency: string | null;
  status: string;
  priority: string;
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string;
  executedBy: string | null;
  clinicalIndication: string;
}

export const MOCK_ORDERS: MockOrder[] = [
  {
    orderId: 'O20260912001',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    orderType: '药品',
    itemName: '阿司匹林肠溶片',
    dosage: '100mg',
    frequency: 'qd(每日一次) 口服',
    status: '执行中',
    priority: '普通',
    startDate: '2026-09-12',
    endDate: null,
    prescribingDoctor: '王主任',
    executedBy: '门诊药房',
    clinicalIndication: '冠心病二级预防，抗血小板聚集',
  },
  {
    orderId: 'O20260912002',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    orderType: '药品',
    itemName: '氯吡格雷片',
    dosage: '75mg',
    frequency: 'qd(每日一次) 口服',
    status: '执行中',
    priority: '普通',
    startDate: '2026-09-12',
    endDate: null,
    prescribingDoctor: '王主任',
    executedBy: '门诊药房',
    clinicalIndication: '急性冠脉综合征，双联抗血小板',
  },
  {
    orderId: 'O20260912003',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    orderType: '检查',
    itemName: '冠状动脉CT血管造影（CTA）',
    dosage: null,
    frequency: null,
    status: '已完成',
    priority: '急',
    startDate: '2026-09-12',
    endDate: '2026-09-12',
    prescribingDoctor: '王主任',
    executedBy: '放射科',
    clinicalIndication: '评估冠脉狭窄程度，明确心绞痛病因',
  },
  {
    orderId: 'O20260910004',
    patientId: 'P2026090002',
    encounterId: 'E20260910004',
    orderType: '药品',
    itemName: '头孢曲松钠',
    dosage: '2g',
    frequency: 'qd(每日一次) 静滴',
    status: '执行中',
    priority: '急',
    startDate: '2026-09-10',
    endDate: null,
    prescribingDoctor: '陈医生',
    executedBy: '住院护士站',
    clinicalIndication: '社区获得性肺炎抗感染治疗',
  },
  {
    orderId: 'O20260910005',
    patientId: 'P2026090002',
    encounterId: 'E20260910004',
    orderType: '检验',
    itemName: '血常规+CRP+降钙素原',
    dosage: null,
    frequency: null,
    status: '已完成',
    priority: '急',
    startDate: '2026-09-10',
    endDate: '2026-09-10',
    prescribingDoctor: '陈医生',
    executedBy: '检验科',
    clinicalIndication: '评估感染严重程度，指导抗生素使用',
  },
  {
    orderId: 'O20260914006',
    patientId: 'P2026090005',
    encounterId: 'E20260914006',
    orderType: '药品',
    itemName: '阿替普酶（rt-PA）',
    dosage: '0.9mg/kg（总量63mg）',
    frequency: '静脉溶栓（先静推10%，余量1小时泵入）',
    status: '已完成',
    priority: '即刻',
    startDate: '2026-09-14',
    endDate: '2026-09-14',
    prescribingDoctor: '周主任',
    executedBy: '急诊抢救室',
    clinicalIndication: '急性缺血性脑卒中，发病2小时，静脉溶栓治疗',
  },
];

// ============================================================================
// 检验报告Mock数据
// ============================================================================

export interface MockLabItem {
  itemName: string;
  result: string;
  unit: string | null;
  referenceRange: string | null;
  abnormalFlag: '正常' | '偏高' | '偏低' | '危急高' | '危急低' | '阳性' | '阴性' | null;
}

export interface MockLabReport {
  reportId: string;
  patientId: string;
  encounterId: string | null;
  testName: string;
  testCategory: string;
  specimen: string;
  collectedAt: string;
  reportedAt: string;
  reportingDoctor: string;
  status: '检验中' | '已报告' | '已审核';
  hasCriticalValue: boolean;
  items: MockLabItem[];
  reportNotes: string | null;
}

export const MOCK_LAB_REPORTS: MockLabReport[] = [
  {
    reportId: 'L20260912001',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    testName: '血常规',
    testCategory: '血常规',
    specimen: '静脉血（EDTA抗凝）',
    collectedAt: '2026-09-12T08:00:00',
    reportedAt: '2026-09-12T08:45:00',
    reportingDoctor: '检验师-林',
    status: '已审核',
    hasCriticalValue: false,
    items: [
      {
        itemName: '白细胞计数（WBC）',
        result: '8.5',
        unit: '×10^9/L',
        referenceRange: '4.0-10.0',
        abnormalFlag: '正常',
      },
      {
        itemName: '中性粒细胞百分比（NEUT%）',
        result: '68.2',
        unit: '%',
        referenceRange: '50.0-70.0',
        abnormalFlag: '正常',
      },
      {
        itemName: '淋巴细胞百分比（LYMPH%）',
        result: '22.5',
        unit: '%',
        referenceRange: '20.0-40.0',
        abnormalFlag: '正常',
      },
      {
        itemName: '红细胞计数（RBC）',
        result: '4.52',
        unit: '×10^12/L',
        referenceRange: '4.00-5.50',
        abnormalFlag: '正常',
      },
      {
        itemName: '血红蛋白（HGB）',
        result: '142',
        unit: 'g/L',
        referenceRange: '120-160',
        abnormalFlag: '正常',
      },
      {
        itemName: '血小板计数（PLT）',
        result: '215',
        unit: '×10^9/L',
        referenceRange: '100-300',
        abnormalFlag: '正常',
      },
      {
        itemName: '红细胞压积（HCT）',
        result: '42.5',
        unit: '%',
        referenceRange: '40.0-50.0',
        abnormalFlag: '正常',
      },
    ],
    reportNotes: null,
  },
  {
    reportId: 'L20260912002',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    testName: '生化全套',
    testCategory: '生化',
    specimen: '静脉血（分离胶）',
    collectedAt: '2026-09-12T08:00:00',
    reportedAt: '2026-09-12T09:30:00',
    reportingDoctor: '检验师-林',
    status: '已审核',
    hasCriticalValue: false,
    items: [
      {
        itemName: '谷丙转氨酶（ALT）',
        result: '32',
        unit: 'U/L',
        referenceRange: '0-40',
        abnormalFlag: '正常',
      },
      {
        itemName: '谷草转氨酶（AST）',
        result: '28',
        unit: 'U/L',
        referenceRange: '0-40',
        abnormalFlag: '正常',
      },
      {
        itemName: '总胆红素（TBIL）',
        result: '15.2',
        unit: 'μmol/L',
        referenceRange: '3.4-20.5',
        abnormalFlag: '正常',
      },
      {
        itemName: '肌酐（Cr）',
        result: '88',
        unit: 'μmol/L',
        referenceRange: '44-133',
        abnormalFlag: '正常',
      },
      {
        itemName: '尿素氮（BUN）',
        result: '6.5',
        unit: 'mmol/L',
        referenceRange: '2.9-8.2',
        abnormalFlag: '正常',
      },
      {
        itemName: '空腹血糖（GLU）',
        result: '7.8',
        unit: 'mmol/L',
        referenceRange: '3.9-6.1',
        abnormalFlag: '偏高',
      },
      {
        itemName: '总胆固醇（TC）',
        result: '5.8',
        unit: 'mmol/L',
        referenceRange: '<5.2',
        abnormalFlag: '偏高',
      },
      {
        itemName: '甘油三酯（TG）',
        result: '2.3',
        unit: 'mmol/L',
        referenceRange: '<1.7',
        abnormalFlag: '偏高',
      },
      {
        itemName: '低密度脂蛋白胆固醇（LDL-C）',
        result: '3.8',
        unit: 'mmol/L',
        referenceRange: '<3.4',
        abnormalFlag: '偏高',
      },
      {
        itemName: '高密度脂蛋白胆固醇（HDL-C）',
        result: '1.0',
        unit: 'mmol/L',
        referenceRange: '>1.0',
        abnormalFlag: '正常',
      },
      {
        itemName: '钾（K）',
        result: '4.2',
        unit: 'mmol/L',
        referenceRange: '3.5-5.5',
        abnormalFlag: '正常',
      },
      {
        itemName: '钠（Na）',
        result: '140',
        unit: 'mmol/L',
        referenceRange: '135-145',
        abnormalFlag: '正常',
      },
    ],
    reportNotes: '血糖、血脂偏高，建议内分泌科随访。',
  },
  {
    reportId: 'L20260912003',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    testName: '心肌酶谱+肌钙蛋白',
    testCategory: '生化',
    specimen: '静脉血（促凝管）',
    collectedAt: '2026-09-12T08:05:00',
    reportedAt: '2026-09-12T08:50:00',
    reportingDoctor: '检验师-林',
    status: '已审核',
    hasCriticalValue: false,
    items: [
      {
        itemName: '肌酸激酶（CK）',
        result: '95',
        unit: 'U/L',
        referenceRange: '26-140',
        abnormalFlag: '正常',
      },
      {
        itemName: '肌酸激酶同工酶（CK-MB）',
        result: '12',
        unit: 'U/L',
        referenceRange: '0-25',
        abnormalFlag: '正常',
      },
      {
        itemName: '乳酸脱氢酶（LDH）',
        result: '168',
        unit: 'U/L',
        referenceRange: '109-245',
        abnormalFlag: '正常',
      },
      {
        itemName: '肌钙蛋白I（cTnI）',
        result: '0.02',
        unit: 'ng/mL',
        referenceRange: '<0.04',
        abnormalFlag: '正常',
      },
      {
        itemName: '肌红蛋白（Myo）',
        result: '45',
        unit: 'ng/mL',
        referenceRange: '0-70',
        abnormalFlag: '正常',
      },
      {
        itemName: 'N末端B型利钠肽原（NT-proBNP）',
        result: '185',
        unit: 'pg/mL',
        referenceRange: '<125',
        abnormalFlag: '偏高',
      },
    ],
    reportNotes: null,
  },
  {
    reportId: 'L20260910004',
    patientId: 'P2026090002',
    encounterId: 'E20260910004',
    testName: '血常规+CRP',
    testCategory: '血常规',
    specimen: '静脉血（EDTA抗凝）',
    collectedAt: '2026-09-10T10:30:00',
    reportedAt: '2026-09-10T11:15:00',
    reportingDoctor: '检验师-黄',
    status: '已审核',
    hasCriticalValue: false,
    items: [
      {
        itemName: '白细胞计数（WBC）',
        result: '12.5',
        unit: '×10^9/L',
        referenceRange: '4.0-10.0',
        abnormalFlag: '偏高',
      },
      {
        itemName: '中性粒细胞百分比（NEUT%）',
        result: '85.3',
        unit: '%',
        referenceRange: '50.0-70.0',
        abnormalFlag: '偏高',
      },
      {
        itemName: '淋巴细胞百分比（LYMPH%）',
        result: '10.2',
        unit: '%',
        referenceRange: '20.0-40.0',
        abnormalFlag: '偏低',
      },
      {
        itemName: '血红蛋白（HGB）',
        result: '128',
        unit: 'g/L',
        referenceRange: '110-150',
        abnormalFlag: '正常',
      },
      {
        itemName: '血小板计数（PLT）',
        result: '298',
        unit: '×10^9/L',
        referenceRange: '100-300',
        abnormalFlag: '正常',
      },
      {
        itemName: 'C反应蛋白（CRP）',
        result: '85.6',
        unit: 'mg/L',
        referenceRange: '<10',
        abnormalFlag: '偏高',
      },
    ],
    reportNotes: '白细胞及中性粒细胞、CRP显著升高，提示细菌感染。',
  },
  {
    reportId: 'L20260914005',
    patientId: 'P2026090005',
    encounterId: 'E20260914006',
    testName: '急诊生化+凝血功能',
    testCategory: '生化',
    specimen: '静脉血',
    collectedAt: '2026-09-14T07:50:00',
    reportedAt: '2026-09-14T08:20:00',
    reportingDoctor: '检验师-黄',
    status: '已审核',
    hasCriticalValue: true,
    items: [
      {
        itemName: '葡萄糖（GLU）',
        result: '12.5',
        unit: 'mmol/L',
        referenceRange: '3.9-6.1',
        abnormalFlag: '偏高',
      },
      {
        itemName: '肌酐（Cr）',
        result: '105',
        unit: 'μmol/L',
        referenceRange: '44-133',
        abnormalFlag: '正常',
      },
      {
        itemName: '钾（K）',
        result: '4.8',
        unit: 'mmol/L',
        referenceRange: '3.5-5.5',
        abnormalFlag: '正常',
      },
      {
        itemName: '钠（Na）',
        result: '138',
        unit: 'mmol/L',
        referenceRange: '135-145',
        abnormalFlag: '正常',
      },
      {
        itemName: '凝血酶原时间（PT）',
        result: '13.5',
        unit: '秒',
        referenceRange: '11.0-14.0',
        abnormalFlag: '正常',
      },
      {
        itemName: '国际标准化比值（INR）',
        result: '1.15',
        unit: '',
        referenceRange: '0.8-1.2',
        abnormalFlag: '正常',
      },
      {
        itemName: '活化部分凝血活酶时间（APTT）',
        result: '32.5',
        unit: '秒',
        referenceRange: '25.0-35.0',
        abnormalFlag: '正常',
      },
      {
        itemName: '纤维蛋白原（FIB）',
        result: '3.8',
        unit: 'g/L',
        referenceRange: '2.0-4.0',
        abnormalFlag: '正常',
      },
    ],
    reportNotes: '血糖显著升高，结合患者糖尿病史，注意监测。凝血功能正常，无溶栓禁忌。',
  },
];

// ============================================================================
// 影像报告Mock数据
// ============================================================================

export interface MockImageReport {
  reportId: string;
  patientId: string;
  encounterId: string | null;
  examType: string;
  examSite: string;
  examDate: string;
  reportDate: string;
  modality: string;
  finding: string;
  diagnosis: string;
  reportingDoctor: string;
  reviewingDoctor: string | null;
  status: '初步报告' | '已审核' | '已补充' | '已更正';
  hasImages: boolean;
  dicomRef: string | null;
  keyFindings: string[];
}

export const MOCK_IMAGE_REPORTS: MockImageReport[] = [
  {
    reportId: 'I20260912001',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    examType: 'CT',
    examSite: '冠状动脉',
    examDate: '2026-09-12',
    reportDate: '2026-09-12',
    modality: 'CTA',
    finding:
      '冠状动脉CTA示：左冠状动脉前降支（LAD）近段可见混合性斑块，管腔狭窄约85%，中段可见钙化斑块，管腔狭窄约40%；左回旋支（LCX）近段可见软斑块，管腔狭窄约50%；右冠状动脉（RCA）中段可见钙化斑块，管腔狭窄约30%。左室壁厚度正常，心腔大小正常。',
    diagnosis:
      '1.冠状动脉粥样硬化性心脏病，前降支近段重度狭窄（85%），建议冠脉造影及介入治疗；2.左回旋支、右冠状动脉轻中度狭窄。',
    reportingDoctor: '放射科-吴医生',
    reviewingDoctor: '放射科-郑主任',
    status: '已审核',
    hasImages: true,
    dicomRef: 'DICOM/2026/09/12/P2026090001/CTA/1.2.840.113619',
    keyFindings: ['前降支近段狭窄85%', '左回旋支狭窄50%', '右冠状动脉狭窄30%'],
  },
  {
    reportId: 'I20260910002',
    patientId: 'P2026090002',
    encounterId: 'E20260910004',
    examType: 'CT',
    examSite: '胸部',
    examDate: '2026-09-10',
    reportDate: '2026-09-10',
    modality: 'HRCT',
    finding:
      '胸部高分辨率CT示：双肺透亮度增高，肺纹理稀疏、扭曲，符合肺气肿改变。右下肺后基底段可见斑片状高密度影，边界模糊，内可见支气管充气征，范围约4.5×3.2cm。双肺下叶可见散在纤维条索影。纵隔居中，心影增大，肺动脉主干增宽（直径约32mm）。双侧胸腔未见明显积液。',
    diagnosis:
      '1.右下肺炎症，建议治疗后复查；2.慢性阻塞性肺疾病（肺气肿型）；3.肺动脉高压征象，建议结合临床；4.双肺下叶纤维灶。',
    reportingDoctor: '放射科-吴医生',
    reviewingDoctor: '放射科-郑主任',
    status: '已审核',
    hasImages: true,
    dicomRef: 'DICOM/2026/09/10/P2026090002/HRCT/1.2.840.113619',
    keyFindings: ['右下肺斑片影4.5×3.2cm', '肺气肿', '肺动脉增宽'],
  },
  {
    reportId: 'I20260914003',
    patientId: 'P2026090005',
    encounterId: 'E20260914006',
    examType: 'MRI',
    examSite: '头颅',
    examDate: '2026-09-14',
    reportDate: '2026-09-14',
    modality: 'DWI+MRA',
    finding:
      '头颅MRI+DWI示：左侧基底节区及侧脑室旁可见片状DWI高信号，ADC低信号，范围约3.5×2.0cm，提示急性脑梗死。MRA示：左侧大脑中动脉M1段狭窄约70%，远端分支显影稍淡。余脑实质未见明显异常信号。脑室系统大小形态正常，中线结构居中。',
    diagnosis:
      '1.左侧基底节区急性脑梗死（左侧大脑中动脉供血区）；2.左侧大脑中动脉M1段狭窄（70%），建议进一步评估。',
    reportingDoctor: '放射科-吴医生',
    reviewingDoctor: null,
    status: '初步报告',
    hasImages: true,
    dicomRef: 'DICOM/2026/09/14/P2026090005/MRI/1.2.840.113619',
    keyFindings: ['左侧基底节区急性梗死灶3.5×2.0cm', '左侧大脑中动脉M1段狭窄70%'],
  },
  {
    reportId: 'I20260911004',
    patientId: 'P2026090003',
    encounterId: 'E20260911007',
    examType: 'X光',
    examSite: '上消化道钡餐',
    examDate: '2026-09-11',
    reportDate: '2026-09-11',
    modality: '钡餐造影',
    finding:
      '上消化道钡餐造影示：食管通畅，黏膜光滑，未见充盈缺损及龛影。胃呈钩型，胃窦部黏膜增粗、紊乱，可见散在钡斑，胃壁柔软，蠕动正常。十二指肠球部形态正常，未见龛影及变形。',
    diagnosis: '慢性胃炎（胃窦为主），建议胃镜检查及幽门螺杆菌检测。',
    reportingDoctor: '放射科-吴医生',
    reviewingDoctor: '放射科-郑主任',
    status: '已审核',
    hasImages: true,
    dicomRef: null,
    keyFindings: ['胃窦部黏膜增粗紊乱', '散在钡斑'],
  },
];

// ============================================================================
// 药物相互作用Mock数据
// ============================================================================

export interface MockDrugInteraction {
  drugA: string;
  drugB: string;
  interactionType: '药药相互作用' | '药病相互作用' | '药食相互作用' | '药检相互作用';
  severity: '禁忌' | '严重' | '中度' | '轻度';
  description: string;
  mechanism: string;
  clinicalEffect: string;
  suggestion: string;
  evidence: string;
}

export const MOCK_DRUG_INTERACTIONS: MockDrugInteraction[] = [
  {
    drugA: '阿司匹林',
    drugB: '氯吡格雷',
    interactionType: '药药相互作用',
    severity: '严重',
    description:
      '阿司匹林与氯吡格雷联用为双联抗血小板治疗，可显著增加出血风险，尤其是胃肠道出血和颅内出血。',
    mechanism:
      '两者分别通过抑制血栓素A2和P2Y12受体通路抑制血小板聚集，联用后血小板抑制作用叠加，凝血功能受损。',
    clinicalEffect: '出血风险增加2-3倍，常见胃肠道出血、牙龈出血、皮肤瘀斑，严重时可发生颅内出血。',
    suggestion:
      '双联抗血小板治疗仅限急性冠脉综合征和PCI术后，疗程通常12个月。治疗期间应监测出血征象，联用质子泵抑制剂（如奥美拉唑）预防胃肠道出血。定期复查血常规和便潜血。',
    evidence: '《中国经皮冠状动脉介入治疗指南（2023）》、ACC/AHA抗血小板治疗指南',
  },
  {
    drugA: '华法林',
    drugB: '阿司匹林',
    interactionType: '药药相互作用',
    severity: '禁忌',
    description: '华法林与阿司匹林联用属于禁忌，可导致严重出血甚至危及生命。',
    mechanism:
      '华法林抑制维生素K依赖性凝血因子合成，阿司匹林抑制血小板聚集，两者联用对凝血系统产生双重抑制，出血风险急剧增加。',
    clinicalEffect:
      '严重出血风险增加4-6倍，包括胃肠道大出血、颅内出血、腹膜后出血等，死亡率显著升高。',
    suggestion:
      '严禁常规联用。如确需抗凝+抗血小板治疗（如房颤合并急性冠脉综合征），应在专科医生严密监测下短期使用，INR控制在2.0-2.5，并联用质子泵抑制剂。优先考虑新型口服抗凝药（如利伐沙班）替代华法林。',
    evidence: '《心房颤动抗凝治疗中国专家共识》、RE-DUAL PCI研究',
  },
  {
    drugA: '头孢曲松',
    drugB: '含钙溶液',
    interactionType: '药药相互作用',
    severity: '禁忌',
    description:
      '头孢曲松与含钙溶液（包括林格液、乳酸林格液、含钙静脉营养液）混合可产生头孢曲松钙沉淀，导致严重不良反应。',
    mechanism:
      '头孢曲松阴离子与钙离子结合形成不溶性沉淀，可在肺和肾脏中沉积，导致新生儿和婴儿死亡。',
    clinicalEffect: '可引起肺栓塞、肾损害、弥散性血管内凝血，新生儿和婴儿中有致死性病例报告。',
    suggestion:
      '严禁将头孢曲松与含钙溶液混合或通过同一静脉通路输注，两者输注间隔应不少于48小时。新生儿（≤28天）禁用头孢曲松，尤其是高胆红素血症新生儿。',
    evidence: 'FDA黑框警告、头孢曲松说明书',
  },
  {
    drugA: '阿托伐他汀',
    drugB: '克拉霉素',
    interactionType: '药药相互作用',
    severity: '严重',
    description:
      '克拉霉素可显著抑制阿托伐他汀的代谢，导致血药浓度升高，增加横纹肌溶解和急性肾损伤风险。',
    mechanism:
      '克拉霉素为CYP3A4强抑制剂，阿托伐他汀主要经CYP3A4代谢，联用后阿托伐他汀血药浓度可升高4-5倍。',
    clinicalEffect: '肌痛、肌无力、肌酸激酶升高，严重时可发生横纹肌溶解、肌红蛋白尿、急性肾衰竭。',
    suggestion:
      '联用期间应暂停阿托伐他汀或减量至10mg以下，密切监测肌酸激酶和肾功能。可考虑换用不经CYP3A4代谢的他汀（如瑞舒伐他汀、普伐他汀）。',
    evidence: 'FDA药物安全通讯、《他汀类药物安全性评价专家共识》',
  },
  {
    drugA: '奥美拉唑',
    drugB: '氯吡格雷',
    interactionType: '药药相互作用',
    severity: '中度',
    description: '奥美拉唑可抑制氯吡格雷的活化，降低其抗血小板疗效，增加心血管事件风险。',
    mechanism:
      '氯吡格雷为前体药物，需经CYP2C19代谢活化。奥美拉唑为CYP2C19抑制剂，可竞争性抑制氯吡格雷的活化，降低活性代谢产物浓度。',
    clinicalEffect: '氯吡格雷抗血小板作用降低约40%，可能增加支架内血栓和心肌梗死风险。',
    suggestion:
      '如需联用质子泵抑制剂，优先选择对CYP2C19影响较小的泮托拉唑或雷贝拉唑。避免使用奥美拉唑和埃索美拉唑。',
    evidence: 'FDA药物安全通讯（2009）、《抗血小板治疗中国专家共识》',
  },
  {
    drugA: '二甲双胍',
    drugB: '碘造影剂',
    interactionType: '药检相互作用',
    severity: '严重',
    description: '使用碘造影剂前后服用二甲双胍可能增加乳酸性酸中毒风险，尤其是肾功能不全患者。',
    mechanism:
      '碘造影剂可引起造影剂肾病，导致肾功能急性下降，二甲双胍经肾脏排泄受阻，血药浓度升高，抑制线粒体呼吸链，导致乳酸蓄积。',
    clinicalEffect: '乳酸性酸中毒，表现为乏力、恶心、呕吐、腹痛、过度通气，严重时可致休克和死亡。',
    suggestion:
      'eGFR≥60患者：造影当天停用二甲双胍，造影后48小时复查肾功能正常后恢复；eGFR 30-60患者：造影前48小时停用，造影后48小时复查肾功能正常后恢复；eGFR<30患者禁用二甲双胍。',
    evidence: '《中国2型糖尿病防治指南（2024年版）》、造影剂相关指南',
  },
];

// ============================================================================
// 病历模板Mock数据
// ============================================================================

export interface MockTemplateField {
  fieldName: string;
  fieldType: 'text' | 'select' | 'date' | 'number' | 'table';
  required: boolean;
  options?: string[];
  placeholder: string;
}

export interface MockMedicalTemplate {
  templateId: string;
  name: string;
  recordType: string;
  scope: string;
  department: string | null;
  content: string;
  fields: MockTemplateField[];
  version: string;
  updatedAt: string;
}

export const MOCK_MEDICAL_TEMPLATES: MockMedicalTemplate[] = [
  {
    templateId: 'TPL-OP-001',
    name: '通用门诊病历模板',
    recordType: '门诊病历',
    scope: 'hospital',
    department: null,
    content: `主诉：[主诉]
现病史：[现病史，包括起病时间、主要症状、伴随症状、诊疗经过、一般情况]
既往史：[既往疾病史、手术史、外伤史、输血史、过敏史、预防接种史]
个人史及家族史：[个人史、婚育史、家族史]
体格检查：T [体温]℃，P [脉搏]次/分，R [呼吸]次/分，BP [血压]mmHg
一般情况：[神志、精神、面容]
皮肤黏膜：[颜色、皮疹、出血点]
淋巴结：[全身浅表淋巴结]
头部及其器官：[头颅、眼睑、结膜、瞳孔、耳鼻咽喉]
颈部：[柔软、抵抗、颈静脉、气管、甲状腺]
胸部：
  肺：[视诊、触诊、叩诊、听诊]
  心：[视诊、触诊、叩诊、听诊]
腹部：[视诊、触诊、叩诊、听诊]
肛门直肠及外生殖器：[按需检查]
脊柱四肢：[脊柱、四肢、关节]
神经系统：[生理反射、病理反射]
辅助检查：[相关检查结果]
初步诊断：[诊断1]；[诊断2]
处理意见：[治疗方案、用药、检查、随访建议]
医生签名：[医生姓名]`,
    fields: [
      {
        fieldName: 'chiefComplaint',
        fieldType: 'text',
        required: true,
        placeholder: '主诉（症状+持续时间）',
      },
      { fieldName: 'presentIllness', fieldType: 'text', required: true, placeholder: '现病史' },
      { fieldName: 'pastHistory', fieldType: 'text', required: true, placeholder: '既往史' },
      { fieldName: 'physicalExam', fieldType: 'text', required: true, placeholder: '体格检查' },
      { fieldName: 'diagnosis', fieldType: 'text', required: true, placeholder: '初步诊断' },
      { fieldName: 'treatment', fieldType: 'text', required: true, placeholder: '处理意见' },
    ],
    version: 'v2.1',
    updatedAt: '2026-06-01',
  },
  {
    templateId: 'TPL-AD-001',
    name: '入院记录模板',
    recordType: '入院记录',
    scope: 'hospital',
    department: null,
    content: `患者[姓名]，[性别]，[年龄]岁，因"[主诉]"于[入院日期]入院。
现病史：[详细描述起病情况、主要症状特点、伴随症状、诊疗经过、病情变化、一般情况]
既往史：[既往健康状况、疾病史、手术史、外伤史、输血史、过敏史、预防接种史]
个人史：[出生地、居住地、职业、烟酒嗜好、毒物接触史]
婚育史：[婚姻状况、生育情况、月经史（女性）]
家族史：[父母、兄弟姐妹健康状况，家族中类似疾病、遗传病史]
体格检查：
T [体温]℃，P [脉搏]次/分，R [呼吸]次/分，BP [血压]mmHg，身高[身高]cm，体重[体重]kg
一般情况：[发育、营养、神志、精神、面容、体位、查体合作度]
皮肤黏膜：[颜色、温度、湿度、弹性、皮疹、出血点、蜘蛛痣、肝掌]
淋巴结：[全身浅表淋巴结有无肿大]
头部及其器官：[头颅、眼睑、结膜、巩膜、瞳孔、耳鼻咽喉、口腔]
颈部：[柔软/抵抗、颈静脉、气管位置、甲状腺]
胸部：
  胸廓：[对称/畸形、呼吸动度]
  肺：[语颤、叩诊音、呼吸音、啰音、胸膜摩擦音]
  心：[心前区隆起、心尖搏动、震颤、心界、心率、心律、心音、杂音、心包摩擦音]
腹部：[视诊、触诊（压痛、反跳痛、包块、肝脾）、叩诊、听诊]
肛门直肠及外生殖器：[按需检查，未查注明]
脊柱四肢：[脊柱生理弯曲、活动度、四肢形态、关节、水肿、甲床]
神经系统：[意识、言语、颅神经、运动、感觉、反射、病理征]
辅助检查：[入院前及入院后重要检查结果，注明日期和检查机构]
初步诊断：[主要诊断]
  [次要诊断1]
  [次要诊断2]
诊断依据：[症状、体征、辅助检查依据]
鉴别诊断：[需鉴别的疾病及鉴别要点]
诊疗计划：1.[护理级别、饮食]；2.[完善检查]；3.[治疗方案]；4.[病情监测]
记录者：[住院医师]
审签者：[上级医师]`,
    fields: [
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      {
        fieldName: 'presentIllness',
        fieldType: 'text',
        required: true,
        placeholder: '现病史（不少于300字）',
      },
      { fieldName: 'pastHistory', fieldType: 'text', required: true, placeholder: '既往史' },
      { fieldName: 'personalHistory', fieldType: 'text', required: false, placeholder: '个人史' },
      { fieldName: 'familyHistory', fieldType: 'text', required: false, placeholder: '家族史' },
      {
        fieldName: 'physicalExam',
        fieldType: 'text',
        required: true,
        placeholder: '体格检查（系统完整）',
      },
      { fieldName: 'auxiliaryExam', fieldType: 'text', required: true, placeholder: '辅助检查' },
      { fieldName: 'diagnosis', fieldType: 'text', required: true, placeholder: '初步诊断' },
      { fieldName: 'diagnosticBasis', fieldType: 'text', required: true, placeholder: '诊断依据' },
      {
        fieldName: 'differentialDiagnosis',
        fieldType: 'text',
        required: false,
        placeholder: '鉴别诊断',
      },
      { fieldName: 'treatmentPlan', fieldType: 'text', required: true, placeholder: '诊疗计划' },
    ],
    version: 'v3.0',
    updatedAt: '2026-05-15',
  },
  {
    templateId: 'TPL-PN-001',
    name: '首次病程记录模板',
    recordType: '病程记录',
    scope: 'hospital',
    department: null,
    content: `[日期时间] 首次病程记录
病例特点：
1.患者[姓名]，[性别]，[年龄]岁，[职业]。因"[主诉]"入院。
2.病史要点：[简要病史]
3.体格检查：T [体温]，P [脉搏]，R [呼吸]，BP [血压]。[阳性体征和重要阴性体征]
4.辅助检查：[重要检查结果]
拟诊讨论：
（一）初步诊断：[诊断]
（二）诊断依据：1.[症状]；2.[体征]；3.[辅助检查]
（三）鉴别诊断：
1.[疾病1]：[鉴别要点]
2.[疾病2]：[鉴别要点]
诊疗计划：
1.[护理级别、饮食]
2.[完善检查项目]
3.[治疗方案，包括药物、手术、监护等]
4.[病情监测要点]
5.[健康教育及注意事项]
医师签名：[医师姓名]`,
    fields: [
      { fieldName: 'caseFeatures', fieldType: 'text', required: true, placeholder: '病例特点' },
      { fieldName: 'diagnosis', fieldType: 'text', required: true, placeholder: '初步诊断' },
      { fieldName: 'diagnosticBasis', fieldType: 'text', required: true, placeholder: '诊断依据' },
      {
        fieldName: 'differentialDiagnosis',
        fieldType: 'text',
        required: true,
        placeholder: '鉴别诊断',
      },
      { fieldName: 'treatmentPlan', fieldType: 'text', required: true, placeholder: '诊疗计划' },
    ],
    version: 'v2.0',
    updatedAt: '2026-04-20',
  },
  {
    templateId: 'TPL-DS-001',
    name: '出院小结模板',
    recordType: '出院小结',
    scope: 'hospital',
    department: null,
    content: `入院日期：[入院日期]
出院日期：[出院日期]
住院天数：[天数]天
入院诊断：[入院诊断]
出院诊断：[出院诊断，按主次排列]
入院情况：[入院时主要症状、体征、辅助检查]
诊疗经过：[住院期间主要检查、治疗、手术情况，病情变化]
出院情况：[出院时症状、体征、重要检查结果]
出院医嘱：
1.休息与活动：[建议]
2.饮食：[饮食建议]
3.用药：[药品名称、剂量、用法、疗程]
4.复诊：[复诊时间、科室、注意事项]
5.其他：[特殊注意事项、健康教育]
主管医师：[医师姓名]
主任医师：[主任姓名]`,
    fields: [
      {
        fieldName: 'admissionDiagnosis',
        fieldType: 'text',
        required: true,
        placeholder: '入院诊断',
      },
      {
        fieldName: 'dischargeDiagnosis',
        fieldType: 'text',
        required: true,
        placeholder: '出院诊断',
      },
      {
        fieldName: 'admissionCondition',
        fieldType: 'text',
        required: true,
        placeholder: '入院情况',
      },
      { fieldName: 'treatmentCourse', fieldType: 'text', required: true, placeholder: '诊疗经过' },
      {
        fieldName: 'dischargeCondition',
        fieldType: 'text',
        required: true,
        placeholder: '出院情况',
      },
      { fieldName: 'dischargeOrders', fieldType: 'text', required: true, placeholder: '出院医嘱' },
    ],
    version: 'v2.2',
    updatedAt: '2026-07-10',
  },
];
