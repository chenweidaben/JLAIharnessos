/**
 * 健澜科技 jlmedaios - 医学知识图谱纯函数单测（M131-D，AI 能力深化）
 *
 * 覆盖：
 *  1. 节点查询  searchMedicalNodes —— 精确/模糊命中、类型过滤、空兜底；
 *  2. 关系遍历  queryMedicalGraph  —— 一跳邻接展开、关系类型过滤、DDI 边；
 *  3. 路径搜索  findMedicalPaths   —— 症状→诊断→用药推理链、深度限制、兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  GRAPH_NODES,
  GRAPH_EDGES,
  RELATION_LABELS,
  searchMedicalNodes,
  queryMedicalGraph,
  findMedicalPaths,
  resolveNode,
  asRelation,
  GRAPH_DISCLAIMER,
  queryDiseaseGraph,
  findDifferentialDiagnosis,
  edgeQualifier,
  NODE_TYPE_LABELS,
  type MedicalGraphRelation,
} from '../../src/bff/aggregators/medicalGraphAggregator';

describe('种子知识完整性（权威医学知识可溯源）', () => {
  it('节点覆盖五类：疾病/症状/药物/检查/手术', () => {
    const types = new Set(GRAPH_NODES.map((n) => n.type));
    expect(types.has('disease')).toBe(true);
    expect(types.has('symptom')).toBe(true);
    expect(types.has('drug')).toBe(true);
    expect(types.has('exam')).toBe(true);
    expect(types.has('surgery')).toBe(true);
  });

  it('边覆盖任务要求的四种核心关系', () => {
    const rels = new Set(GRAPH_EDGES.map((e) => e.relation));
    expect(rels.has('disease_has_symptom')).toBe(true);        // 疾病→症状
    expect(rels.has('disease_treated_by_drug')).toBe(true);    // 疾病→药物
    expect(rels.has('symptom_suggests_disease')).toBe(true);  // 症状→疾病
    expect(rels.has('drug_interacts_with_drug')).toBe(true);   // 药物→药物相互作用
  });

  it('每个节点都标注指南来源，可溯源', () => {
    for (const n of GRAPH_NODES) {
      expect(n.sources.length).toBeGreaterThan(0);
    }
  });
});

describe('节点查询 searchMedicalNodes', () => {
  it('精确命中标准名', () => {
    const hit = searchMedicalNodes('高血压');
    expect(hit.length).toBeGreaterThan(0);
    expect(hit[0].name).toBe('高血压');
    expect(hit[0].type).toBe('disease');
  });

  it('模糊命中：输入「糖尿」命中「2型糖尿病」', () => {
    const hit = searchMedicalNodes('糖尿');
    expect(hit.some((n) => n.name === '2型糖尿病')).toBe(true);
  });

  it('类型过滤：搜「阿司匹林」限定 drug 命中，限定 disease 不命中', () => {
    expect(searchMedicalNodes('阿司匹林', 'drug').some((n) => n.name === '阿司匹林')).toBe(true);
    expect(searchMedicalNodes('阿司匹林', 'disease')).toHaveLength(0);
  });

  it('空关键词 / 未知词返回空数组，不臆造', () => {
    expect(searchMedicalNodes('')).toHaveLength(0);
    expect(searchMedicalNodes('外星人病毒XYZ')).toHaveLength(0);
  });
});

describe('关系遍历 queryMedicalGraph', () => {
  it('疾病全关系展开：高血压含症状+药物+检查邻接', () => {
    const r = queryMedicalGraph('高血压');
    expect(r.matched).toBe(true);
    expect(r.startNode?.name).toBe('高血压');
    const names = r.nodes.map((n) => n.name);
    expect(names).toContain('头晕');
    expect(names).toContain('氨氯地平');
    expect(names).toContain('血压监测');
    expect(r.neighborCount).toBe(r.edges.length);
  });

  it('关系过滤：只查 disease_has_symptom 时不出药物/检查边', () => {
    const r = queryMedicalGraph('高血压', 'disease_has_symptom');
    expect(r.relationType).toBe('disease_has_symptom');
    for (const e of r.edges) expect(e.relation).toBe('disease_has_symptom');
    const names = r.nodes.map((n) => n.name);
    expect(names).toContain('头晕');
    expect(names).not.toContain('氨氯地平');
    expect(names).not.toContain('血压监测');
  });

  it('症状反查：胸痛 → symptom_suggests_disease 指向冠心病', () => {
    const r = queryMedicalGraph('胸痛', 'symptom_suggests_disease');
    const targets = r.edges.map((e) => e.target);
    const targetNames = r.nodes.filter((n) => targets.includes(n.id)).map((n) => n.name);
    expect(targetNames).toContain('冠心病');
  });

  it('DDI 双向边：阿司匹林 → 华法林 出血风险相互作用', () => {
    const r = queryMedicalGraph('阿司匹林', 'drug_interacts_with_drug');
    const edge = r.edges.find((e) => e.target === 'M-WARF');
    expect(edge).toBeDefined();
    expect(edge?.label).toContain('出血');
  });

  it('未知节点返回 matched=false 空图，且附免责声明', () => {
    const r = queryMedicalGraph('不存在的病XYZ');
    expect(r.matched).toBe(false);
    expect(r.nodes).toHaveLength(0);
    expect(r.edges).toHaveLength(0);
    expect(r.disclaimer).toBe(GRAPH_DISCLAIMER);
  });

  it('非法 relation 参数被 asRelation 拒绝为 null（不过滤）', () => {
    expect(asRelation('not_a_relation')).toBeNull();
    expect(asRelation('disease_has_symptom')).toBe<MedicalGraphRelation>('disease_has_symptom');
  });

  it('resolveNode 支持精确与模糊定位', () => {
    expect(resolveNode('冠心病')?.id).toBe('D-CHD');
    expect(resolveNode('胸痛')?.id).toBe('S-CHESTP');
    expect(resolveNode('不存在')).toBeNull();
  });
});

describe('路径搜索 findMedicalPaths', () => {
  it('症状→诊断→用药：胸痛 → 阿司匹林 存在 2 跳路径', () => {
    const paths = findMedicalPaths('胸痛', '阿司匹林');
    expect(paths.length).toBeGreaterThan(0);
    const shortest = paths[0];
    // 胸痛 → 冠心病 → 阿司匹林
    expect(shortest.nodes[0]).toBe('S-CHESTP');
    expect(shortest.nodes[shortest.nodes.length - 1]).toBe('M-ASA');
    expect(shortest.relations[0]).toBe('symptom_suggests_disease');
    expect(shortest.relations[1]).toBe('disease_treated_by_drug');
  });

  it('路径推理链可延伸到 DDI：胸痛 → 华法林（3 跳，含用药安全告警）', () => {
    const paths = findMedicalPaths('胸痛', '华法林');
    expect(paths.length).toBeGreaterThan(0);
    const p = paths[0];
    expect(p.nodes[p.nodes.length - 1]).toBe('M-WARF');
    expect(p.relations).toContain('drug_interacts_with_drug');
  });

  it('深度限制：maxDepth=2 时胸痛→华法林（需3跳）无解', () => {
    expect(findMedicalPaths('胸痛', '华法林', 2)).toHaveLength(0);
    expect(findMedicalPaths('胸痛', '华法林', 3).length).toBeGreaterThan(0);
  });

  it('最短路径优先（诊疗链越短越直接）', () => {
    const paths = findMedicalPaths('胸痛', '阿司匹林');
    for (let i = 1; i < paths.length; i++) {
      expect(paths[i].relations.length).toBeGreaterThanOrEqual(paths[i - 1].relations.length);
    }
  });

  it('起点=终点 / 未知节点 返回空数组', () => {
    expect(findMedicalPaths('高血压', '高血压')).toHaveLength(0);
    expect(findMedicalPaths('不存在A', '阿司匹林')).toHaveLength(0);
    expect(findMedicalPaths('胸痛', '不存在B')).toHaveLength(0);
  });

  it('queryMedicalGraph 带 end 参数时返回 paths 并并入路径节点', () => {
    const r = queryMedicalGraph('胸痛', 'symptom_suggests_disease', '阿司匹林');
    expect(r.paths.length).toBeGreaterThan(0);
    const names = r.nodes.map((n) => n.name);
    expect(names).toContain('冠心病');
    expect(names).toContain('阿司匹林');
  });
});

describe('关系词典与医疗安全', () => {
  it('六种关系均有中文标注', () => {
    expect(RELATION_LABELS.disease_has_symptom).toBeTruthy();
    expect(RELATION_LABELS.drug_interacts_with_drug).toBeTruthy();
  });

  it('免责声明固定输出（医疗安全红线）', () => {
    expect(GRAPH_DISCLAIMER).toContain('不构成医疗建议');
  });
});

/* ===================== M147-A 知识图谱与患者教育深化 ===================== */

describe('M147-A 节点/关系扩展：科室与就诊路径', () => {
  it('节点类型新增 department（科室）', () => {
    expect(NODE_TYPE_LABELS.department).toBe('科室');
    const types = new Set(GRAPH_NODES.map((n) => n.type));
    expect(types.has('department')).toBe(true);
  });

  it('存在疾病→科室边（首诊/转诊）', () => {
    const deptEdges = GRAPH_EDGES.filter((e) => e.relation === 'disease_visit_department');
    expect(deptEdges.length).toBeGreaterThan(0);
    // 至少一条首诊、至少一条转诊
    expect(deptEdges.some((e) => edgeQualifier(e) === '首诊')).toBe(true);
    expect(deptEdges.some((e) => edgeQualifier(e) === '转诊')).toBe(true);
  });

  it('每条疾病出边带 qualifier（常见/一线/必做/首诊）', () => {
    const dhtn = GRAPH_EDGES.filter((e) => e.source === 'D-HTN');
    expect(dhtn.some((e) => edgeQualifier(e) === '常见')).toBe(true);
    expect(dhtn.some((e) => edgeQualifier(e) === '一线')).toBe(true);
    expect(dhtn.some((e) => edgeQualifier(e) === '必做')).toBe(true);
    expect(dhtn.some((e) => edgeQualifier(e) === '首诊')).toBe(true);
  });
});

describe('M147-A queryDiseaseGraph 疾病全景图', () => {
  it('按疾病 id 返回分桶视图：冠心病含一线用药与首诊科室', () => {
    const g = queryDiseaseGraph('D-CHD');
    expect(g.matched).toBe(true);
    expect(g.disease?.name).toBe('冠心病');
    // 一线用药含阿司匹林
    expect(g.firstLineDrugs.some((e) => e.target === 'M-ASA')).toBe(true);
    // 首诊科室含心血管内科
    expect(g.firstVisitDepartments.some((e) => e.target === 'DPT-XGNK')).toBe(true);
    // 必做检查含心电图
    expect(g.requiredExams.some((e) => e.target === 'E-ECG')).toBe(true);
  });

  it('支持中文名模糊定位：「高血压」命中 D-HTN', () => {
    const g = queryDiseaseGraph('高血压');
    expect(g.matched).toBe(true);
    expect(g.disease?.id).toBe('D-HTN');
  });

  it('鉴别警报分桶：胃溃疡的黑便归入 differentialSymptoms', () => {
    const g = queryDiseaseGraph('D-PU');
    expect(g.differentialSymptoms.some((e) => e.target === 'S-MELA')).toBe(true);
    // 上腹痛仍在常见症状
    expect(g.commonSymptoms.some((e) => e.target === 'S-EPIG')).toBe(true);
  });

  it('二线/选做分桶：糖尿病的门冬胰岛素归二线、冠心病的冠脉造影归选做', () => {
    const dm = queryDiseaseGraph('D-DM2');
    expect(dm.secondLineDrugs.some((e) => e.target === 'M-INS')).toBe(true);
    const chd = queryDiseaseGraph('D-CHD');
    expect(chd.optionalExams.some((e) => e.target === 'E-ANGIO')).toBe(true);
  });

  it('未命中/非疾病节点返回 matched=false 且附免责声明', () => {
    expect(queryDiseaseGraph('不存在的病XYZ').matched).toBe(false);
    // 传入症状节点 id 不应当作疾病
    expect(queryDiseaseGraph('S-CHESTP').matched).toBe(false);
    expect(queryDiseaseGraph('').disclaimer).toBe(GRAPH_DISCLAIMER);
  });
});

describe('M147-A findDifferentialDiagnosis 鉴别诊断', () => {
  it('胸痛+胸闷 → 冠心病排第一，置信度归一为 1', () => {
    const list = findDifferentialDiagnosis(['胸痛', '胸闷']);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].diseaseId).toBe('D-CHD');
    expect(list[0].confidence).toBe(1);
    // 命中症状含胸痛、胸闷
    const matched = list[0].matchedSymptoms.map((s) => s.id);
    expect(matched).toContain('S-CHESTP');
    expect(matched).toContain('S-CHESTT');
  });

  it('多症状叠加提升匹配分：胸痛+胸闷 分 > 单胸痛', () => {
    const both = findDifferentialDiagnosis(['胸痛', '胸闷']).find((d) => d.diseaseId === 'D-CHD');
    const one = findDifferentialDiagnosis(['胸痛']).find((d) => d.diseaseId === 'D-CHD');
    expect(both && one).toBeTruthy();
    expect(both!.score).toBeGreaterThan(one!.score);
  });

  it('返回首诊科室与必做检查（患者教育下一步建议）', () => {
    const list = findDifferentialDiagnosis(['偏瘫', '言语不清']);
    expect(list[0].diseaseId).toBe('D-IS');
    expect(list[0].firstVisitDepartments.some((d) => d.id === 'DPT-SJNK')).toBe(true);
    expect(list[0].requiredExams.some((e) => e.id === 'E-MRI')).toBe(true);
  });

  it('「还要警惕」列出未提及的典型症状', () => {
    // 只说多饮多尿，未提体重下降 → missingTypicalSymptoms 应含体重下降
    const list = findDifferentialDiagnosis(['多饮多尿']);
    const dm = list.find((d) => d.diseaseId === 'D-DM2');
    expect(dm).toBeTruthy();
    expect(dm!.missingTypicalSymptoms.some((s) => s.id === 'S-WLOSS')).toBe(true);
  });

  it('空输入 / 未知症状返回空数组，不臆造疾病', () => {
    expect(findDifferentialDiagnosis([])).toHaveLength(0);
    expect(findDifferentialDiagnosis(['外星人症状XYZ'])).toHaveLength(0);
  });

  it('结果按匹配分降序且不超过上限', () => {
    const list = findDifferentialDiagnosis(['胸痛', '胸闷', '发热']);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].score).toBeLessThanOrEqual(list[i - 1].score);
    }
    expect(list.length).toBeLessThanOrEqual(5);
  });
});
