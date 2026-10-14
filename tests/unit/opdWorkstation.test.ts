/**
 * 健澜科技 jlmedaios - 门诊医生工作站聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 searchIcd 纯函数。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { searchIcd, type IcdDiagnosis } from '@/bff/aggregators/opdWorkstationAggregator';

const diagnoses: IcdDiagnosis[] = [
  { icdCode: 'I10.x00', name: '原发性高血压', pyCode: 'gxy' },
  { icdCode: 'E11.900', name: '2型糖尿病', pyCode: 'tnbs' },
  { icdCode: 'J00.x00', name: '急性鼻咽炎(普通感冒)', pyCode: 'gm' },
  { icdCode: 'J45.900', name: '支气管哮喘', pyCode: 'zqxc' },
];

describe('searchIcd', () => {
  it('空输入返回空数组', () => {
    expect(searchIcd([], '高血压')).toEqual([]);
  });

  it('keyword 为空或纯空白时返回全量', () => {
    expect(searchIcd(diagnoses, '')).toHaveLength(4);
    expect(searchIcd(diagnoses, '   ')).toHaveLength(4);
    expect(searchIcd(diagnoses, null as unknown as string)).toHaveLength(4);
  });

  it('按中文名称过滤', () => {
    const res = searchIcd(diagnoses, '高血压');
    expect(res).toHaveLength(1);
    expect(res[0].icdCode).toBe('I10.x00');
  });

  it('按 ICD 编码过滤（不区分大小写）', () => {
    expect(searchIcd(diagnoses, 'e11')).toHaveLength(1);
    expect(searchIcd(diagnoses, 'E11.900')[0].name).toBe('2型糖尿病');
  });

  it('按拼音助记码过滤', () => {
    const res = searchIcd(diagnoses, 'zqxc');
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('支气管哮喘');
  });

  it('关键字忽略首尾空格', () => {
    expect(searchIcd(diagnoses, '  gm  ')).toHaveLength(1);
  });

  it('无匹配时返回空数组', () => {
    expect(searchIcd(diagnoses, '不存在的疾病xyz')).toEqual([]);
  });

  it('不修改入参', () => {
    const snapshot = diagnoses.map((d) => ({ ...d }));
    searchIcd(diagnoses, '高血压');
    searchIcd(diagnoses, '');
    expect(diagnoses).toEqual(snapshot);
  });
});
