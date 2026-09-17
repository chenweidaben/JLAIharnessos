/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 产品演示页 Mock 数据：功能模块 / 场景 / 患者360 / 对话 / 图表 / 公司信息
 * 说明：本文件全部为前端演示用模拟数据，患者信息均已脱敏，不涉及真实隐私。
 */

/* -------------------------------------------------------------------------- */
/* 通用类型                                                                    */
/* -------------------------------------------------------------------------- */

/** 功能模块 */
export interface DemoFeature {
  key: string;
  icon: string;
  title: string;
  summary: string;
  points: string[];
  metric?: { label: string; value: string };
}

/** 应用场景 */
export interface DemoScenario {
  key: string;
  icon: string;
  title: string;
  tagline: string;
  description: string;
  steps: string[];
  highlights: string[];
  cta: string;
  route: string;
}

/* -------------------------------------------------------------------------- */
/* 产品首页：核心指标                                                           */
/* -------------------------------------------------------------------------- */

export interface HomeStat {
  label: string;
  value: number;
  suffix: string;
  decimals?: number;
  description: string;
}

export const homeStats: HomeStat[] = [
  {
    label: '内置医疗工具',
    value: 36,
    suffix: '个',
    description: '覆盖问诊、检查、处方、质控全链路',
  },
  { label: 'CDS 规则', value: 37, suffix: '条', description: '药物相互作用 / 危急值 / 诊疗规范' },
  { label: '科室子代理', value: 8, suffix: '个', description: '内科、外科、急诊、ICU 等专科能力' },
  {
    label: '系统可用性',
    value: 99.9,
    suffix: '%',
    decimals: 1,
    description: '全年 SLA 保障，7×24 小时稳定运行',
  },
];

/* -------------------------------------------------------------------------- */
/* 核心功能模块                                                                */
/* -------------------------------------------------------------------------- */

export const coreFeatures: DemoFeature[] = [
  {
    key: 'consult',
    icon: 'MessageOutlined',
    title: '智能问诊',
    summary: 'AI 辅助医生完成病史采集与结构化问诊，自动生成现病史与诊断建议。',
    points: [
      'AI 辅助问诊与智能追问',
      '结构化现病史自动生成',
      '鉴别诊断与诊断建议',
      '主诉 / 现病史 / 既往史一体化',
    ],
  },
  {
    key: 'cds',
    icon: 'SafetyCertificateOutlined',
    title: 'CDS 临床决策支持',
    summary: '37 条临床规则实时拦截，用药安全与诊疗规范双重护航。',
    points: [
      '37 条内置 CDS 规则',
      '药物相互作用实时校验',
      '危急值与高危用药提醒',
      '诊疗规范与指南引用',
    ],
    metric: { label: '规则覆盖率', value: '98%' },
  },
  {
    key: 'patient360',
    icon: 'IdcardOutlined',
    title: '患者 360 视图',
    summary: '全维度患者数据聚合，时间轴串联就诊、检验、检查、用药全轨迹。',
    points: ['全维度患者数据聚合', '就诊时间轴与趋势图', '异常值与危急值高亮', '跨科室数据互通'],
  },
  {
    key: 'quality',
    icon: 'FileDoneOutlined',
    title: '质控管理',
    summary: '病历全量智能批阅，自动缺陷标记与质控评分，闭环整改。',
    points: ['运行 / 终末病历质控', '病案首页智能审核', '核心制度执行检查', '质控报表与整改闭环'],
  },
  {
    key: 'operation',
    icon: 'BarChartOutlined',
    title: '运营分析',
    summary: '面向管理者的科室运营、DRG/DIP 与质量指标分析看板。',
    points: ['科室负载与运营分析', 'DRG / DIP 盈亏分析', '医疗质量指标监测', '人员设备效能评估'],
  },
  {
    key: 'integration',
    icon: 'ApiOutlined',
    title: '系统集成',
    summary: '标准化适配器无缝接入 HIS / EMR / LIS / PACS，即插即用。',
    points: [
      'HIS / EMR / LIS / PACS 适配',
      'HL7 v2.x / FHIR R4 / DICOM',
      '企业消息总线',
      '主流厂商开箱即用骨架',
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* 应用场景                                                                    */
/* -------------------------------------------------------------------------- */

export const scenarios: DemoScenario[] = [
  {
    key: 'outpatient',
    icon: 'EnvironmentOutlined',
    title: '门诊问诊场景',
    tagline: '效率提升，让医生专注诊疗本身',
    description:
      '从患者候诊到完成处方与病历，AI 助理全程辅助：智能预问诊采集病史，医生接诊时现病史已结构化生成，诊断建议与 CDS 规则实时校验，处方开具一步到位。',
    steps: ['候诊', 'AI 预问诊', '接诊问诊', '诊断建议', '处方开具', '病历生成'],
    highlights: ['预问诊病史自动带入', '诊断鉴别一键推荐', '处方安全实时拦截', '门诊病历自动成稿'],
    cta: '体验门诊工作台',
    route: '/outpatient',
  },
  {
    key: 'ward',
    icon: 'HomeOutlined',
    title: '住院查房场景',
    tagline: '查房清单化，病情评估数据化',
    description:
      '病区概览一屏掌握全员状态，查房清单按风险排序，查房记录语音转写自动成稿，医嘱调整与病情评估全程留痕。',
    steps: ['病区概览', '查房列表', '查房记录', '医嘱调整', '病情评估'],
    highlights: [
      '按风险等级排序查房',
      '语音转写查房记录',
      '医嘱变更前后对比',
      '出入院评估智能生成',
    ],
    cta: '进入住院工作台',
    route: '/ward',
  },
  {
    key: 'emergency',
    icon: 'AlertOutlined',
    title: '急诊分诊场景',
    tagline: '四级分诊，秒级识别危重',
    description: '急诊分诊台智能评级，四级分诊标准自动匹配，绿色通道一键触发，抢救与留观全程闭环。',
    steps: ['分诊台登记', '四级智能分诊', '绿色通道', '抢救室处置', '留观交接'],
    highlights: ['智能四级分诊评级', '危急值自动预警', '绿色通道一键触发', '抢救记录实时同步'],
    cta: '查看急诊演示',
    route: '/emergency',
  },
  {
    key: 'quality',
    icon: 'AuditOutlined',
    title: '质控管理场景',
    tagline: '智能批阅，缺陷无处遁形',
    description: '质控任务自动派发，病历智能批阅与缺陷标记，质控评分量化，整改反馈形成闭环。',
    steps: ['质控任务派发', '病历智能批阅', '缺陷标记', '质控评分', '整改反馈'],
    highlights: ['运行病历实时质控', '缺陷自动定位', '质控评分量化', '整改通知闭环跟踪'],
    cta: '体验质控工作台',
    route: '/quality',
  },
];

/* -------------------------------------------------------------------------- */
/* 技术栈展示                                                                  */
/* -------------------------------------------------------------------------- */

export interface TechStackGroup {
  category: string;
  items: string[];
}

export const techStackGroups: TechStackGroup[] = [
  {
    category: '前端',
    items: [
      'React 19',
      'TypeScript',
      'Vite',
      'Ant Design 5',
      'Zustand',
      'ECharts 5',
      'Tailwind CSS',
    ],
  },
  { category: '后端', items: ['TypeScript 6', 'Bun 1.3', 'Hono', 'Zod', 'Node 22 LTS'] },
  {
    category: 'AI 能力',
    items: ['Anthropic Claude', '多 Agent 编排', 'RAG 检索', 'CDS 引擎', '工具调用'],
  },
  { category: '数据', items: ['PostgreSQL', 'pgvector', 'Redis', 'Kafka'] },
  { category: '集成标准', items: ['HL7 v2.x', 'FHIR R4', 'DICOM', '消息总线'] },
  { category: '运维', items: ['Docker', 'Kubernetes', 'Prometheus', 'Grafana'] },
];

export const securityItems: string[] = [
  '网络安全等级保护三级',
  '传输与存储加密 AES-256',
  'RBAC + ABAC 细粒度权限',
  '全链路审计日志',
  '16 种数据脱敏策略',
  'Prompt 注入与越权防护',
];

export const performanceItems: { label: string; value: string }[] = [
  { label: '工具响应 P95', value: '< 100ms' },
  { label: 'Agent 单轮（流式）', value: '< 5s' },
  { label: '系统可用性', value: '99.9%' },
  { label: '并发支持', value: '100+ 用户' },
];

/* -------------------------------------------------------------------------- */
/* 客户评价                                                                    */
/* -------------------------------------------------------------------------- */

export interface Testimonial {
  hospital: string;
  name: string;
  title: string;
  content: string;
}

export const testimonials: Testimonial[] = [
  {
    hospital: '某三甲综合医院',
    name: '王主任',
    title: '医务部主任',
    content:
      '健澜数智医院智能体上线后，门诊医生平均问诊时间缩短了约两成，病历质控缺陷率明显下降，医生终于把时间还给了患者。',
  },
  {
    hospital: '某区域医疗集团',
    name: '李院长',
    title: '分管信息化副院长',
    content:
      '患者 360 视图把分散在各个系统的数据真正聚合到了一起，跨科室协同一屏可见，这是我们多年想做而没做成的事。',
  },
  {
    hospital: '某三级专科医院',
    name: '张信息科',
    title: '信息中心主任',
    content:
      '标准化的集成适配器让对接 HIS 的工作量下降了一大半，安全合规能力也直接对标等保三级，交付非常省心。',
  },
];

/* -------------------------------------------------------------------------- */
/* 患者 360 Mock 数据（脱敏）                                                   */
/* -------------------------------------------------------------------------- */

export type LabStatus = 'critical' | 'abnormal' | 'normal';

export interface VitalPoint {
  time: string;
  value: number;
}

export interface LabCategory {
  category: string;
  items: { name: string; value: string; unit: string; ref: string; status: LabStatus }[];
}

export interface MedicationOrder {
  name: string;
  dosage: string;
  frequency: string;
  type: '长期' | '临时';
  start: string;
}

export interface Patient360 {
  id: string;
  name: string;
  gender: '男' | '女';
  age: number;
  inpatientNo: string;
  department: string;
  bed: string;
  diagnosis: string;
  allergies: string[];
  admitDate: string;
  overview: { label: string; value: string; status?: LabStatus }[];
  vitals: {
    times: string[];
    temperature: number[];
    pulse: number[];
    respiration: number[];
    systolic: number[];
    diastolic: number[];
    spo2: number[];
  };
  labs: LabCategory[];
  reports: {
    date: string;
    modality: string;
    body: string;
    conclusion: string;
    abnormal: boolean;
  }[];
  medications: MedicationOrder[];
  records: { date: string; type: string; title: string; snippet: string }[];
  fees: { total: number; categories: { name: string; value: number }[] };
}

export const patients360: Patient360[] = [
  {
    id: 'P001',
    name: '*国强',
    gender: '男',
    age: 62,
    inpatientNo: 'ZY20260912001',
    department: '心血管内科',
    bed: '心内-12床',
    diagnosis: '冠状动脉粥样硬化性心脏病',
    allergies: ['青霉素'],
    admitDate: '2026-09-12',
    overview: [
      { label: '体温', value: '36.8℃', status: 'normal' },
      { label: '心率', value: '78 次/分', status: 'normal' },
      { label: '血压', value: '148/92 mmHg', status: 'abnormal' },
      { label: '血氧饱和度', value: '97%', status: 'normal' },
      { label: '肌钙蛋白 I', value: '0.12 ng/mL', status: 'abnormal' },
      { label: '当前用药', value: '5 种' },
    ],
    vitals: {
      times: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      temperature: [36.6, 36.8, 36.9, 37.1, 36.9, 36.7],
      pulse: [72, 78, 80, 84, 79, 75],
      respiration: [18, 18, 19, 20, 18, 17],
      systolic: [142, 148, 152, 150, 146, 144],
      diastolic: [90, 92, 95, 94, 91, 89],
      spo2: [98, 97, 96, 96, 97, 98],
    },
    labs: [
      {
        category: '心肌标志物',
        items: [
          { name: '肌钙蛋白 I', value: '0.12', unit: 'ng/mL', ref: '<0.04', status: 'abnormal' },
          { name: '肌酸激酶同工酶', value: '28', unit: 'U/L', ref: '<25', status: 'abnormal' },
          { name: 'B 型利钠肽', value: '486', unit: 'pg/mL', ref: '<100', status: 'critical' },
        ],
      },
      {
        category: '血常规',
        items: [
          { name: '白细胞计数', value: '6.8', unit: '×10⁹/L', ref: '3.5-9.5', status: 'normal' },
          { name: '血红蛋白', value: '132', unit: 'g/L', ref: '130-175', status: 'normal' },
          { name: '血小板计数', value: '210', unit: '×10⁹/L', ref: '125-350', status: 'normal' },
        ],
      },
      {
        category: '生化',
        items: [
          { name: '空腹血糖', value: '6.4', unit: 'mmol/L', ref: '3.9-6.1', status: 'abnormal' },
          { name: '肌酐', value: '78', unit: 'μmol/L', ref: '57-111', status: 'normal' },
          { name: '总胆固醇', value: '6.2', unit: 'mmol/L', ref: '<5.2', status: 'abnormal' },
        ],
      },
    ],
    reports: [
      {
        date: '2026-09-13',
        modality: '冠脉 CTA',
        body: '冠状动脉',
        conclusion: '左前降支近段狭窄约 65%',
        abnormal: true,
      },
      {
        date: '2026-09-12',
        modality: '心脏超声',
        body: '心脏',
        conclusion: '左室舒张功能减退，EF 58%',
        abnormal: true,
      },
      {
        date: '2026-09-12',
        modality: '胸部 DR',
        body: '胸部',
        conclusion: '两肺纹理清晰，未见明显实变',
        abnormal: false,
      },
    ],
    medications: [
      {
        name: '阿司匹林肠溶片',
        dosage: '100mg',
        frequency: '每日一次',
        type: '长期',
        start: '2026-09-12',
      },
      {
        name: '阿托伐他汀钙片',
        dosage: '20mg',
        frequency: '每晚一次',
        type: '长期',
        start: '2026-09-12',
      },
      {
        name: '美托洛尔缓释片',
        dosage: '47.5mg',
        frequency: '每日一次',
        type: '长期',
        start: '2026-09-13',
      },
      {
        name: '单硝酸异山梨酯',
        dosage: '20mg',
        frequency: '每日两次',
        type: '长期',
        start: '2026-09-13',
      },
      {
        name: '低分子肝素钠',
        dosage: '4000IU',
        frequency: '皮下注射 每日一次',
        type: '临时',
        start: '2026-09-14',
      },
    ],
    records: [
      {
        date: '2026-09-12',
        type: '入院记录',
        title: '入院记录',
        snippet: '患者因"反复胸闷胸痛 3 年，加重 1 天"入院……',
      },
      {
        date: '2026-09-13',
        type: '病程记录',
        title: '首次病程记录',
        snippet: '结合病史、心电图及心肌标志物，考虑不稳定型心绞痛……',
      },
      {
        date: '2026-09-14',
        type: '病程记录',
        title: '主任查房记录',
        snippet: '今日主任查房，建议完善冠脉 CTA，继续目前抗栓调脂治疗……',
      },
    ],
    fees: {
      total: 18642.5,
      categories: [
        { name: '药品费', value: 7820 },
        { name: '检查费', value: 5240 },
        { name: '治疗费', value: 3680 },
        { name: '耗材费', value: 1560 },
        { name: '其他', value: 342.5 },
      ],
    },
  },
  {
    id: 'P002',
    name: '*丽',
    gender: '女',
    age: 45,
    inpatientNo: 'ZY20260913002',
    department: '内分泌科',
    bed: '内分泌-08床',
    diagnosis: '2 型糖尿病',
    allergies: ['磺胺类'],
    admitDate: '2026-09-13',
    overview: [
      { label: '体温', value: '36.5℃', status: 'normal' },
      { label: '心率', value: '82 次/分', status: 'normal' },
      { label: '血压', value: '128/80 mmHg', status: 'normal' },
      { label: '空腹血糖', value: '9.8 mmol/L', status: 'critical' },
      { label: '糖化血红蛋白', value: '8.6%', status: 'abnormal' },
      { label: '当前用药', value: '3 种' },
    ],
    vitals: {
      times: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      temperature: [36.4, 36.5, 36.6, 36.5, 36.4, 36.5],
      pulse: [78, 82, 85, 88, 83, 80],
      respiration: [16, 17, 18, 18, 17, 16],
      systolic: [126, 128, 130, 129, 127, 125],
      diastolic: [79, 80, 82, 81, 80, 78],
      spo2: [99, 98, 98, 97, 98, 99],
    },
    labs: [
      {
        category: '糖代谢',
        items: [
          { name: '空腹血糖', value: '9.8', unit: 'mmol/L', ref: '3.9-6.1', status: 'critical' },
          { name: '餐后 2h 血糖', value: '13.6', unit: 'mmol/L', ref: '<7.8', status: 'critical' },
          { name: '糖化血红蛋白', value: '8.6', unit: '%', ref: '<6.5', status: 'abnormal' },
        ],
      },
      {
        category: '生化',
        items: [
          { name: '肌酐', value: '62', unit: 'μmol/L', ref: '41-81', status: 'normal' },
          { name: '谷丙转氨酶', value: '24', unit: 'U/L', ref: '7-40', status: 'normal' },
        ],
      },
    ],
    reports: [
      {
        date: '2026-09-13',
        modality: '眼底照相',
        body: '双眼眼底',
        conclusion: '未见明显糖尿病视网膜病变',
        abnormal: false,
      },
    ],
    medications: [
      {
        name: '二甲双胍缓释片',
        dosage: '0.5g',
        frequency: '每日两次',
        type: '长期',
        start: '2026-09-13',
      },
      {
        name: '甘精胰岛素',
        dosage: '12IU',
        frequency: '睡前皮下注射',
        type: '长期',
        start: '2026-09-14',
      },
      {
        name: '甲钴胺片',
        dosage: '0.5mg',
        frequency: '每日三次',
        type: '长期',
        start: '2026-09-14',
      },
    ],
    records: [
      {
        date: '2026-09-13',
        type: '入院记录',
        title: '入院记录',
        snippet: '患者发现血糖升高 5 年，本次因血糖控制不佳入院……',
      },
      {
        date: '2026-09-14',
        type: '病程记录',
        title: '首次病程记录',
        snippet: '入院后监测血糖谱，调整降糖方案……',
      },
    ],
    fees: {
      total: 9860,
      categories: [
        { name: '药品费', value: 3200 },
        { name: '检查费', value: 3900 },
        { name: '治疗费', value: 2100 },
        { name: '耗材费', value: 560 },
        { name: '其他', value: 100 },
      ],
    },
  },
  {
    id: 'P003',
    name: '*伟',
    gender: '男',
    age: 35,
    inpatientNo: 'ZY20260914005',
    department: '呼吸与危重症医学科',
    bed: '呼吸-21床',
    diagnosis: '社区获得性肺炎',
    allergies: ['无'],
    admitDate: '2026-09-14',
    overview: [
      { label: '体温', value: '38.9℃', status: 'critical' },
      { label: '心率', value: '96 次/分', status: 'abnormal' },
      { label: '血压', value: '118/76 mmHg', status: 'normal' },
      { label: '血氧饱和度', value: '93%', status: 'abnormal' },
      { label: 'C 反应蛋白', value: '86 mg/L', status: 'critical' },
      { label: '当前用药', value: '4 种' },
    ],
    vitals: {
      times: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      temperature: [38.9, 38.6, 38.2, 37.9, 37.5, 37.1],
      pulse: [96, 92, 88, 84, 80, 78],
      respiration: [22, 21, 20, 19, 18, 17],
      systolic: [118, 120, 119, 117, 116, 115],
      diastolic: [76, 78, 77, 76, 75, 74],
      spo2: [93, 94, 95, 96, 97, 98],
    },
    labs: [
      {
        category: '炎症指标',
        items: [
          { name: 'C 反应蛋白', value: '86', unit: 'mg/L', ref: '<10', status: 'critical' },
          { name: '降钙素原', value: '0.82', unit: 'ng/mL', ref: '<0.1', status: 'abnormal' },
          { name: '白细胞计数', value: '12.4', unit: '×10⁹/L', ref: '3.5-9.5', status: 'abnormal' },
        ],
      },
    ],
    reports: [
      {
        date: '2026-09-14',
        modality: '胸部 CT',
        body: '胸部',
        conclusion: '右肺下叶斑片影，考虑炎症',
        abnormal: true,
      },
    ],
    medications: [
      {
        name: '莫西沙星注射液',
        dosage: '0.4g',
        frequency: '每日一次',
        type: '长期',
        start: '2026-09-14',
      },
      {
        name: '氨溴索注射液',
        dosage: '30mg',
        frequency: '每日两次',
        type: '长期',
        start: '2026-09-14',
      },
      {
        name: '对乙酰氨基酚',
        dosage: '0.5g',
        frequency: '必要时',
        type: '临时',
        start: '2026-09-14',
      },
      {
        name: '雾化吸入治疗',
        dosage: '1 次',
        frequency: '每日两次',
        type: '长期',
        start: '2026-09-14',
      },
    ],
    records: [
      {
        date: '2026-09-14',
        type: '入院记录',
        title: '入院记录',
        snippet: '患者"发热、咳嗽、咳痰 3 天"入院……',
      },
    ],
    fees: {
      total: 6420,
      categories: [
        { name: '药品费', value: 2800 },
        { name: '检查费', value: 1900 },
        { name: '治疗费', value: 1300 },
        { name: '耗材费', value: 300 },
        { name: '其他', value: 120 },
      ],
    },
  },
  {
    id: 'P004',
    name: '*芳',
    gender: '女',
    age: 58,
    inpatientNo: 'ZY20260911008',
    department: '消化内科',
    bed: '消化-05床',
    diagnosis: '慢性胃炎',
    allergies: ['无'],
    admitDate: '2026-09-11',
    overview: [
      { label: '体温', value: '36.6℃', status: 'normal' },
      { label: '心率', value: '74 次/分', status: 'normal' },
      { label: '血压', value: '132/84 mmHg', status: 'normal' },
      { label: '血氧饱和度', value: '98%', status: 'normal' },
      { label: '幽门螺杆菌', value: '阳性', status: 'abnormal' },
      { label: '当前用药', value: '2 种' },
    ],
    vitals: {
      times: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      temperature: [36.5, 36.6, 36.7, 36.6, 36.5, 36.6],
      pulse: [72, 74, 76, 75, 73, 72],
      respiration: [16, 16, 17, 16, 16, 15],
      systolic: [130, 132, 134, 133, 131, 130],
      diastolic: [82, 84, 85, 84, 83, 82],
      spo2: [98, 98, 97, 98, 98, 99],
    },
    labs: [
      {
        category: '胃肠相关',
        items: [
          { name: '幽门螺杆菌检测', value: '阳性', unit: '-', ref: '阴性', status: 'abnormal' },
          { name: '胃蛋白酶原 I', value: '56', unit: 'ng/mL', ref: '70-240', status: 'abnormal' },
        ],
      },
    ],
    reports: [
      {
        date: '2026-09-12',
        modality: '胃镜',
        body: '胃部',
        conclusion: '慢性非萎缩性胃炎，HP 阳性',
        abnormal: true,
      },
    ],
    medications: [
      {
        name: '艾司奥美拉唑',
        dosage: '20mg',
        frequency: '每日两次',
        type: '长期',
        start: '2026-09-12',
      },
      {
        name: '枸橼酸铋钾',
        dosage: '220mg',
        frequency: '每日两次',
        type: '长期',
        start: '2026-09-12',
      },
    ],
    records: [
      {
        date: '2026-09-11',
        type: '入院记录',
        title: '入院记录',
        snippet: '患者"反复上腹不适 1 年"入院……',
      },
      {
        date: '2026-09-12',
        type: '病程记录',
        title: '胃镜后病程',
        snippet: '今日胃镜回报慢性非萎缩性胃炎，HP 阳性……',
      },
    ],
    fees: {
      total: 7280,
      categories: [
        { name: '药品费', value: 1900 },
        { name: '检查费', value: 4200 },
        { name: '治疗费', value: 800 },
        { name: '耗材费', value: 280 },
        { name: '其他', value: 100 },
      ],
    },
  },
];

/* -------------------------------------------------------------------------- */
/* 智能对话 Demo Mock                                                          */
/* -------------------------------------------------------------------------- */

export interface ToolCallStep {
  tool: string;
  args: string;
  result: string;
  duration: string;
}

export interface ChatScript {
  question: string;
  thinking: string;
  toolCalls: ToolCallStep[];
  answer: string;
}

export const chatQuickQuestions: string[] = [
  '帮我分析患者 *国强 的检验结果',
  '为高血压患者开具阿司匹林处方需要注意什么？',
  '查询高血压诊疗最新指南要点',
  '今天心内科还有哪些危急值待处理？',
];

export const chatScripts: Record<string, ChatScript> = {
  检验: {
    question: '帮我分析患者 *国强 的检验结果',
    thinking: '需要先检索该患者近 30 天的检验报告，再结合诊断进行异常解读。',
    toolCalls: [
      {
        tool: 'get_patient_labs',
        args: '{ patientId: "P001", days: 30 }',
        result: '返回 3 大类 9 项检验结果',
        duration: '86ms',
      },
      {
        tool: 'get_diagnosis',
        args: '{ patientId: "P001" }',
        result: '冠脉粥样硬化性心脏病',
        duration: '42ms',
      },
    ],
    answer:
      '患者 *国强（P001）今日检验结果分析如下：\n\n1. **心肌标志物**：B 型利钠肽 486 pg/mL（危急值，参考 <100），提示心功能负荷较重；肌钙蛋白 I 0.12 ng/mL、CK-MB 28 U/L 轻度升高，需动态复查。\n2. **生化**：空腹血糖 6.4 mmol/L、总胆固醇 6.2 mmol/L 偏高，建议加做糖化血红蛋白并强化降脂。\n3. **血常规**：白细胞、血红蛋白、血小板均在正常范围。\n\n建议：结合今日胸闷症状，密切监测肌钙蛋白动态变化，按不稳定型心绞痛路径继续抗栓、调脂、抗心衰治疗。',
  },
  处方: {
    question: '为高血压患者开具阿司匹林处方需要注意什么？',
    thinking: '需要查询 CDS 规则库，检索阿司匹林的禁忌与相互作用规则。',
    toolCalls: [
      {
        tool: 'cds_check_drug',
        args: '{ drug: "阿司匹林", indication: "高血压" }',
        result: '命中 3 条规则',
        duration: '64ms',
      },
      {
        tool: 'get_guideline',
        args: '{ topic: "高血压 抗血小板" }',
        result: '返回指南摘要',
        duration: '120ms',
      },
    ],
    answer:
      '开具阿司匹林处方时，CDS 已为您拦截并提示以下要点：\n\n- **禁忌提醒**：活动性出血、消化道溃疡活动期、阿司匹林过敏史患者禁用。\n- **相互作用**：与华法林、氯吡格雷联用显著增加出血风险；与 NSAIDs 合用增加胃肠道损伤。\n- **剂量建议**：一级预防 75-100mg/日，长期使用建议肠溶片餐后服用。\n- **监测**：用药期间关注黑便、牙龈出血等出血倾向，必要时联用 PPI。\n\n患者 *国强 既往无出血史，当前已在用阿司匹林 100mg qd，可继续。',
  },
  指南: {
    question: '查询高血压诊疗最新指南要点',
    thinking: '通过 RAG 检索知识库中高血压诊疗指南相关条目。',
    toolCalls: [
      {
        tool: 'rag_search',
        args: '{ query: "高血压诊疗指南 2024", topK: 5 }',
        result: '命中 5 条权威文献',
        duration: '158ms',
      },
    ],
    answer:
      '为您梳理最新高血压诊疗指南要点（演示数据）：\n\n1. **诊断标准**：非同日三次诊室血压 ≥140/90 mmHg 即可诊断。\n2. **分层管理**：根据心血管风险分层决定启动时机，高危患者立即启动药物治疗。\n3. **一线用药**：CCB、ACEI/ARB、噻嗪类利尿剂、β 受体阻滞剂四类，优先长效制剂。\n4. **目标值**：一般患者 <140/90 mmHg，能耐受者可降至 <130/80 mmHg。\n5. **生活方式**：限盐 <5g/日、控体重、戒烟限酒、规律运动。',
  },
  危急值: {
    question: '今天心内科还有哪些危急值待处理？',
    thinking: '查询今日心内科病区的危急值告警队列。',
    toolCalls: [
      {
        tool: 'list_critical_alerts',
        args: '{ dept: "心血管内科", date: "today" }',
        result: '2 条待处理',
        duration: '73ms',
      },
    ],
    answer:
      '今日心血管内科共有 **2 条危急值待处理**：\n\n1. ***国强（心内-12床）**：B 型利钠肽 486 pg/mL（危急），已提醒主管医生。\n2. ***军（心内-07床）**：血钾 2.9 mmol/L（危急），建议立即补钾并复查电解质。\n\n是否需要我为您生成对应的处理建议与记录草稿？',
  },
};

/* -------------------------------------------------------------------------- */
/* 数据可视化 Demo Mock（8 图）                                                */
/* -------------------------------------------------------------------------- */

export const dataDashboardStats = [
  { label: '今日门诊就诊量', value: 1286, suffix: '人次', trend: '+8.2%' },
  { label: '当前在院人数', value: 864, suffix: '人', trend: '+1.5%' },
  { label: '今日手术台次', value: 42, suffix: '台', trend: '+4.8%' },
  { label: '平均住院日', value: 7.8, suffix: '天', decimals: 1, trend: '-0.3' },
];

/** 1. 就诊量趋势（近30天） */
export const visitTrendData = (() => {
  const days: string[] = [];
  const outpatient: number[] = [];
  const inpatient: number[] = [];
  const emergency: number[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(`${i === 0 ? '今天' : i + '天前'}`);
    const base = 1100 + Math.round(Math.sin(i / 3) * 120);
    outpatient.push(base + Math.round(i % 7 === 0 || i % 7 === 6 ? -180 : 0));
    inpatient.push(420 + Math.round(Math.cos(i / 4) * 40));
    emergency.push(180 + Math.round(Math.sin(i / 5) * 25));
  }
  return { days, outpatient, inpatient, emergency };
})();

/** 2. 科室负载热力图（10 科室 × 8 时段） */
export const deptHeatmap = (() => {
  const depts = [
    '心内科',
    '呼吸科',
    '消化科',
    '神经内科',
    '骨科',
    '普外科',
    '急诊科',
    '儿科',
    '妇产科',
    '内分泌',
  ];
  const hours = ['08时', '09时', '10时', '11时', '14时', '15时', '16时', '17时'];
  const data: [number, number, number][] = [];
  depts.forEach((_, d) => {
    hours.forEach((_, h) => {
      const peak = h >= 1 && h <= 3 ? 1 : 0.6;
      const v = Math.round(30 + ((d * 7 + h * 13) % 60) * peak);
      data.push([h, d, v]);
    });
  });
  return { depts, hours, data };
})();

/** 3. 疾病分布 TOP10 */
export const diseasePie = [
  { name: '高血压', value: 1280 },
  { name: '2型糖尿病', value: 980 },
  { name: '冠心病', value: 860 },
  { name: '肺部感染', value: 720 },
  { name: '慢性胃炎', value: 640 },
  { name: '脑梗死', value: 520 },
  { name: '骨关节病', value: 460 },
  { name: '高脂血症', value: 430 },
  { name: '心律失常', value: 380 },
  { name: '其他', value: 1130 },
];

/** 4. 费用结构 */
export const feeStructure = {
  categories: ['药品费', '检查费', '治疗费', '耗材费', '手术费', '床位费'],
  outpatient: [420, 260, 180, 90, 40, 30],
  inpatient: [380, 320, 410, 260, 380, 150],
};

/** 5. DRG 盈亏散点 */
export const drgScatter = (() => {
  const data: { weight: number; deviation: number; name: string }[] = [];
  const names = [
    'AMI',
    '心力衰竭',
    '肺炎',
    '脑卒中',
    '髋关节置换',
    '剖宫产',
    '阑尾炎',
    '胆囊切除',
    'COPD',
    '消化道出血',
  ];
  names.forEach((n, i) => {
    data.push({
      weight: 0.8 + (i % 5) * 0.4 + Math.random() * 0.2,
      deviation: Math.round(Math.sin(i) * 35 + (i % 3 === 0 ? 18 : -12)),
      name: n,
    });
  });
  return data;
})();

/** 6. 质控指标雷达 */
export const qualityRadar = {
  indicators: ['病历甲级率', '核心制度执行', '合理用药', '感染控制', '患者满意度'],
  values: [92, 96, 88, 90, 94],
};

/** 7. 平均住院日趋势（面积图） */
export const losTrend = (() => {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月'];
  const los = [9.2, 9.0, 8.8, 8.6, 8.4, 8.2, 8.0, 7.8];
  return { months, los };
})();

/** 8. 医生工作量排行（横向柱状） */
export const doctorWorkload = {
  doctors: ['陈医生', '王医生', '李医生', '张医生', '刘医生', '赵医生', '周医生', '吴医生'],
  visits: [486, 452, 428, 402, 378, 356, 328, 301],
};

/* -------------------------------------------------------------------------- */
/* 公司信息                                                                    */
/* -------------------------------------------------------------------------- */

export const companyInfo = {
  name: '健澜科技',
  fullName: '杭州健澜科技有限公司',
  slogan: 'AI 驱动的下一代智慧医院操作系统',
  mission: '让 AI 成为每位医生的专业副驾',
  vision: '构建数智化、一体化、安全可信的医疗智能体生态',
  address: '浙江省杭州市余杭区未来科技城',
  phone: '0571-8888-8888',
  email: 'contact@jianlan.tech',
  website: 'www.jianlan.tech',
};

export const companyMilestones = [
  { year: '2021', title: '公司成立', desc: '健澜科技于杭州未来科技城成立，聚焦医疗 AI 垂直场景。' },
  { year: '2022', title: '首款产品落地', desc: '智能问诊助手在多家试点医院上线验证。' },
  {
    year: '2023',
    title: '数智医院智能体',
    desc: '发布数智医院智能体 1.0，整合 CDS 与患者 360 能力。',
  },
  { year: '2024', title: '多 Agent 架构', desc: '推出多 Agent 编排与 RAG 知识库，覆盖 8 大科室。' },
  { year: '2025', title: '云原生中台', desc: '四中台微服务架构落地，完成等保三级测评。' },
  { year: '2026', title: 'AI 原生医院', desc: '发布 AI 原生医院 3.0，迈向医院操作系统新阶段。' },
];

/** 预约演示表单字段（用于 About 页） */
export type BookingFormValues = {
  name: string;
  hospital: string;
  title: string;
  phone: string;
  email: string;
  requirement: string;
};
