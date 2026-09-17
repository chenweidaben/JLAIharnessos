/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Mock 患者数据（虚拟患者，全部脱敏）
 */
import type { Patient, VitalSign } from '@/types/patient';
import type { Alert } from '@/types/medical';
import { uid, rand } from './utils';

export const mockPatients: Patient[] = [
  {
    id: uid('p_'),
    patientNo: 'ZY2026090001',
    name: '王**',
    gender: 'male',
    age: 67,
    birthDate: '1959-03-12',
    idCardMasked: '3****************4',
    phoneMasked: '138****2201',
    bedNo: '12-03',
    diagnosis: '2型糖尿病合并肺部感染',
    deptName: '呼吸内科',
    careLevel: 'first',
    allergies: ['青霉素'],
  },
  {
    id: uid('p_'),
    patientNo: 'ZY2026090002',
    name: '李**',
    gender: 'female',
    age: 54,
    birthDate: '1972-07-25',
    idCardMasked: '5****************1',
    phoneMasked: '139****7742',
    bedNo: '12-05',
    diagnosis: '高血压3级（很高危）',
    deptName: '心血管内科',
    careLevel: 'second',
    allergies: [],
  },
  {
    id: uid('p_'),
    patientNo: 'ZY2026090003',
    name: '张**',
    gender: 'male',
    age: 73,
    birthDate: '1953-11-02',
    idCardMasked: '1****************8',
    phoneMasked: '137****3310',
    bedNo: '08-11',
    diagnosis: '慢性阻塞性肺疾病急性加重',
    deptName: '呼吸内科',
    careLevel: 'special',
    allergies: ['磺胺类'],
  },
  {
    id: uid('p_'),
    patientNo: 'ZY2026090004',
    name: '刘**',
    gender: 'female',
    age: 45,
    birthDate: '1981-05-18',
    idCardMasked: '4****************6',
    phoneMasked: '135****9087',
    bedNo: '15-02',
    diagnosis: '甲状腺功能亢进',
    deptName: '内分泌科',
    careLevel: 'third',
    allergies: [],
  },
  {
    id: uid('p_'),
    patientNo: 'ZY2026090005',
    name: '赵**',
    gender: 'male',
    age: 61,
    birthDate: '1965-01-30',
    idCardMasked: '2****************3',
    phoneMasked: '186****5521',
    bedNo: '08-14',
    diagnosis: '冠心病 不稳定型心绞痛',
    deptName: '心血管内科',
    careLevel: 'first',
    allergies: ['造影剂'],
  },
  {
    id: uid('p_'),
    patientNo: 'ZY2026090006',
    name: '孙**',
    gender: 'female',
    age: 38,
    birthDate: '1988-09-09',
    idCardMasked: '6****************2',
    phoneMasked: '150****1198',
    bedNo: '20-01',
    diagnosis: '社区获得性肺炎',
    deptName: '呼吸内科',
    careLevel: 'second',
    allergies: [],
  },
  {
    id: uid('p_'),
    patientNo: 'ZY2026090007',
    name: '周**',
    gender: 'male',
    age: 78,
    birthDate: '1948-12-21',
    idCardMasked: '3****************9',
    phoneMasked: '133****6630',
    bedNo: '08-02',
    diagnosis: '脑梗死后遗症',
    deptName: '神经内科',
    careLevel: 'special',
    allergies: [],
  },
  {
    id: uid('p_'),
    patientNo: 'ZY2026090008',
    name: '吴**',
    gender: 'female',
    age: 66,
    birthDate: '1960-04-14',
    idCardMasked: '5****************7',
    phoneMasked: '158****4475',
    bedNo: '15-07',
    diagnosis: '2型糖尿病',
    deptName: '内分泌科',
    careLevel: 'second',
    allergies: [],
  },
];

export function mockVitalSigns(patientId: string, count = 12): VitalSign[] {
  const signs: VitalSign[] = [];
  const now = Date.now();
  for (let i = count; i >= 1; i--) {
    signs.push({
      id: uid('vs_'),
      encounterId: `${patientId}-enc`,
      measureTime: new Date(now - i * 2 * 3600_000).toISOString(),
      temperature: +(36.2 + Math.random() * 1.2).toFixed(1),
      heartRate: rand(68, 96),
      respiration: rand(16, 22),
      systolic: rand(112, 148),
      diastolic: rand(68, 92),
      spo2: rand(94, 99),
    });
  }
  return signs;
}

export const mockAlerts: Alert[] = [
  {
    id: uid('al_'),
    type: 'critical-value',
    level: 'critical',
    title: '危急值告警',
    content: '患者王** 血钾 6.8 mmol/L（危急值），请立即处理',
    patientId: mockPatients[0].id,
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    acknowledged: false,
  },
  {
    id: uid('al_'),
    type: 'allergy',
    level: 'abnormal',
    title: '过敏史提醒',
    content: '患者张** 对磺胺类过敏，医嘱包含相关药物',
    patientId: mockPatients[2].id,
    createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    acknowledged: false,
  },
  {
    id: uid('al_'),
    type: 'abnormal-vital',
    level: 'abnormal',
    title: '生命体征异常',
    content: '患者赵** 血压 168/102 mmHg，超出预警阈值',
    patientId: mockPatients[4].id,
    createdAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    acknowledged: true,
  },
];
