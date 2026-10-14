/**
 * 健澜科技 jlmedaios - 门诊医生工作站聚合器
 *
 * 门诊医生站一屏四栏数据：
 *   ① 病历模板快捷调用（常见病种模板，一键带入主诉/现病史片段）
 *   ② 处方历史（近 30 天门诊处方，含药品明细与金额）
 *   ③ ICD 诊断搜索（searchIcd 纯函数：按编码/名称/拼音码过滤）
 *   ④ 检查检验开立目录（检查 / 检验 / 处置）
 *
 * 设计要点：
 *  - searchIcd 为纯函数，不修改入参，便于单测与前端搜索框复用；
 *  - listView 在无真实库/断库时返回 demo:true 的演示数据，保证空库可演示，不抛 5xx；
 *  - 患者姓名一律脱敏（张*三），不做解密，符合等保/合规要求。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** ICD 诊断条目 */
export interface IcdDiagnosis {
  /** ICD-10 编码，如 I10.x00 */
  icdCode: string;
  /** 诊断名称（中文） */
  name: string;
  /** 拼音助记码，如 gxyz（高血压） */
  pyCode: string;
}

/** 病历模板（快捷调用） */
export interface EmrTemplate {
  templateId: string;
  name: string;
  category: string;
  /** 一键带入的病史片段 */
  snippet: string;
}

/** 处方内药品明细行 */
export interface PrescriptionDrugItem {
  drugName: string;
  spec: string;
  dosage: string;
  frequency: string;
  days: number;
}

/** 处方历史行 */
export interface PrescriptionRecord {
  prescriptionId: string;
  /** 脱敏患者姓名 */
  patientName: string;
  dept: string;
  doctor: string;
  /** 开方时间 ISO */
  issuedAt: string;
  drugs: PrescriptionDrugItem[];
  totalAmount: number;
  status: '已完成' | '已发药' | '已退回';
}

/** 检查检验目录条目 */
export interface ExamCatalogItem {
  itemId: string;
  /** 检查 imaging / 检验 lab / 处置 treatment */
  category: '检查' | '检验' | '处置';
  name: string;
  itemCode: string;
  price: number;
  /** 报告时效文案 */
  eta: string;
}

export interface OpdWorkstationView {
  /** true 表示当前为演示数据 */
  demo: boolean;
  updatedAt: string;
  templates: EmrTemplate[];
  prescriptions: PrescriptionRecord[];
  diagnoses: IcdDiagnosis[];
  catalog: ExamCatalogItem[];
}

/* ------------------------------- 纯函数 ------------------------------- */

/**
 * searchIcd：按关键词过滤 ICD 诊断列表。
 *
 * 匹配字段（不区分大小写、忽略首尾空格）：
 *   - 诊断名称（中文包含）
 *   - ICD 编码（包含，如 "I10"）
 *   - 拼音助记码（包含，如 "gxy"）
 *
 * 纯函数：不修改入参；keyword 为空/纯空白时返回全量列表（供搜索框初始态）。
 */
export function searchIcd(diagnoses: IcdDiagnosis[], keyword: string): IcdDiagnosis[] {
  const kw = (keyword ?? '').trim().toLowerCase();
  if (!diagnoses || diagnoses.length === 0) return [];
  if (!kw) return diagnoses.map((d) => ({ ...d }));
  return diagnoses
    .filter((d) => {
      const name = d.name.toLowerCase();
      const code = d.icdCode.toLowerCase();
      const py = (d.pyCode ?? '').toLowerCase();
      return name.includes(kw) || code.includes(kw) || py.includes(kw);
    })
    .map((d) => ({ ...d }));
}

/* ----------------------------- 演示兜底 ------------------------------ */

function demoDiagnoses(): IcdDiagnosis[] {
  return [
    { icdCode: 'I10.x00', name: '原发性高血压', pyCode: 'gxy' },
    { icdCode: 'E11.900', name: '2型糖尿病', pyCode: 'tnbs' },
    { icdCode: 'J00.x00', name: '急性鼻咽炎(普通感冒)', pyCode: 'gm' },
    { icdCode: 'J02.900', name: '急性咽炎', pyCode: 'xyy' },
    { icdCode: 'K29.700', name: '消化不良', pyCode: 'xhb' },
    { icdCode: 'K21.900', name: '胃食管反流病', pyCode: 'wsfl' },
    { icdCode: 'M54.501', name: '腰痛', pyCode: 'yt' },
    { icdCode: 'R51.x00', name: '头痛', pyCode: 'tt' },
    { icdCode: 'N39.000', name: '尿路感染', pyCode: 'nlgr' },
    { icdCode: 'J45.900', name: '支气管哮喘', pyCode: 'zqxc' },
  ];
}

function demoTemplates(): EmrTemplate[] {
  return [
    {
      templateId: 'tpl-hypertension',
      name: '高血压门诊病历',
      category: '心血管',
      snippet: '主诉：发现血压升高X年，头晕X天。现病史：患者X年前体检发现血压升高，最高XXX/XX mmHg，不规律服药。今日自测血压XXX/XX mmHg，伴（不伴）胸闷心悸。',
    },
    {
      templateId: 'tpl-diabetes',
      name: '2型糖尿病复诊',
      category: '内分泌',
      snippet: '主诉：确诊2型糖尿病X年，复诊。现病史：患者规律服用XXX降糖药，空腹血糖波动X.X-X.X mmol/L，（无/有）低血糖发作史。',
    },
    {
      templateId: 'tpl-uri',
      name: '上呼吸道感染',
      category: '呼吸',
      snippet: '主诉：咽痛、发热X天。现病史：患者X天前受凉后出现咽痛，伴发热（体温最高XX.X℃）、鼻塞流涕，无咳嗽咳痰。',
    },
    {
      templateId: 'tpl-gi',
      name: '消化不良/胃炎',
      category: '消化',
      snippet: '主诉：上腹不适X天。现病史：患者X天前饮食不节后出现上腹（胀/痛），餐后加重，伴嗳气反酸，无黑便呕血。',
    },
  ];
}

function demoPrescriptions(): PrescriptionRecord[] {
  return [
    {
      prescriptionId: 'RX-20261014-001',
      patientName: '张*三',
      dept: '心血管内科',
      doctor: '陈医生',
      issuedAt: '2026-10-14T09:20:00+08:00',
      drugs: [
        { drugName: '苯磺酸氨氯地平片', spec: '5mg×7片', dosage: '5mg', frequency: 'qd', days: 28 },
        { drugName: '阿托伐他汀钙片', spec: '20mg×7片', dosage: '20mg', frequency: 'qn', days: 28 },
      ],
      totalAmount: 128.6,
      status: '已发药',
    },
    {
      prescriptionId: 'RX-20261014-002',
      patientName: '李*四',
      dept: '内分泌科',
      doctor: '王医生',
      issuedAt: '2026-10-14T10:05:00+08:00',
      drugs: [
        { drugName: '盐酸二甲双胍缓释片', spec: '0.5g×30片', dosage: '0.5g', frequency: 'bid', days: 30 },
      ],
      totalAmount: 46.8,
      status: '已完成',
    },
    {
      prescriptionId: 'RX-20261013-018',
      patientName: '王*五',
      dept: '全科医学科',
      doctor: '陈医生',
      issuedAt: '2026-10-13T15:42:00+08:00',
      drugs: [
        { drugName: '复方氨酚烷胺胶囊', spec: '10粒', dosage: '1粒', frequency: 'bid', days: 3 },
        { drugName: '蒲地蓝消炎口服液', spec: '10ml×10支', dosage: '10ml', frequency: 'tid', days: 5 },
      ],
      totalAmount: 59.9,
      status: '已退回',
    },
  ];
}

function demoCatalog(): ExamCatalogItem[] {
  return [
    { itemId: 'EXM-EKG', category: '检查', name: '常规心电图', itemCode: 'EKG01', price: 25, eta: '立等' },
    { itemId: 'EXM-CXR', category: '检查', name: '胸部正位DR', itemCode: 'DR02', price: 88, eta: '30分钟' },
    { itemId: 'EXM-US', category: '检查', name: '腹部彩超', itemCode: 'US03', price: 120, eta: '2小时' },
    { itemId: 'LAB-CBC', category: '检验', name: '血常规(五分类)', itemCode: 'LAB01', price: 20, eta: '1小时' },
    { itemId: 'LAB-CMP', category: '检验', name: '生化全套(肝肾功能+血糖血脂)', itemCode: 'LAB02', price: 120, eta: '2小时' },
    { itemId: 'LAB-HbA1c', category: '检验', name: '糖化血红蛋白', itemCode: 'LAB03', price: 60, eta: '当日' },
    { itemId: 'TRT-IV', category: '处置', name: '静脉输液(一次)', itemCode: 'TRT01', price: 15, eta: '即时' },
    { itemId: 'TRT-NE', category: '处置', name: '雾化吸入治疗', itemCode: 'TRT02', price: 25, eta: '即时' },
  ];
}

/**
 * listView：门诊医生工作站一屏数据。
 *
 * 当前为前端演示态，统一返回 demo:true 的内置数据集（模板 + 处方历史 +
 * ICD 诊断 + 检查检验目录）；后续接入真实库时可在此 try 查询并回退本演示函数。
 */
export async function listView(): Promise<OpdWorkstationView> {
  return {
    demo: true,
    updatedAt: new Date().toISOString(),
    templates: demoTemplates(),
    prescriptions: demoPrescriptions(),
    diagnoses: demoDiagnoses(),
    catalog: demoCatalog(),
  };
}
