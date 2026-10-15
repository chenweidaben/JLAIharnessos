/**
 * 健澜科技 jlmedaios - 区域医疗协同纯函数单测（M143-D）【互联网医院与远程医疗】
 *
 * 覆盖：医院注册（id 顺序 / 区域自动解析 / 参数校验 / 同名幂等）、
 *       资源匹配（buildRegionalResourceMap 四维聚合 / 总床位）、
 *       转诊建议（病种专科命中 / 区域就近 / 等级过滤 / 双向转诊通道加分）、
 *       患者隐私（maskPatientId 脱敏：P01234523 -> P0****23）。
 * 全部内存台账，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  registerRegionalHospital,
  findBestReferralHospital,
  buildRegionalResourceMap,
  listRegionalHospitals,
  maskPatientId,
  resolveRegion,
  matchSpecialty,
  resetRegionalStore,
  REGIONAL_SERVICES,
} from '../../src/bff/aggregators/regionalCoopAggregator';

beforeEach(() => resetRegionalStore());

describe('医院注册 registerRegionalHospital', () => {
  it('登记后自动生成确定性 id、从院名解析区域、四项能力白名单齐全', () => {
    const h = registerRegionalHospital(
      '浙江大学医学院附属第一医院',
      '三级甲等',
      ['检验结果互认', '影像资料共享', '专家号源共享', '双向转诊通道'],
      ['心血管内科', '肿瘤科'],
      2500,
      '王主任 0571-88888888',
    );
    expect(h.id).toBe('reg_0001');
    expect(h.name).toBe('浙江大学医学院附属第一医院');
    expect(h.level).toBe('三级甲等');
    // 院名含「浙江」但不含具体地市关键词，归「本地」（地市关键词命中见后续用例）
    expect(h.region).toBe('本地');
    expect(h.capacity).toBe(2500);
    expect(h.services).toHaveLength(4);
    expect(REGIONAL_SERVICES).toEqual(['检验结果互认', '影像资料共享', '专家号源共享', '双向转诊通道']);
  });

  it('id 按顺序确定性递增；同名医院幂等返回原档', () => {
    const a = registerRegionalHospital('杭州市第一人民医院', '三级甲等', ['双向转诊通道'], ['心血管内科'], 1500, '李主任 0571-1');
    const b = registerRegionalHospital('宁波市第二医院', '三级乙等', ['影像资料共享'], ['骨科'], 1000, '张主任 0574-1');
    expect(a.id).toBe('reg_0001');
    expect(b.id).toBe('reg_0002');
    const again = registerRegionalHospital('杭州市第一人民医院', '三级甲等', ['双向转诊通道'], ['心血管内科'], 1500, '李主任 0571-1');
    expect(again.id).toBe('reg_0001'); // 同名幂等，不重复造 id
  });

  it('区域解析：杭州/宁波/上海 等关键词命中；未命中归「本地」', () => {
    expect(resolveRegion('杭州市第一人民医院')).toBe('杭州');
    expect(resolveRegion('宁波市第二医院')).toBe('宁波');
    expect(resolveRegion('上海市第六人民医院')).toBe('上海');
    expect(resolveRegion('老家镇卫生院')).toBe('本地');
  });

  it('参数校验：空名 / 等级非法 / 无协同能力 / 无重点专科 / 空联络 均抛错', () => {
    expect(() => registerRegionalHospital(' ', '三级甲等', ['双向转诊通道'], ['心内科'], 100, 'x')).toThrow(/医院名称/);
    expect(() => registerRegionalHospital('x医院', '三级特等' as unknown as '三级甲等', ['双向转诊通道'], ['心内科'], 100, 'x')).toThrow(/医院等级非法/);
    expect(() => registerRegionalHospital('x医院', '三级甲等', [], ['心内科'], 100, 'x')).toThrow(/至少须登记一项协同能力/);
    expect(() => registerRegionalHospital('x医院', '三级甲等', ['双向转诊通道'], [], 100, 'x')).toThrow(/至少须登记一个重点专科/);
    expect(() => registerRegionalHospital('x医院', '三级甲等', ['双向转诊通道'], ['心内科'], -10, 'x')).toThrow(/床位/);
    expect(() => registerRegionalHospital('x医院', '三级甲等', ['双向转诊通道'], ['心内科'], 100, ' ')).toThrow(/联络/);
  });
});

describe('资源匹配 buildRegionalResourceMap', () => {
  it('空台账安全兜底', () => {
    const map = buildRegionalResourceMap();
    expect(map.total).toBe(0);
    expect(map.totalBeds).toBe(0);
    expect(map.hospitals).toEqual([]);
  });

  it('按等级/协同能力/专科/区域四维聚合并统计总床位；新登记的排最前', () => {
    registerRegionalHospital('杭州市第一人民医院', '三级甲等', ['双向转诊通道', '检验结果互认'], ['心血管内科'], 1500, '王 0571-1');
    registerRegionalHospital('宁波市第二医院', '三级乙等', ['影像资料共享'], ['骨科', '心血管内科'], 1000, '张 0574-1');
    registerRegionalHospital('老家镇卫生院', '一级', ['双向转诊通道'], ['全科'], 80, '李 576-1');

    const map = buildRegionalResourceMap();
    expect(map.total).toBe(3);
    expect(map.totalBeds).toBe(2580);
    expect(map.byLevel['三级甲等']).toBe(1);
    expect(map.byLevel['三级乙等']).toBe(1);
    expect(map.byLevel['一级']).toBe(1);
    expect(map.byService['双向转诊通道']).toBe(2); // 市一 + 镇卫生院
    expect(map.bySpecialty['心血管内科']).toBe(2); // 市一 + 宁波二院
    expect(map.byRegion['杭州']).toBe(1);
    expect(map.byRegion['宁波']).toBe(1);
    expect(map.byRegion['本地']).toBe(1);
    // 新登记的（镇卫生院）排最前
    expect(map.hospitals[0].name).toBe('老家镇卫生院');
  });
});

describe('转诊建议 findBestReferralHospital', () => {
  beforeEach(() => {
    registerRegionalHospital('杭州市第一人民医院', '三级甲等', ['双向转诊通道', '检验结果互认'], ['心血管内科', '肿瘤科'], 1500, '王 0571-1');
    registerRegionalHospital('宁波市第二医院', '三级乙等', ['影像资料共享'], ['骨科', '心血管内科'], 1000, '张 0574-1');
    registerRegionalHospital('杭州城西社区医院', '二级乙等', ['双向转诊通道'], ['全科'], 200, '陈 0571-2');
  });

  it('病种关键词命中专科：「急性胸痛」应优先推荐心血管内科最强的三甲医院', () => {
    const list = findBestReferralHospital('急性胸痛 2 小时', '', '');
    expect(list.length).toBeGreaterThan(0);
    // 市一院是三甲 + 心血管内科命中 + 双向转诊，应排第一
    expect(list[0].name).toBe('杭州市第一人民医院');
  });

  it('病种映射 matchSpecialty：胸痛->心血管内科，脑梗->神经外科，儿童->儿科', () => {
    expect(matchSpecialty('急性胸痛')).toBe('心血管内科');
    expect(matchSpecialty('突发脑梗')).toBe('神经外科');
    expect(matchSpecialty('新生儿发热')).toBe('儿科');
    expect(matchSpecialty('')).toBeNull();
  });

  it('区域过滤：location=杭州 时只返回杭州的医院', () => {
    const list = findBestReferralHospital('胸痛', '杭州', '');
    expect(list.every((h) => h.region === '杭州')).toBe(true);
    expect(list.find((h) => h.region === '宁波')).toBeUndefined();
  });

  it('最低等级过滤：要求二级甲等以上，社区医院（二级乙等）应被滤掉', () => {
    const list = findBestReferralHospital('', '杭州', '二级甲等');
    // 杭州只有市一院（三甲）达标；城西社区医院是二级乙等被滤掉
    expect(list.find((h) => h.name === '杭州城西社区医院')).toBeUndefined();
    expect(list[0].name).toBe('杭州市第一人民医院');
  });

  it('空病种 + 空区域 + 空等级：返回全部医院（开通双向转诊通道的优先）', () => {
    const list = findBestReferralHospital('', '', '');
    expect(list.length).toBe(3);
    // 都开通了双向转诊，按等级 + 床位排序，市一院三甲 + 1500 床应第一
    expect(list[0].name).toBe('杭州市第一人民医院');
  });

  it('listRegionalHospitals 新登记的排最前', () => {
    const all = listRegionalHospitals();
    expect(all).toHaveLength(3);
    expect(all[0].name).toBe('杭州城西社区医院');
  });
});

describe('患者隐私 maskPatientId', () => {
  it('跨院共享 patient_id 脱敏：保留前 2 位 + **** + 后 2 位', () => {
    expect(maskPatientId('P01234523')).toBe('P0****23');
    expect(maskPatientId('EMPI998877')).toBe('EM****77');
  });

  it('长度不足 4 位时整体打码，避免反推', () => {
    expect(maskPatientId('AB')).toBe('****');
    expect(maskPatientId('')).toBe('****');
  });
});
