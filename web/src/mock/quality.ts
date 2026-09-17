/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗质控 Mock
 */
import { uid, rand } from '@/mock/utils';

export const mockQualityReports = Array.from({ length: 12 }, (_, i) => ({
  id: uid('qr'),
  title: `运行病历质控 #${100 + i}`,
  dept: pickDept(),
  doctor: ['陈建国', '李晓东', '王慧敏'][i % 3],
  status: (['pending', 'checking', 'passed', 'defective'] as const)[i % 4],
  score: i % 4 === 2 ? 90 + (i % 10) : i % 4 === 3 ? 65 + (i % 15) : 0,
  defectCount: i % 4 === 3 ? 1 + (i % 3) : 0,
  submittedAt: new Date(Date.now() - i * 86_400_000).toISOString(),
}));

function pickDept(): string {
  return ['心内科', '呼吸内科', '普外科', '骨科'][rand(0, 3)];
}

export const mockQualityStats = {
  totalTasks: 128,
  pending: 23,
  passed: 96,
  defective: 9,
  passRate: 0.889,
  majorDefectRate: 0.023,
};

export function mockQualityCheck(checkType: string) {
  return {
    recordId: uid('R'),
    checkType,
    passed: true,
    score: 88,
    defects:
      checkType === 'medical_record' ? [{ rule: '现病史不完整', level: 'minor' as const }] : [],
    checkedAt: new Date().toISOString(),
  };
}
