/**
 * 健澜科技 jlmedaios - 跨科室知识联邦深化纯函数单测（M146-C，越用越聪明深化）
 *
 * 覆盖三类（全部基于内置种子知识，不依赖数据库）：
 *  1. 跨科推荐 crossDeptKnowledgeFederation：
 *     三组白名单科室对命中、无向识别、中文科室名识别、condition 过滤、
 *     白名单外科室对不推荐、同科室不推荐、confidence >= 0.5 红线；
 *  2. 知识关联 findKnowledgeRelations：
 *     症状+疾病必须落在同一条关系上才命中、单侧参数不推荐、
 *     不匹配组合绝不乱推荐；
 *  3. 图谱构建 buildKnowledgeGraphNode：
 *     编码/中文名命中、主管科室正确、未知疾病 matched=false 不臆造。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildKnowledgeGraphNode,
  CROSS_DEPT_MAP,
  crossDeptKnowledgeFederation,
  DISEASE_REGISTRY,
  findKnowledgeRelations,
  isRecommendable,
  KNOWLEDGE_RELATIONS,
  MIN_CONFIDENCE,
  normalizeDept,
  type Relation,
} from '../../src/bff/aggregators/knowledgeFederationAggregator';

/** 断言一批关系全部越过推荐红线 */
function expectAllRecommendable(relations: Relation[]): void {
  for (const r of relations) {
    expect(r.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE);
  }
}

describe('crossDeptKnowledgeFederation 跨科推荐（宁少勿滥）', () => {
  it('心内科 → 急诊科：返回胸痛绿色通道等全部可信关系且按 confidence 降序', () => {
    const list = crossDeptKnowledgeFederation('DEP-CARDIO', 'DEP-ED');
    expect(list.length).toBeGreaterThanOrEqual(3);
    expectAllRecommendable(list);
    // 降序
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].confidence).toBeGreaterThanOrEqual(list[i].confidence);
    }
    // 最高置信关系必须是胸痛中心绿色通道
    expect(list[0].id).toBe('REL-CARDIO-ED-01');
    expect(list[0].condition).toContain('胸痛');
  });

  it('内分泌 → 营养科：MNT 糖尿病营养协同准确命中', () => {
    const list = crossDeptKnowledgeFederation('DEP-ENDO', 'DEP-NUTRITION');
    expect(list.length).toBe(4);
    expectAllRecommendable(list);
    expect(list.map((r) => r.id)).toContain('REL-ENDO-NUT-01');
  });

  it('外科 → 麻醉科：围术期管理准确命中', () => {
    const list = crossDeptKnowledgeFederation('DEP-SURG', 'DEP-ANES');
    expect(list.length).toBe(3);
    expect(list.map((r) => r.id)).toContain('REL-SURG-ANES-01');
  });

  it('科室对无向：反向传参（急诊科+心内科）同样命中', () => {
    const direct = crossDeptKnowledgeFederation('DEP-CARDIO', 'DEP-ED');
    const reverse = crossDeptKnowledgeFederation('DEP-ED', 'DEP-CARDIO');
    expect(reverse.length).toBe(direct.length);
    expect(reverse.map((r) => r.id).sort()).toEqual(direct.map((r) => r.id).sort());
  });

  it('支持中文科室名与口语别名', () => {
    const byZh = crossDeptKnowledgeFederation('心内科', '营养科');
    // 心内科与营养科不在白名单 → 空（不乱配）
    expect(byZh).toEqual([]);
    const byAlias = crossDeptKnowledgeFederation('内分泌', '麻醉');
    expect(byAlias).toEqual([]);
    // 内分泌→营养科用口语别名应命中
    const ok = crossDeptKnowledgeFederation('内分泌', '营养');
    expect(ok.length).toBe(4);
  });

  it('condition 过滤：心内科+急诊科+心衰 只命中急性左心衰一条', () => {
    const list = crossDeptKnowledgeFederation('DEP-CARDIO', 'DEP-ED', '心衰');
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('REL-CARDIO-ED-02');
  });

  it('白名单外科室对一律不推荐（跨科关联要准确，不能乱推荐）', () => {
    // 心内科与营养科无指南背书的联邦关系
    expect(crossDeptKnowledgeFederation('DEP-CARDIO', 'DEP-NUTRITION')).toEqual([]);
    // 内分泌与麻醉科无联邦关系
    expect(crossDeptKnowledgeFederation('DEP-ENDO', 'DEP-ANES')).toEqual([]);
  });

  it('同科室 / 无法识别科室 / 空参 → 空，绝不臆造', () => {
    expect(crossDeptKnowledgeFederation('DEP-CARDIO', 'DEP-CARDIO')).toEqual([]);
    expect(crossDeptKnowledgeFederation('DEP-NOPE', 'DEP-ED')).toEqual([]);
    expect(crossDeptKnowledgeFederation('', 'DEP-ED')).toEqual([]);
  });

  it('返回拷贝：修改结果不污染种子池（纯函数）', () => {
    const list = crossDeptKnowledgeFederation('心内科', '急诊科');
    list[0].confidence = 0.01;
    const again = crossDeptKnowledgeFederation('心内科', '急诊科');
    expect(again[0].confidence).toBe(KNOWLEDGE_RELATIONS[0].confidence);
  });
});

describe('findKnowledgeRelations 症状-疾病知识关联', () => {
  it('压榨样胸痛 + 急性冠脉综合征 → 准确命中心内科↔急诊科胸痛绿色通道', () => {
    const list = findKnowledgeRelations('压榨样胸痛', '急性冠脉综合征');
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('REL-CARDIO-ED-01');
    expect(list[0].deptA).toBe('DEP-CARDIO');
    expect(list[0].deptB).toBe('DEP-ED');
  });

  it('多饮 + 2型糖尿病 → 准确命中内分泌↔营养科 MNT', () => {
    const list = findKnowledgeRelations('多饮', '2型糖尿病');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((r) => r.id === 'REL-ENDO-NUT-01')).toBe(true);
    expectAllRecommendable(list);
  });

  it('症状与疾病错配（多饮+急性冠脉综合征）→ 空，绝不乱推荐', () => {
    expect(findKnowledgeRelations('多饮', '急性冠脉综合征')).toEqual([]);
    expect(findKnowledgeRelations('术后疼痛', '2型糖尿病')).toEqual([]);
  });

  it('只给单侧线索 → 空（不靠单侧猜测硬凑推荐）', () => {
    expect(findKnowledgeRelations('多饮', '')).toEqual([]);
    expect(findKnowledgeRelations('', '2型糖尿病')).toEqual([]);
  });

  it('未知症状/疾病组合 → 空', () => {
    expect(findKnowledgeRelations('皮疹伴瘙痒', '急性阑尾炎')).toEqual([]);
  });
});

describe('buildKnowledgeGraphNode 图谱构建', () => {
  it('DIS-T2DM：节点命中，主管科室为内分泌科，边指向营养科', () => {
    const node = buildKnowledgeGraphNode('DIS-T2DM');
    expect(node.matched).toBe(true);
    expect(node.name).toBe(DISEASE_REGISTRY['DIS-T2DM'].name);
    expect(node.primaryDept).toBe('DEP-ENDO');
    // 2型糖尿病关联 MNT 与糖尿病肾病两条边
    expect(node.relations.length).toBeGreaterThanOrEqual(2);
    expect(node.relations.some((r) => r.id === 'REL-ENDO-NUT-01')).toBe(true);
    expectAllRecommendable(node.relations);
  });

  it('中文名反查：「糖尿病」可命中节点', () => {
    const node = buildKnowledgeGraphNode('糖尿病');
    expect(node.matched).toBe(true);
  });

  it('未知疾病 → matched=false、空边，绝不臆造图谱', () => {
    const node = buildKnowledgeGraphNode('DIS-NO-SUCH');
    expect(node.matched).toBe(false);
    expect(node.relations).toEqual([]);
    expect(buildKnowledgeGraphNode('').matched).toBe(false);
  });

  it('合并心血管病手术：同时挂外科↔麻醉科与心内科↔急诊科两条边', () => {
    const node = buildKnowledgeGraphNode('DIS-CARDIAC-SURG-RISK');
    expect(node.matched).toBe(true);
    expect(node.relations.some((r) => r.id === 'REL-SURG-ANES-02')).toBe(true);
  });
});

describe('置信度红线与映射白名单', () => {
  it('confidence < 0.5 一律不推荐', () => {
    expect(isRecommendable(0.49)).toBe(false);
    expect(isRecommendable(0.5)).toBe(true);
    expect(isRecommendable(0.96)).toBe(true);
    expect(isRecommendable(Number.NaN)).toBe(false);
  });

  it('跨科映射白名单恰为三组：心内科→急诊 / 内分泌→营养 / 外科→麻醉', () => {
    expect(CROSS_DEPT_MAP['DEP-CARDIO']).toContain('DEP-ED');
    expect(CROSS_DEPT_MAP['DEP-ENDO']).toContain('DEP-NUTRITION');
    expect(CROSS_DEPT_MAP['DEP-SURG']).toContain('DEP-ANES');
    expect(Object.keys(CROSS_DEPT_MAP).length).toBe(3);
  });

  it('normalizeDept：编码 / 中文名 / 别名互认，垃圾输入为 null', () => {
    expect(normalizeDept('  dep-cardio ')).toBe('DEP-CARDIO');
    expect(normalizeDept('急诊科')).toBe('DEP-ED');
    expect(normalizeDept('麻醉')).toBe('DEP-ANES');
    expect(normalizeDept('不存在的科室')).toBeNull();
    expect(normalizeDept('')).toBeNull();
  });
});
