/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 科室管理与运营 - Mock 数据（心内科演示）
 * 数据口径：开放床位 45 张，在院 40 人；指标符合三级综合医院心内科运行实际
 */
import type {
  DepartmentInfo,
  OverviewData,
  OperationAnalysis,
  DRGDAnalysis,
  QualityIndicators,
  StaffInfo,
  Schedule,
  Performance,
  EquipmentInfo,
  Consumable,
  InventoryAlert,
  EquipmentStats,
  StaffStats,
  BedInfo,
} from '@/types/operation';
import type { Gender } from '@/types/common';

/* ------------------------------ 科室信息 ------------------------------ */

export const mockDepartment: DepartmentInfo = {
  deptId: 'DEPT-CARD-01',
  name: '心血管内科',
  category: 'internal',
  director: '陈国华',
  headNurse: '林晓芸',
  address: '住院部 6 楼 东病区',
  bedTotal: 45,
  bedOpen: 45,
  inPatient: 40,
  doctorCount: 16,
  nurseCount: 24,
  technicianCount: 4,
  establishedYear: 1985,
  introduction:
    '心血管内科是院级重点学科，下设冠心病介入、心律失常、心力衰竭、高血压与结构性心脏病四个亚专业组，年门诊量逾 6 万人次，年介入手术量 1500 余例，具备国家级胸痛中心、房颤中心示范单位资质。',
  specialties: ['冠心病介入组', '心律失常组', '心力衰竭组', '高血压与结构心组'],
};

/* ------------------------------ 床位 ------------------------------ */

const patientSurnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
const patientGiven = [
  '建国',
  '桂兰',
  '志强',
  '秀英',
  '德福',
  '玉梅',
  '文斌',
  '淑珍',
  '国栋',
  '凤英',
  '立新',
  '桂芳',
];

function buildBeds(): BedInfo[] {
  const beds: BedInfo[] = [];
  for (let i = 1; i <= 45; i++) {
    const label = `${Math.ceil(i / 6)}${i % 6 === 0 ? 6 : i % 6}床`;
    if (i <= 40) {
      // 在院 40
      const name =
        patientSurnames[i % patientSurnames.length] + patientGiven[i % patientGiven.length];
      const level = i % 11 === 0 ? '病危' : i % 5 === 0 ? '病重' : i % 3 === 0 ? '一级' : '普通';
      beds.push({ bedNo: label, status: 'in', patientName: name, level });
    } else if (i <= 42) {
      beds.push({ bedNo: label, status: 'pre_discharge' });
    } else if (i === 43) {
      beds.push({ bedNo: label, status: 'isolated' });
    } else {
      beds.push({ bedNo: label, status: 'empty' });
    }
  }
  return beds;
}

function occupancyTrend30d(): { date: string; rate: number }[] {
  const out: { date: string; rate: number }[] = [];
  const base = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86_400_000);
    const dow = d.getDay();
    // 周末略高、工作日略波动，围绕 88%
    const weekend = dow === 0 || dow === 6 ? 3 : 0;
    const wave = Math.sin(i / 3) * 2.5;
    out.push({
      date: d.toISOString().slice(5, 10),
      rate: Math.round((88 + weekend + wave) * 10) / 10,
    });
  }
  return out;
}

/* ------------------------------ 概览 ------------------------------ */

export const mockOverview: OverviewData = {
  coreMetrics: [
    {
      key: 'occ',
      name: '床位使用率',
      value: 88.9,
      unit: '%',
      trend: 2.1,
      target: 90,
      direction: 'range',
      status: 'good',
    },
    {
      key: 'los',
      name: '平均住院日',
      value: 6.8,
      unit: '天',
      trend: -4.2,
      target: 7,
      direction: 'down_good',
      status: 'good',
    },
    {
      key: 'out',
      name: '本月门诊量',
      value: 4860,
      unit: '人次',
      trend: 5.6,
      direction: 'up_good',
      status: 'good',
    },
    {
      key: 'dis',
      name: '本月出院人数',
      value: 218,
      unit: '人',
      trend: 3.4,
      direction: 'up_good',
      status: 'good',
    },
    {
      key: 'op',
      name: '本月手术量',
      value: 132,
      unit: '台',
      trend: 8.9,
      direction: 'up_good',
      status: 'good',
    },
    {
      key: 'cmi',
      name: 'CMI 值',
      value: 1.42,
      unit: '',
      trend: 1.8,
      direction: 'up_good',
      status: 'good',
    },
    {
      key: 'drug',
      name: '药占比',
      value: 28.6,
      unit: '%',
      trend: -1.3,
      target: 30,
      direction: 'down_good',
      status: 'good',
    },
    {
      key: 'cons',
      name: '耗占比',
      value: 16.2,
      unit: '%',
      trend: 0.4,
      target: 20,
      direction: 'down_good',
      status: 'warn',
    },
  ],
  bedUsage: {
    beds: buildBeds(),
    occupancyRate: 88.9,
    preDischargeCount: 2,
    isolatedCount: 1,
    occupancyTrend: occupancyTrend30d(),
  },
  today: {
    newAdmission: 6,
    discharge: 4,
    surgery: 5,
    critical: 2,
    pendingTasks: 9,
  },
  ranking: [
    { metric: '床位使用率', rank: 4, total: 28, value: 88.9 },
    { metric: '平均住院日', rank: 6, total: 28, value: 6.8 },
    { metric: 'CMI 值', rank: 3, total: 28, value: 1.42 },
    { metric: '患者满意度', rank: 5, total: 28, value: 96.2 },
  ],
};

/* ------------------------------ 运营分析 ------------------------------ */

const months12 = [
  '去年10月',
  '去年11月',
  '去年12月',
  '今年1月',
  '今年2月',
  '今年3月',
  '今年4月',
  '今年5月',
  '今年6月',
  '今年7月',
  '今年8月',
  '今年9月',
];

export const mockOperationAnalysis: OperationAnalysis = {
  outpatient: {
    visitTrend: months12.map((m, i) => ({
      label: m,
      value: Math.round(4300 + i * 35 + Math.sin(i) * 120),
    })),
    doctorWorkload: [
      { name: '陈国华', value: 612 },
      { name: '孙立群', value: 548 },
      { name: '赵志明', value: 502 },
      { name: '李文静', value: 466 },
      { name: '王海涛', value: 431 },
      { name: '周敏', value: 398 },
      { name: '吴建国', value: 362 },
      { name: '郑晓东', value: 335 },
    ],
    diseaseTop10: [
      { name: '冠状动脉粥样硬化性心脏病', icd: 'I25.1', count: 892, ratio: 18.4 },
      { name: '高血压病', icd: 'I10.x', count: 764, ratio: 15.8 },
      { name: '心律失常', icd: 'I49.9', count: 521, ratio: 10.7 },
      { name: '心力衰竭', icd: 'I50.9', count: 408, ratio: 8.4 },
      { name: '心房颤动', icd: 'I48.9', count: 356, ratio: 7.3 },
      { name: '不稳定型心绞痛', icd: 'I20.0', count: 289, ratio: 6.0 },
      { name: '心肌梗死', icd: 'I21.4', count: 198, ratio: 4.1 },
      { name: '高脂血症', icd: 'E78.5', count: 176, ratio: 3.6 },
      { name: '心肌炎', icd: 'I51.4', count: 121, ratio: 2.5 },
      { name: '心肌病', icd: 'I42.9', count: 98, ratio: 2.0 },
    ],
    avgVisitCost: 486.5,
    drugRatio: 32.4,
    examRatio: 28.7,
    appointmentRate: 78.5,
    noShowRate: 6.2,
    avgWaitMinutes: 22,
  },
  inpatient: {
    dischargeTrend: months12.map((m, i) => ({
      label: m,
      value: Math.round(188 + i * 3 + Math.cos(i) * 9),
    })),
    occupancyTrend: months12.map((m, i) => ({
      label: m,
      value: Math.round((85 + Math.sin(i / 2) * 4) * 10) / 10,
    })),
    losTrend: months12.map((m, i) => ({
      label: m,
      value: Math.round((7.4 - i * 0.05 + Math.sin(i) * 0.2) * 10) / 10,
    })),
    diseaseTop10: [
      { name: '急性非ST段抬高型心肌梗死', icd: 'I21.4', count: 142, ratio: 13.2 },
      { name: '不稳定性心绞痛', icd: 'I20.0', count: 128, ratio: 11.9 },
      { name: '慢性心力衰竭急性加重', icd: 'I50.9', count: 116, ratio: 10.8 },
      { name: '持续性心房颤动', icd: 'I48.1', count: 98, ratio: 9.1 },
      { name: '高血压3级 很高危', icd: 'I10.x', count: 87, ratio: 8.1 },
      { name: '急性ST段抬高型心肌梗死', icd: 'I21.0', count: 76, ratio: 7.1 },
      { name: '病态窦房结综合征', icd: 'I49.5', count: 54, ratio: 5.0 },
      { name: '扩张型心肌病', icd: 'I42.0', count: 41, ratio: 3.8 },
      { name: '主动脉瓣狭窄', icd: 'I35.0', count: 33, ratio: 3.1 },
      { name: '肺栓塞', icd: 'I26.0', count: 22, ratio: 2.0 },
    ],
    avgStayCost: 24680,
    drugRatio: 28.6,
    consumableRatio: 16.2,
    examRatio: 18.9,
    outcome: { cureRate: 38.4, improveRate: 56.2, deathRate: 1.8, unhealRate: 3.6 },
  },
  surgery: {
    volumeTrend: months12.map((m, i) => ({
      label: m,
      value: Math.round(108 + i * 2 + Math.sin(i) * 8),
    })),
    levelDist: [
      { level: 'level1', name: '一级手术', count: 18, ratio: 13.6 },
      { level: 'level2', name: '二级手术', count: 42, ratio: 31.8 },
      { level: 'level3', name: '三级手术', count: 51, ratio: 38.6 },
      { level: 'level4', name: '四级手术', count: 21, ratio: 16.0 },
    ],
    doctorWorkload: [
      { name: '陈国华', value: 46 },
      { name: '赵志明', value: 38 },
      { name: '王海涛', value: 31 },
      { name: '孙立群', value: 27 },
      { name: '郑晓东', value: 19 },
    ],
    typeDist: [
      { name: '冠脉造影', value: 58 },
      { name: 'PCI 支架植入', value: 42 },
      { name: '射频消融', value: 18 },
      { name: '起搏器植入', value: 9 },
      { name: '结构性心脏病介入', value: 5 },
    ],
    complicationRate: 1.2,
    avgDurationMinutes: 68,
  },
  fee: {
    revenueTrend: months12.map((m, i) => ({
      label: m,
      outpatient: Math.round(210 + i * 4),
      inpatient: Math.round(480 + i * 8),
    })),
    structure: [
      { name: '药品', amount: 486, ratio: 28.6 },
      { name: '检查', amount: 321, ratio: 18.9 },
      { name: '化验', amount: 148, ratio: 8.7 },
      { name: '治疗', amount: 296, ratio: 17.4 },
      { name: '手术', amount: 218, ratio: 12.8 },
      { name: '耗材', amount: 276, ratio: 16.2 },
      { name: '床位', amount: 86, ratio: 5.1 },
      { name: '护理', amount: 58, ratio: 3.4 },
    ],
    avgCostCompare: [
      { name: '次均门诊', value: 486, benchmark: 452 },
      { name: '次均住院', value: 24680, benchmark: 23100 },
      { name: '日均住院', value: 3629, benchmark: 3480 },
      { name: '次均手术', value: 12800, benchmark: 11900 },
    ],
    insuranceRatio: 82.4,
    selfPayRatio: 17.6,
  },
};

/* ------------------------------ DRG/DIP ------------------------------ */

const drgNames: [string, string, number, number][] = [
  ['FM11', '冠脉介入治疗', 1.85, 32000],
  ['FM15', '冠脉支架植入伴合并症', 2.34, 41000],
  ['FM13', '急性心肌梗死', 2.12, 36500],
  ['FC35', '心力衰竭', 1.24, 19800],
  ['FC31', '严重心律失常', 1.48, 24600],
  ['FK15', '心脏永久起搏器植入', 2.68, 46000],
  ['FM19', '射频消融术', 2.05, 33800],
  ['FC39', '高血压伴合并症', 0.92, 14800],
  ['FU15', '经皮瓣膜介入', 3.85, 78000],
  ['FM25', '外周血管介入', 1.72, 28600],
  ['FC33', '心绞痛', 0.98, 15600],
  ['FU11', '主动脉夹层介入', 4.12, 92000],
  ['FM31', '冠脉搭桥伴介入', 3.45, 68000],
  ['FC45', '心肌病', 1.36, 21800],
  ['FM41', '肺动脉造影', 1.18, 19200],
  ['FK31', '埋藏式除颤器植入', 3.22, 62000],
  ['FC37', '心源性休克', 2.58, 44500],
  ['FM17', '复杂冠脉介入', 2.96, 52000],
  ['FC49', '心包疾病', 0.86, 13800],
  ['FU13', '先天性心脏病介入', 2.74, 47500],
];

function buildDRGGroups(): DRGDAnalysis['groups'] {
  const doctors = ['陈国华', '赵志明', '王海涛', '孙立群', '郑晓东', '李文静'];
  const groups: DRGDAnalysis['groups'] = [];
  // 展开到 50+ 组：基础组 + 细分亚组
  drgNames.forEach(([code, name, rw, stdCost], idx) => {
    const variants = [0, 1, 2];
    variants.forEach((v) => {
      const caseCount = 8 + ((idx * 7 + v * 3) % 26);
      const costFactor = 0.82 + ((idx + v) % 5) * 0.13; // 0.82 ~ 1.34
      const timeFactor = 0.85 + ((idx * 3 + v) % 4) * 0.12;
      const avgCost = Math.round(stdCost * costFactor);
      const avgLOS = Math.round(Math.round(7 + rw * 2.2) * timeFactor * 10) / 10;
      const stdLOS = Math.round((6 + rw * 1.8) * 10) / 10;
      const totalCost = Math.round((avgCost * caseCount) / 1000) / 10; // 万元
      const costDeviation = Math.round(((avgCost - stdCost) / stdCost) * 1000) / 10;
      const timeDeviation = Math.round(((avgLOS - stdLOS) / stdLOS) * 1000) / 10;
      // 盈亏 = (标准费用 - 实际费用)*例数；以标准费用 1.0 为基准
      const profitWan = Math.round((((stdCost - avgCost) * caseCount) / 10000) * 10) / 10;
      const profitStatus = profitWan > 5 ? 'profit' : profitWan < -5 ? 'loss' : 'balance';
      groups.push({
        groupCode: v === 0 ? code : `${code}.${v}`,
        groupName: v === 0 ? name : `${name}（${v === 1 ? '伴合并症' : '不伴合并症'}）`,
        weight: Math.round(rw * (v === 1 ? 1.15 : v === 2 ? 0.9 : 1) * 100) / 100,
        caseCount,
        totalCost,
        avgCost,
        stdCost,
        avgLOS,
        stdLOS,
        profit: profitWan,
        profitStatus,
        costDeviation,
        timeDeviation,
        doctor: doctors[(idx + v) % doctors.length],
        lowRiskDeath: (idx + v) % 17 === 0,
      });
    });
  });
  return groups.sort((a, b) => b.profit - a.profit);
}

const drgGroups = buildDRGGroups();

export const mockDRGDAnalysis: DRGDAnalysis = {
  groupingRate: 96.8,
  coveredGroups: 60,
  cmi: 1.42,
  timeEfficiencyIndex: 0.94,
  costEfficiencyIndex: 1.03,
  lowRiskMortality: 0.02,
  lowMidRiskMortality: 0.18,
  groups: drgGroups,
  profitOverview: {
    profitCount: 34,
    lossCount: 18,
    balanceCount: 8,
    profitAmount: 186.4,
    lossAmount: -142.8,
    netProfit: 43.6,
  },
  scatter: drgGroups
    .filter((g) => g.caseCount >= 10)
    .map((g) => ({
      costDev: g.costDeviation,
      timeDev: g.timeDeviation,
      count: g.caseCount,
      groupName: g.groupName,
    })),
  costDevDist: [
    { range: '< -20%', count: 6 },
    { range: '-20%~-10%', count: 11 },
    { range: '-10%~0%', count: 16 },
    { range: '0%~10%', count: 14 },
    { range: '10%~20%', count: 9 },
    { range: '20%~50%', count: 6 },
    { range: '> 50%', count: 4 },
  ],
  timeDevDist: [
    { range: '< -20%', count: 5 },
    { range: '-20%~-10%', count: 13 },
    { range: '-10%~0%', count: 18 },
    { range: '0%~10%', count: 12 },
    { range: '10%~30%', count: 9 },
    { range: '> 30%', count: 4 },
  ],
  highCostCases: [
    { groupName: '主动脉夹层介入', avgCost: 118600, multiple: 1.29 },
    { groupName: '经皮瓣膜介入', avgCost: 96800, multiple: 1.24 },
    { groupName: '埋藏式除颤器植入', avgCost: 78500, multiple: 1.27 },
    { groupName: '冠脉搭桥伴介入', avgCost: 84200, multiple: 1.24 },
    { groupName: '复杂冠脉介入', avgCost: 66400, multiple: 1.28 },
  ],
  benchmarks: [
    {
      metric: '入组率',
      deptValue: 96.8,
      national: 95.2,
      provincial: 94.6,
      peerDept: 96.1,
      unit: '%',
    },
    { metric: 'CMI', deptValue: 1.42, national: 1.28, provincial: 1.31, peerDept: 1.38, unit: '' },
    {
      metric: '时间消耗指数',
      deptValue: 0.94,
      national: 1.0,
      provincial: 0.98,
      peerDept: 0.96,
      unit: '',
    },
    {
      metric: '费用消耗指数',
      deptValue: 1.03,
      national: 1.0,
      provincial: 1.02,
      peerDept: 1.01,
      unit: '',
    },
    {
      metric: '低风险死亡率',
      deptValue: 0.02,
      national: 0.05,
      provincial: 0.04,
      peerDept: 0.03,
      unit: '%',
    },
  ],
  advices: [
    {
      drgGroup: '主动脉夹层介入',
      reason: '耗材费用占比高达 62%，国产支架使用率偏低，术前评估等待日偏长导致时间消耗指数升高。',
      suggestion:
        '推进国产覆膜支架集采落地，建立术前 MDT 快速通道，力争将平均住院日由 14.2 天压缩至 11 天。',
      priority: 'high',
      expectedBenefit: '预计单例节约费用 1.2 万元，月均增收约 8.5 万元',
    },
    {
      drgGroup: '经皮瓣膜介入',
      reason: '术中一次性特殊耗材使用不规范，术后监护时间偏长。',
      suggestion: '规范 TAVR 术后监护路径，将 CCU 监护由 3 天降至 1.5 天，纳入临床路径管理。',
      priority: 'high',
      expectedBenefit: '缩短住院日 1.5 天，降低亏损约 6%',
    },
    {
      drgGroup: '心力衰竭',
      reason: '诊断相关组权重低但次均费用偏高，检查重复率 11%，出院带药不规范。',
      suggestion: '优化心衰标准化诊疗路径，推行 BNP/NT-proBNP 合理复查，规范出院随访用药。',
      priority: 'medium',
      expectedBenefit: '次均费用下降约 8%，药占比下降 2 个百分点',
    },
    {
      drgGroup: '心律失常',
      reason: '射频消融术后住院日波动大，部分病例因术后观察延迟出院。',
      suggestion: '推行日间消融与次日出院路径，强化术后心电监护即时评估。',
      priority: 'medium',
      expectedBenefit: '平均住院日由 5.2 天降至 4.0 天',
    },
  ],
  profitTrend: months12.map((m, i) => ({
    month: m,
    net: Math.round((18 + Math.sin(i / 1.5) * 16 + i * 1.2) * 10) / 10,
  })),
};

/* ------------------------------ 质量指标 ------------------------------ */

export const mockQualityIndicators: QualityIndicators = {
  cureRate: 38.4,
  improveRate: 56.2,
  deathRate: 1.8,
  unhealRate: 3.6,
  readmitRate: 2.1,
  unplannedReopRate: 0.3,
  surgeryComplicationRate: 1.2,
  infectionRate: 0.68,
  pressureUlcerRate: 0.12,
  fallRate: 0.08,
  satisfaction: 96.2,
  singleDiseases: [
    {
      disease: '急性心肌梗死',
      code: 'AMI',
      items: [
        {
          name: '首诊至球囊扩张 ≤90 分钟',
          rate: 93.5,
          benchmark: 90,
          trend: months12.map((m, i) => ({ label: m, value: 88 + i * 0.5 })),
        },
        {
          name: '左室射血分数评估',
          rate: 98.2,
          benchmark: 95,
          trend: months12.map((m, i) => ({ label: m, value: 96 + (i % 3) })),
        },
        {
          name: '抗血小板规范用药',
          rate: 97.6,
          benchmark: 95,
          trend: months12.map((m, i) => ({ label: m, value: 95 + i * 0.2 })),
        },
      ],
    },
    {
      disease: '心力衰竭',
      code: 'HF',
      items: [
        {
          name: '利尿剂规范使用',
          rate: 96.8,
          benchmark: 90,
          trend: months12.map((m, i) => ({ label: m, value: 93 + i * 0.3 })),
        },
        {
          name: 'β 受体阻滞剂使用',
          rate: 91.4,
          benchmark: 85,
          trend: months12.map((m, i) => ({ label: m, value: 88 + i * 0.3 })),
        },
        {
          name: 'ACEI/ARB/ARNI 使用',
          rate: 89.7,
          benchmark: 85,
          trend: months12.map((m, i) => ({ label: m, value: 86 + i * 0.3 })),
        },
      ],
    },
    {
      disease: '社区获得性肺炎',
      code: 'CAP',
      items: [
        {
          name: '抗菌药物使用 ≤7 天',
          rate: 88.5,
          benchmark: 90,
          trend: months12.map((m, i) => ({ label: m, value: 86 + i * 0.2 })),
        },
        {
          name: '病原学检查送检率',
          rate: 82.3,
          benchmark: 80,
          trend: months12.map((m, i) => ({ label: m, value: 79 + i * 0.3 })),
        },
        {
          name: '氧合评估完成率',
          rate: 99.1,
          benchmark: 95,
          trend: months12.map((m) => ({ label: m, value: 99 })),
        },
      ],
    },
    {
      disease: '脑梗死',
      code: 'CI',
      items: [
        {
          name: '静脉溶栓时间窗内给药',
          rate: 86.4,
          benchmark: 85,
          trend: months12.map((m, i) => ({ label: m, value: 83 + i * 0.3 })),
        },
        {
          name: '抗血小板治疗',
          rate: 97.8,
          benchmark: 95,
          trend: months12.map((m, i) => ({ label: m, value: 96 + i * 0.1 })),
        },
        {
          name: '他汀类药物使用',
          rate: 95.2,
          benchmark: 90,
          trend: months12.map((m, i) => ({ label: m, value: 93 + i * 0.2 })),
        },
      ],
    },
  ],
  coreSystems: [
    { name: '三级查房制度', rate: 98.6 },
    { name: '术前讨论制度', rate: 99.2 },
    { name: '死亡病例讨论制度', rate: 100 },
    { name: '疑难病例讨论制度', rate: 96.8 },
    { name: '会诊制度', rate: 97.5 },
    { name: '分级护理制度', rate: 98.1 },
    { name: '值班交接班制度', rate: 99.5 },
    { name: '查对制度', rate: 99.0 },
  ],
  rationalDrug: {
    drugRatio: 28.6,
    abxOutpatientRate: 14.8,
    abxInpatientRate: 52.4,
    abxDDS: 32.5,
    essentialDrugRate: 68.2,
    centralizedDrugRate: 46.8,
    prescriptionQualified: 98.9,
  },
  examRatio: 18.9,
  largeDevicePositiveRate: 68.5,
  repeatExamRate: 2.3,
  monthlyTrend: months12.map((m, i) => ({
    month: m,
    cureRate: 36 + i * 0.2,
    deathRate: Math.round((2.4 - i * 0.05 + Math.sin(i) * 0.1) * 100) / 100,
    satisfaction: 93 + i * 0.25,
  })),
  warnings: [
    { name: '肺炎抗菌药物疗程合规率', value: 88.5, threshold: 90 },
    { name: '重复检查率', value: 2.3, threshold: 2.0 },
    { name: '药占比', value: 28.6, threshold: 30 },
  ],
  deptQualityRank: [
    { name: '心血管内科', value: 94.6, rank: 2 },
    { name: '呼吸内科', value: 93.8, rank: 5 },
    { name: '消化内科', value: 92.1, rank: 9 },
    { name: '神经内科', value: 91.5, rank: 12 },
    { name: '内分泌科', value: 90.8, rank: 15 },
  ],
  doctorQualityRank: [
    { name: '陈国华', value: 96.8, rank: 1 },
    { name: '赵志明', value: 95.2, rank: 3 },
    { name: '王海涛', value: 94.1, rank: 6 },
    { name: '孙立群', value: 93.5, rank: 9 },
    { name: '李文静', value: 92.8, rank: 14 },
  ],
};

/* ------------------------------ 人员 ------------------------------ */

const doctorNames = [
  '陈国华',
  '孙立群',
  '赵志明',
  '李文静',
  '王海涛',
  '周敏',
  '吴建国',
  '郑晓东',
  '冯雪',
  '褚天宇',
  '卫兰',
  '蒋鹏飞',
  '沈心怡',
  '韩志强',
  '杨秀芬',
  '朱明辉',
];
const nurseNames = [
  '林晓芸',
  '许丽华',
  '何春梅',
  '郭晓燕',
  '马丽娟',
  '罗海燕',
  '梁静怡',
  '宋佳',
  '谢婉婷',
  '唐颖',
  '韩雪',
  '冯倩',
  '董丽',
  '袁媛',
  '邓萍',
  '曹敏',
  '彭丽',
  '曾欢',
  '萧芸',
  '田甜',
  '董雯',
  '潘婷',
  '袁静',
  '侯敏',
];
const techNames = ['姚立', '崔健', '谭伟', '陆涛'];
const adminNames = ['毛莉'];

function buildStaff(): StaffInfo[] {
  const out: StaffInfo[] = [];
  doctorNames.forEach((name, i) => {
    const gender: Gender = i % 3 === 0 ? 'female' : 'male';
    const age = 32 + (i % 20);
    const titles: StaffInfo['title'][] =
      i === 0 ? ['主任医师'] : i < 3 ? ['副主任医师'] : i < 8 ? ['主治医师'] : ['住院医师'];
    out.push({
      staffId: `DOC-${String(i + 1).padStart(3, '0')}`,
      name,
      gender,
      age,
      category: 'doctor',
      title: titles[0],
      position: i === 0 ? '科主任' : i === 1 ? '医疗组长' : i === 2 ? '介入组长' : undefined,
      specialty: ['冠心病介入', '心律失常', '心力衰竭', '高血压'][i % 4],
      education: i < 3 ? '博士' : i < 9 ? '硕士' : '本科',
      hireDate: `20${String(8 + (i % 16)).padStart(2, '0')}-0${(i % 9) + 1}-15`,
      licenseNo: `110330000${String(1000 + i)}`,
      qualificationNo: `2011${String(3000 + i)}`,
      practiceScope: '心血管内科专业',
      prescriptionRight: true,
      surgeryLevel: i === 0 ? '四级' : i < 3 ? '四级' : i < 6 ? '三级' : i < 10 ? '二级' : '一级',
      abxLevel: i < 3 ? '特殊使用' : i < 8 ? '限制' : '非限制',
      status: i === 5 ? 'leave' : 'active',
      educationHistory: [
        { school: '浙江大学医学院', degree: i < 3 ? '博士' : '硕士', period: '2005-2012' },
      ],
      awards:
        i === 0
          ? ['省医学科技进步二等奖', '院级先进工作者']
          : i % 4 === 0
            ? ['院级优秀青年医师']
            : [],
      trainingHours: 25 + (i % 20),
      certExpire: [
        { cert: '医师执业证书', expireDate: `2027-0${(i % 9) + 1}-01` },
        { cert: '大型设备上岗证', expireDate: `2026-0${(i % 8) + 1}-15` },
      ],
    });
  });
  nurseNames.forEach((name, i) => {
    const age = 26 + (i % 18);
    out.push({
      staffId: `NUR-${String(i + 1).padStart(3, '0')}`,
      name,
      gender: 'female',
      age,
      category: 'nurse',
      title: i === 0 ? '主任护师' : i < 4 ? '主管护师' : i < 12 ? '护师' : '护士',
      position: i === 0 ? '护士长' : i < 4 ? '护理组长' : undefined,
      specialty: '心血管护理',
      education: i < 4 ? '本科' : '大专',
      hireDate: `20${String(10 + (i % 14)).padStart(2, '0')}-0${(i % 9) + 1}-01`,
      licenseNo: `201330000${String(200 + i)}`,
      qualificationNo: `2010${String(5000 + i)}`,
      practiceScope: '护理专业',
      prescriptionRight: false,
      surgeryLevel: '无',
      abxLevel: '非限制',
      status: i === 7 ? 'out' : 'active',
      educationHistory: [{ school: '浙江中医药大学', degree: '本科', period: '2008-2013' }],
      awards: i === 0 ? ['院级优秀护士长'] : [],
      trainingHours: 18 + (i % 16),
      certExpire: [{ cert: '护士执业证书', expireDate: `2027-0${(i % 9) + 1}-10` }],
    });
  });
  techNames.forEach((name, i) => {
    out.push({
      staffId: `TEC-${String(i + 1).padStart(3, '0')}`,
      name,
      gender: i % 2 === 0 ? 'male' : 'female',
      age: 30 + i * 3,
      category: 'technician',
      title: i === 0 ? '主管技师' : '技师',
      specialty: '心电生理检查',
      education: '本科',
      hireDate: `20${12 + i}-06-01`,
      licenseNo: `301330000${i}`,
      qualificationNo: `2012${i}`,
      practiceScope: '医学影像与检验',
      prescriptionRight: false,
      surgeryLevel: '无',
      abxLevel: '非限制',
      status: 'active',
      educationHistory: [{ school: '温州医科大学', degree: '本科', period: '2008-2012' }],
      awards: [],
      trainingHours: 20 + i * 2,
      certExpire: [{ cert: '大型设备上岗证', expireDate: `2026-1${(i % 2) + 1}-20` }],
    });
  });
  adminNames.forEach((name, i) => {
    out.push({
      staffId: `ADM-${i + 1}`,
      name,
      gender: 'female',
      age: 38,
      category: 'admin',
      title: '主管护师',
      position: '科室秘书',
      specialty: '科室管理',
      education: '本科',
      hireDate: '2014-03-01',
      licenseNo: `2014000${i}`,
      qualificationNo: `2014${i}`,
      practiceScope: '护理管理',
      prescriptionRight: false,
      surgeryLevel: '无',
      abxLevel: '非限制',
      status: 'active',
      educationHistory: [{ school: '杭州师范大学', degree: '本科', period: '2008-2012' }],
      awards: [],
      trainingHours: 12,
      certExpire: [],
    });
  });
  return out;
}

export const mockStaffList: StaffInfo[] = buildStaff();

function buildSchedule(): Schedule[] {
  const out: Schedule[] = [];
  const nursing = mockStaffList.filter((s) => s.category === 'nurse').slice(0, 12);
  const shifts: Schedule['shift'][] = ['day', 'night', 'mid', 'off', 'off', 'leave'];
  const base = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(base.getTime() + d * 86_400_000).toISOString().slice(0, 10);
    nursing.forEach((n, i) => {
      out.push({
        scheduleId: `SCH-${date}-${n.staffId}`,
        staffId: n.staffId,
        staffName: n.name,
        category: 'nurse',
        date,
        shift: shifts[(i + d) % shifts.length],
      });
    });
  }
  return out;
}

export const mockSchedule: Schedule[] = buildSchedule();

export const mockPerformance: Performance[] = doctorNames.slice(0, 10).map((name, i) => ({
  staffId: `DOC-${String(i + 1).padStart(3, '0')}`,
  staffName: name,
  outpatientCount: 620 - i * 38,
  dischargeCount: 42 - i * 2,
  surgeryCount: i < 5 ? 46 - i * 5 : 8 - i,
  recordCount: 180 - i * 10,
  recordQualifiedRate: Math.round((99 - i * 0.4) * 10) / 10,
  qcScore: Math.round((96 - i * 0.8) * 10) / 10,
  satisfaction: Math.round((97 - i * 0.5) * 10) / 10,
  avgLOS: Math.round((7.2 - i * 0.15) * 10) / 10,
  occupancyRate: Math.round((90 - i) * 10) / 10,
  revenue: Math.round((186 - i * 12) * 10) / 10,
  cost: Math.round((120 - i * 8) * 10) / 10,
  balance: Math.round((66 - i * 4) * 10) / 10,
  score: Math.round((98 - i * 1.5) * 10) / 10,
  rank: i + 1,
  trend: Math.round((6 - i * 0.5) * 10) / 10,
}));

export const mockStaffStats: StaffStats = {
  ageDist: [
    { range: '≤30岁', count: 14 },
    { range: '31-40岁', count: 18 },
    { range: '41-50岁', count: 9 },
    { range: '≥51岁', count: 4 },
  ],
  titleDist: [
    { name: '主任医师', count: 1 },
    { name: '副主任医师', count: 3 },
    { name: '主治医师', count: 6 },
    { name: '住院医师', count: 6 },
    { name: '护士长/主管护师', count: 5 },
    { name: '护师/护士', count: 19 },
    { name: '技师', count: 4 },
  ],
  educationDist: [
    { name: '博士', count: 3 },
    { name: '硕士', count: 7 },
    { name: '本科', count: 24 },
    { name: '大专', count: 8 },
  ],
  genderDist: [
    { name: '男', count: 19 },
    { name: '女', count: 30 },
  ],
  doctorNurseRatio: '1:1.5',
  bedNurseRatio: '1:0.53',
  monthlyJoinLeave: months12.map((m, i) => ({
    month: m,
    join: (i % 3) + 1,
    leave: i % 4 === 0 ? 1 : 0,
  })),
};

/* ------------------------------ 设备与物资 ------------------------------ */

export const mockEquipmentList: EquipmentInfo[] = [
  {
    equipId: 'EQ-001',
    name: '数字减影血管造影系统(DSA)',
    model: 'Artis zee III',
    vendor: '西门子医疗',
    purchaseDate: '2021-05-12',
    value: 1280,
    category: 'large',
    status: 'normal',
    dept: '心导管室',
    usageHours: 168,
    usageRate: 78.6,
    faultRate: 1.2,
    lastMaintenance: '2026-08-20',
    nextMaintenance: '2026-11-20',
    nextCalibration: '2026-10-15',
    monthlyRevenue: 286,
    paybackMonths: 42,
    maintenanceLog: [
      { date: '2026-08-20', type: '保养', vendor: '西门子医疗', cost: 1.2, result: '正常' },
      {
        date: '2026-05-10',
        type: '维修',
        vendor: '西门子医疗',
        cost: 3.8,
        result: '已更换球管配件',
      },
    ],
  },
  {
    equipId: 'EQ-002',
    name: '血管内超声(IVUS)',
    model: 'iLab 250ultra',
    vendor: '波士顿科学',
    purchaseDate: '2022-03-08',
    value: 186,
    category: 'large',
    status: 'normal',
    dept: '心导管室',
    usageHours: 96,
    usageRate: 52.4,
    faultRate: 0.8,
    lastMaintenance: '2026-07-15',
    nextMaintenance: '2026-10-15',
    nextCalibration: '2026-12-01',
    monthlyRevenue: 68,
    paybackMonths: 28,
    maintenanceLog: [
      { date: '2026-07-15', type: '校准', vendor: '波士顿科学', cost: 0.5, result: '正常' },
    ],
  },
  {
    equipId: 'EQ-003',
    name: '心电监护仪',
    model: 'Philips IntelliVue MX450',
    vendor: '飞利浦',
    purchaseDate: '2023-01-20',
    value: 6.8,
    category: 'monitor',
    status: 'normal',
    dept: '病房',
    usageHours: 720,
    usageRate: 95.0,
    faultRate: 2.1,
    lastMaintenance: '2026-09-01',
    nextMaintenance: '2026-12-01',
    nextCalibration: '2026-11-01',
    monthlyRevenue: 0,
    paybackMonths: 0,
    maintenanceLog: [
      { date: '2026-09-01', type: '保养', vendor: '飞利浦', cost: 0.08, result: '正常' },
    ],
  },
  {
    equipId: 'EQ-004',
    name: '除颤监护仪',
    model: 'HeartStart MRx',
    vendor: '飞利浦',
    purchaseDate: '2020-11-05',
    value: 4.2,
    category: 'emergency',
    status: 'normal',
    dept: '抢救室',
    usageHours: 120,
    usageRate: 16.7,
    faultRate: 0,
    lastMaintenance: '2026-08-10',
    nextMaintenance: '2026-11-10',
    nextCalibration: '2026-10-10',
    monthlyRevenue: 0,
    paybackMonths: 0,
    maintenanceLog: [
      { date: '2026-08-10', type: '保养', vendor: '飞利浦', cost: 0.05, result: '正常' },
    ],
  },
  {
    equipId: 'EQ-005',
    name: '有创呼吸机',
    model: 'Servo-u',
    vendor: '迈柯唯',
    purchaseDate: '2021-09-18',
    value: 28.5,
    category: 'emergency',
    status: 'repair',
    dept: 'CCU',
    usageHours: 320,
    usageRate: 44.4,
    faultRate: 8.6,
    lastMaintenance: '2026-09-10',
    nextMaintenance: '2026-12-10',
    nextCalibration: '2026-10-20',
    monthlyRevenue: 12,
    paybackMonths: 18,
    maintenanceLog: [
      {
        date: '2026-09-10',
        type: '维修',
        vendor: '迈柯唯',
        cost: 1.6,
        result: '氧流量传感器故障，待件',
      },
    ],
  },
  {
    equipId: 'EQ-006',
    name: '心电图机',
    model: 'MAC 5500 HD',
    vendor: 'GE 医疗',
    purchaseDate: '2022-06-25',
    value: 3.6,
    category: 'routine',
    status: 'normal',
    dept: '门诊',
    usageHours: 200,
    usageRate: 27.8,
    faultRate: 1.5,
    lastMaintenance: '2026-06-12',
    nextMaintenance: '2026-09-12',
    nextCalibration: '2026-09-12',
    monthlyRevenue: 3.2,
    paybackMonths: 12,
    maintenanceLog: [
      { date: '2026-06-12', type: '保养', vendor: 'GE 医疗', cost: 0.05, result: '正常' },
    ],
  },
  {
    equipId: 'EQ-007',
    name: '动态心电分析系统',
    model: 'SpaceLab',
    vendor: '太空实验室',
    purchaseDate: '2019-04-15',
    value: 12.8,
    category: 'routine',
    status: 'idle',
    dept: '心电室',
    usageHours: 60,
    usageRate: 8.3,
    faultRate: 0,
    lastMaintenance: '2026-03-01',
    nextMaintenance: '2026-12-01',
    nextCalibration: '2026-12-01',
    monthlyRevenue: 2.8,
    paybackMonths: 36,
    maintenanceLog: [
      { date: '2026-03-01', type: '保养', vendor: '太空实验室', cost: 0.1, result: '正常' },
    ],
  },
  {
    equipId: 'EQ-008',
    name: '主动脉内球囊反搏泵',
    model: 'AutoCat 2',
    vendor: 'MAQUET',
    purchaseDate: '2020-08-30',
    value: 46,
    category: 'emergency',
    status: 'normal',
    dept: 'CCU',
    usageHours: 180,
    usageRate: 25.0,
    faultRate: 2.4,
    lastMaintenance: '2026-08-01',
    nextMaintenance: '2026-11-01',
    nextCalibration: '2026-11-01',
    monthlyRevenue: 18,
    paybackMonths: 24,
    maintenanceLog: [
      { date: '2026-08-01', type: '保养', vendor: 'MAQUET', cost: 0.3, result: '正常' },
    ],
  },
];

export const mockConsumables: Consumable[] = [
  {
    consumableId: 'CON-001',
    name: '药物洗脱冠脉支架',
    spec: '3.0×24mm',
    model: 'Resolute Onyx',
    vendor: '美敦力',
    unit: '个',
    unitPrice: 7800,
    stock: 36,
    safetyStock: 20,
    expiryDate: '2027-06-30',
    category: 'high_value',
    monthlyUsage: 28,
    traceEnabled: true,
    supplier: '上海医疗器械公司',
  },
  {
    consumableId: 'CON-002',
    name: '冠脉球囊扩张导管',
    spec: '2.5×15mm',
    model: 'Sprinter Legend',
    vendor: '美敦力',
    unit: '条',
    unitPrice: 1850,
    stock: 58,
    safetyStock: 30,
    expiryDate: '2027-03-31',
    category: 'high_value',
    monthlyUsage: 42,
    traceEnabled: true,
    supplier: '上海医疗器械公司',
  },
  {
    consumableId: 'CON-003',
    name: '一次性压力传感器',
    spec: '常规型',
    model: 'DPT-248',
    vendor: 'BD',
    unit: '个',
    unitPrice: 120,
    stock: 240,
    safetyStock: 150,
    expiryDate: '2027-01-15',
    category: 'ordinary',
    monthlyUsage: 180,
    traceEnabled: false,
    supplier: '华东医药公司',
  },
  {
    consumableId: 'CON-004',
    name: '中心静脉导管',
    spec: '7Fr 双腔',
    model: 'Certofix',
    vendor: '贝朗',
    unit: '套',
    unitPrice: 460,
    stock: 42,
    safetyStock: 25,
    expiryDate: '2026-12-31',
    category: 'high_value',
    monthlyUsage: 30,
    traceEnabled: true,
    supplier: '贝朗医疗',
  },
  {
    consumableId: 'CON-005',
    name: '起搏器电极导线',
    spec: '双极 58cm',
    model: 'Sterlitite',
    vendor: '美敦力',
    unit: '根',
    unitPrice: 5200,
    stock: 8,
    safetyStock: 10,
    expiryDate: '2027-09-30',
    category: 'high_value',
    monthlyUsage: 6,
    traceEnabled: true,
    supplier: '美敦力',
  },
  {
    consumableId: 'CON-006',
    name: '无菌手套',
    spec: '7.5 号',
    model: '无粉',
    vendor: '英科医疗',
    unit: '副',
    unitPrice: 2.8,
    stock: 1200,
    safetyStock: 800,
    expiryDate: '2028-05-31',
    category: 'ordinary',
    monthlyUsage: 900,
    traceEnabled: false,
    supplier: '本地耗材供应商',
  },
  {
    consumableId: 'CON-007',
    name: '医用纱布块',
    spec: '8×10cm',
    model: '灭菌',
    vendor: '振德医疗',
    unit: '包',
    unitPrice: 4.5,
    stock: 35,
    safetyStock: 60,
    expiryDate: '2026-11-30',
    category: 'ordinary',
    monthlyUsage: 80,
    traceEnabled: false,
    supplier: '振德医疗',
  },
  {
    consumableId: 'CON-008',
    name: '临时起搏器',
    spec: '体外',
    model: 'TEMPO',
    vendor: '波士顿科学',
    unit: '套',
    unitPrice: 3800,
    stock: 5,
    safetyStock: 6,
    expiryDate: '2027-02-28',
    category: 'high_value',
    monthlyUsage: 4,
    traceEnabled: true,
    supplier: '波士顿科学',
  },
];

export const mockInventoryAlerts: InventoryAlert[] = [
  {
    consumableId: 'CON-005',
    name: '起搏器电极导线',
    type: 'low_stock',
    message: '库存 8 根，低于安全库存 10 根，请及时补货',
  },
  {
    consumableId: 'CON-007',
    name: '医用纱布块',
    type: 'low_stock',
    message: '库存 35 包，低于安全库存 60 包',
  },
  {
    consumableId: 'CON-004',
    name: '中心静脉导管',
    type: 'expiring',
    message: '有效期至 2026-12-31，建议优先使用',
  },
  {
    consumableId: 'CON-003',
    name: '一次性压力传感器',
    type: 'expiring',
    message: '有效期至 2027-01-15，临近效期',
  },
];

export const mockEquipmentStats: EquipmentStats = {
  equipCountByCategory: [
    { category: '大型设备', count: 2 },
    { category: '常规设备', count: 2 },
    { category: '急救设备', count: 3 },
    { category: '监护设备', count: 1 },
  ],
  equipStatusDist: [
    { name: '正常', value: 6 },
    { name: '维修', value: 1 },
    { name: '闲置', value: 1 },
    { name: '报废', value: 0 },
  ],
  consumableTrend: months12.map((m, i) => ({
    month: m,
    amount: Math.round(210 + i * 4 + Math.sin(i) * 15),
  })),
  costAnalysis: [
    { name: '设备折旧', cost: 86 },
    { name: '维保费用', cost: 12 },
    { name: '高值耗材', cost: 218 },
    { name: '普通物资', cost: 38 },
    { name: '能耗', cost: 15 },
  ],
};
