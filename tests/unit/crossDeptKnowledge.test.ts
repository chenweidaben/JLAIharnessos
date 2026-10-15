/**
 * 健澜科技 jlmedaios - 跨科室知识联邦推荐纯函数单测（依据宪法第三章）
 *
 * 覆盖：DEPT_SIMILARITY 科室映射（心血管共病三角 / 呼吸↔胸外等）、
 *       推荐排序（成功率降序 → 使用次数降序 → 标题字典序）、
 *       空知识兜底（空全集 / 未知科室 / 本科室知识充足均返回 []，不抛错）。
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  crossDeptKnowledge,
  DEPT_SIMILARITY,
  DEPT_NAMES,
  MIN_OWN_ENTRIES,
  type CrossDeptKnowledgeItem,
} from '../../src/bff/aggregators/crossDeptKnowledgeAggregator';

/** 构造测试知识条目（默认使用次数可覆盖） */
function makeItem(
  deptCode: string,
  title: string,
  successRate: number,
  usageCount = 10,
  knowledgeType: CrossDeptKnowledgeItem['knowledgeType'] = 'pathway',
): CrossDeptKnowledgeItem {
  return {
    deptCode,
    knowledgeType,
    title,
    content: `content-${deptCode}-${title}`,
    successRate,
    usageCount,
  };
}

describe('DEPT_SIMILARITY 科室关联图谱（依据宪法第三章）', () => {
  it('心血管 ↔ 内分泌 ↔ 肾内科三角共病轴', () => {
    expect(DEPT_SIMILARITY['DEP-CARDIO']).toEqual(['DEP-ENDO', 'DEP-NEPHRO']);
    expect(DEPT_SIMILARITY['DEP-ENDO']).toEqual(['DEP-CARDIO', 'DEP-NEPHRO']);
    expect(DEPT_SIMILARITY['DEP-NEPHRO']).toEqual(['DEP-CARDIO', 'DEP-ENDO']);
  });

  it('呼吸 ↔ 胸外、神经 ↔ 康复、儿科 ↔ 新生儿、肿瘤 ↔ 放疗 双向对称', () => {
    expect(DEPT_SIMILARITY['DEP-RESP']).toEqual(['DEP-THORACIC']);
    expect(DEPT_SIMILARITY['DEP-THORACIC']).toEqual(['DEP-RESP']);
    expect(DEPT_SIMILARITY['DEP-NEURO']).toEqual(['DEP-REHAB']);
    expect(DEPT_SIMILARITY['DEP-REHAB']).toEqual(['DEP-NEURO']);
    expect(DEPT_SIMILARITY['DEP-PED']).toEqual(['DEP-NICU']);
    expect(DEPT_SIMILARITY['DEP-NICU']).toEqual(['DEP-PED']);
    expect(DEPT_SIMILARITY['DEP-ONC']).toEqual(['DEP-RADONC']);
    expect(DEPT_SIMILARITY['DEP-RADONC']).toEqual(['DEP-ONC']);
  });

  it('图谱覆盖的科室均有中文名称登记', () => {
    for (const code of Object.keys(DEPT_SIMILARITY)) {
      expect(DEPT_NAMES[code]).toBeTruthy();
    }
  });
});

describe('crossDeptKnowledge 科室映射：仅推荐关联科室', () => {
  it('心血管知识不足时，仅从内分泌/肾内科联邦拉取，不含呼吸等无关科室', () => {
    const all = [
      makeItem('DEP-ENDO', '内分泌-条目', 0.93),
      makeItem('DEP-NEPHRO', '肾内-条目', 0.88),
      makeItem('DEP-RESP', '呼吸-无关条目', 0.99),
      makeItem('DEP-ONC', '肿瘤-无关条目', 0.99),
    ];
    const recs = crossDeptKnowledge('DEP-CARDIO', 'pathway', all);
    expect(recs.map((r) => r.deptCode).sort()).toEqual(['DEP-ENDO', 'DEP-NEPHRO']);
    expect(recs.every((r) => r.deptName.length > 0)).toBe(true);
    expect(recs[0].relation).toContain('心血管内科');
    expect(recs[0].relation).toContain('↔');
  });

  it('只收集同知识类型的条目：pathway 查询不带出 drug 条目', () => {
    const all = [
      makeItem('DEP-ENDO', 'pathway-条目', 0.9, 10, 'pathway'),
      makeItem('DEP-ENDO', 'drug-条目', 0.95, 10, 'drug'),
    ];
    const recs = crossDeptKnowledge('DEP-CARDIO', 'pathway', all);
    expect(recs.map((r) => r.title)).toEqual(['pathway-条目']);
  });
});

describe('crossDeptKnowledge 推荐排序', () => {
  it('关联科室条目按采纳成功率降序排列', () => {
    const all = [
      makeItem('DEP-ENDO', '低成功', 0.7),
      makeItem('DEP-NEPHRO', '高成功', 0.95),
      makeItem('DEP-ENDO', '中成功', 0.82),
    ];
    const recs = crossDeptKnowledge('DEP-CARDIO', 'pathway', all);
    expect(recs.map((r) => r.title)).toEqual(['高成功', '中成功', '低成功']);
  });

  it('成功率相同时，usage_count 高者优先', () => {
    const all = [
      makeItem('DEP-ENDO', '少用', 0.85, 12),
      makeItem('DEP-NEPHRO', '多用', 0.85, 80),
    ];
    const recs = crossDeptKnowledge('DEP-CARDIO', 'pathway', all);
    expect(recs.map((r) => r.title)).toEqual(['多用', '少用']);
  });

  it('成功率与使用次数都相同时，按标题字典序升序，结果确定', () => {
    const all = [
      makeItem('DEP-ENDO', 'beta', 0.85, 20),
      makeItem('DEP-NEPHRO', 'alpha', 0.85, 20),
    ];
    const recs = crossDeptKnowledge('DEP-CARDIO', 'pathway', all);
    expect(recs.map((r) => r.title)).toEqual(['alpha', 'beta']);
  });

  it('纯函数：不修改入参数组顺序', () => {
    const all = [
      makeItem('DEP-NEPHRO', '后', 0.9),
      makeItem('DEP-ENDO', '前', 0.8),
    ];
    const snapshot = all.map((d) => d.title);
    crossDeptKnowledge('DEP-CARDIO', 'pathway', all);
    expect(all.map((d) => d.title)).toEqual(snapshot);
  });
});

describe('crossDeptKnowledge 空知识兜底', () => {
  it('全院知识全集为空 → 返回空数组，不抛错', () => {
    expect(crossDeptKnowledge('DEP-CARDIO', 'pathway', [])).toEqual([]);
  });

  it('科室编码不在关联图谱中 → 返回空数组', () => {
    const all = [makeItem('DEP-ENDO', '条目', 0.9)];
    expect(crossDeptKnowledge('DEP-UNKNOWN', 'pathway', all)).toEqual([]);
  });

  it('关联科室同类型无知识条目 → 返回空数组', () => {
    const all = [
      makeItem('DEP-ENDO', '其他类型条目', 0.9, 10, 'drug'),
      makeItem('DEP-UNMAPPED', 'pathway-无关条目', 0.99, 10, 'pathway'),
    ];
    expect(crossDeptKnowledge('DEP-CARDIO', 'pathway', all)).toEqual([]);
  });

  it('本科室自身知识充足（≥ MIN_OWN_ENTRIES 条）→ 不跨科推荐，返回空数组', () => {
    const all = [
      makeItem('DEP-CARDIO', '自身条目-1', 0.6),
      makeItem('DEP-CARDIO', '自身条目-2', 0.6),
      makeItem('DEP-ENDO', '内分泌-高成功', 0.99),
    ];
    expect(MIN_OWN_ENTRIES).toBe(2);
    expect(crossDeptKnowledge('DEP-CARDIO', 'pathway', all)).toEqual([]);
  });

  it('本科室仅有 1 条知识（不足）→ 仍触发关联科室联邦推荐', () => {
    const all = [
      makeItem('DEP-CARDIO', '自身条目-仅1条', 0.6),
      makeItem('DEP-ENDO', '内分泌-高成功', 0.99),
    ];
    const recs = crossDeptKnowledge('DEP-CARDIO', 'pathway', all);
    expect(recs.map((r) => r.title)).toEqual(['内分泌-高成功']);
  });

  it('非法知识类型 → 返回空数组', () => {
    const all = [makeItem('DEP-ENDO', '条目', 0.9)];
    expect(crossDeptKnowledge('DEP-CARDIO', 'unknown' as never, all)).toEqual([]);
  });
});
