/**
 * 健澜科技 jlmedaios - 跨院知识联邦纯函数单测（M133-C，SaaS化+智慧度）
 *
 * 覆盖三类：
 *  1. 知识脱敏 anonymizeKnowledge：剥离患者/医生 PII 字段，正文掩码手机号/身份证/
 *     工号/署名/患者姓名，anonymized=true，不修改入参；
 *  2. 联邦查询 federateKnowledge：仅汇聚对端医院（不含本院）、类型过滤、
 *     排序（成功率降序→使用次数降序→标题字典序）、通配与指定对端、非法入参兜底；
 *  3. 权限控制 canViewFederation：admin 放行、持权限码放行、其余拒绝。
 * 全部基于内置 FEDERATED_POOL 确定性数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  anonymizeKnowledge,
  federateKnowledge,
  canViewFederation,
  FEDERATED_KNOWLEDGE_PERMISSION,
  FEDERATED_POOL,
  LOCAL_HOSPITAL_ID,
  FEDERATION_WILDCARD,
  type RawHospitalKnowledge,
} from '../../src/bff/aggregators/federatedKnowledgeAggregator';

/** 构造一条带 PII 的原始知识 */
function makeRaw(overrides: Partial<RawHospitalKnowledge> = {}): RawHospitalKnowledge {
  return {
    hospitalId: 'HOSP-A',
    knowledgeType: 'pathway',
    title: '测试路径',
    content: '标准临床路径，作者：王建国 13812345678。',
    patientName: '李某某',
    patientId: 'P-1001',
    authorName: '王建国',
    authorId: 'GH-A-0001',
    authorPhone: '13812345678',
    idCard: '330106199001011234',
    successRate: 0.9,
    usageCount: 20,
    ...overrides,
  };
}

describe('anonymizeKnowledge 知识脱敏', () => {
  it('彻底剥离患者/医生 PII 字段，输出对象不含任何个人标识', () => {
    const out = anonymizeKnowledge(makeRaw(), 'HOSP-A');
    expect(out.anonymized).toBe(true);
    // PII 字段不得出现在脱敏结果上
    expect(out).not.toHaveProperty('patientName');
    expect(out).not.toHaveProperty('patientId');
    expect(out).not.toHaveProperty('authorName');
    expect(out).not.toHaveProperty('authorId');
    expect(out).not.toHaveProperty('authorPhone');
    expect(out).not.toHaveProperty('idCard');
  });

  it('正文掩码手机号 / 身份证 / 工号 / 署名 / 患者姓名', () => {
    const out = anonymizeKnowledge(
      makeRaw({
        content: '电话13812345678，身份证330106199001011234，工号：A-2048，作者：赵敏，患者：孙某某。',
      }),
      'HOSP-A',
    );
    expect(out.content).not.toContain('13812345678');
    expect(out.content).not.toContain('330106199001011234');
    expect(out.content).not.toContain('赵敏');
    expect(out.content).not.toContain('孙某某');
    expect(out.content).toContain('已脱敏');
  });

  it('标注来源医院与对外机构简称', () => {
    const out = anonymizeKnowledge(makeRaw(), 'HOSP-B');
    expect(out.sourceHospitalId).toBe('HOSP-B');
    expect(out.sourceHospitalName).toBe('华东协作医院B');
  });

  it('纯函数：不修改入参原始知识', () => {
    const raw = makeRaw();
    const snapshot = { ...raw };
    anonymizeKnowledge(raw, 'HOSP-A');
    expect(raw).toEqual(snapshot);
  });
});

describe('federateKnowledge 联邦查询', () => {
  it('跨全部成员院汇聚对端同类型知识，不含本院自身', () => {
    const items = federateKnowledge(LOCAL_HOSPITAL_ID, FEDERATION_WILDCARD, 'pathway');
    expect(items.length).toBeGreaterThan(0);
    // 来源全部为对端医院，无本院
    expect(items.every((k) => k.sourceHospitalId !== LOCAL_HOSPITAL_ID)).toBe(true);
    // 全部已脱敏
    expect(items.every((k) => k.anonymized)).toBe(true);
  });

  it('仅汇聚同知识类型：pathway 不带出 drug/lesson', () => {
    const items = federateKnowledge(LOCAL_HOSPITAL_ID, FEDERATION_WILDCARD, 'pathway');
    expect(items.every((k) => k.knowledgeType === 'pathway')).toBe(true);
  });

  it('对端知识按采纳成功率降序排列', () => {
    const items = federateKnowledge(LOCAL_HOSPITAL_ID, FEDERATION_WILDCARD, 'pathway');
    const rates = items.map((k) => k.successRate);
    const sorted = [...rates].sort((a, b) => b - a);
    expect(rates).toEqual(sorted);
  });

  it('指定对端医院：仅汇聚该对端', () => {
    const items = federateKnowledge(LOCAL_HOSPITAL_ID, 'HOSP-A', 'pathway');
    expect(items.length).toBe(1);
    expect(items[0].sourceHospitalId).toBe('HOSP-A');
  });

  it('查询对端=本院自身 → 返回空数组（跨院不回传本院知识）', () => {
    expect(federateKnowledge(LOCAL_HOSPITAL_ID, LOCAL_HOSPITAL_ID, 'pathway')).toEqual([]);
  });

  it('对端医院不在联邦注册表 → 返回空数组', () => {
    expect(federateKnowledge(LOCAL_HOSPITAL_ID, 'HOSP-X', 'pathway')).toEqual([]);
  });

  it('非法知识类型 → 返回空数组', () => {
    expect(federateKnowledge(LOCAL_HOSPITAL_ID, FEDERATION_WILDCARD, 'unknown' as never)).toEqual([]);
  });

  it('本院编码为空 → 返回空数组', () => {
    expect(federateKnowledge('', FEDERATION_WILDCARD, 'pathway')).toEqual([]);
  });

  it('出域结果不含任何 PII：正文无手机号/身份证/署名', () => {
    const items = federateKnowledge(LOCAL_HOSPITAL_ID, FEDERATION_WILDCARD, 'lesson');
    expect(items.length).toBeGreaterThan(0);
    const blob = items.map((k) => k.content).join('\n');
    expect(blob).not.toContain('13812345678');
    expect(blob).not.toContain('330106199001011234');
    expect(blob).not.toContain('周涛');
    expect(blob).not.toContain('孙某某');
  });
});

describe('canViewFederation 权限控制', () => {
  it('admin 角色全量放行', () => {
    expect(canViewFederation(['admin'], [])).toBe(true);
  });

  it('持有 federated:knowledge:view 权限码放行', () => {
    expect(canViewFederation(['doctor'], [FEDERATED_KNOWLEDGE_PERMISSION])).toBe(true);
  });

  it('普通医师无权限码 → 拒绝', () => {
    expect(canViewFederation(['doctor'], [])).toBe(false);
  });

  it('权限列表缺失（undefined）→ 拒绝', () => {
    expect(canViewFederation(['doctor'], undefined)).toBe(false);
  });

  it('权限码常量已定义', () => {
    expect(FEDERATED_KNOWLEDGE_PERMISSION).toBe('federated:knowledge:view');
  });
});
