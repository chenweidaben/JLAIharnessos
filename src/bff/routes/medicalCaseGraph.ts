/** 健澜科技：P2 医案智图——病历知识图谱（M86-L）。DEMO_MODE 下内存图谱数据。 */
import { json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 图谱节点分类 */
type NodeCategory = 'diagnosis' | 'drug' | 'symptom' | 'exam' | 'patient';

interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  /** 患者节点可选：脱敏患者标识 */
  patientId?: string;
}

type Relation = '诊断-用药' | '症状-诊断' | '检查-诊断' | '患者-诊断';

interface GraphEdge {
  source: string;
  target: string;
  relation: Relation;
}

/** 内存演示图谱：脱敏患者（张某某/李某某两类），诊断/药物/症状/检查四类临床实体 */
const demoNodes: GraphNode[] = [
  // 患者（脱敏）
  { id: 'P-ZHANG', label: '张**', category: 'patient', patientId: 'MRN-2026-0001' },
  { id: 'P-LI', label: '李**', category: 'patient', patientId: 'MRN-2026-0002' },
  // 诊断
  { id: 'D-DM2', label: '2型糖尿病', category: 'diagnosis' },
  { id: 'D-HTN', label: '高血压', category: 'diagnosis' },
  { id: 'D-CHD', label: '冠心病', category: 'diagnosis' },
  { id: 'D-COPD', label: '慢性阻塞性肺疾病', category: 'diagnosis' },
  // 药物
  { id: 'G-MET', label: '二甲双胍', category: 'drug' },
  { id: 'G-INS', label: '甘精胰岛素', category: 'drug' },
  { id: 'G-AML', label: '氨氯地平', category: 'drug' },
  { id: 'G-ATOR', label: '阿托伐他汀', category: 'drug' },
  // 症状
  { id: 'S-POLY', label: '多饮多尿', category: 'symptom' },
  { id: 'S-HEAD', label: '头晕头痛', category: 'symptom' },
  { id: 'S-CHEST', label: '胸闷胸痛', category: 'symptom' },
  { id: 'S-DYSP', label: '活动后气促', category: 'symptom' },
  // 检查
  { id: 'E-FBG', label: '空腹血糖', category: 'exam' },
  { id: 'E-HBA1C', label: '糖化血红蛋白', category: 'exam' },
  { id: 'E-BP', label: '诊室血压', category: 'exam' },
  { id: 'E-ECG', label: '心电图', category: 'exam' },
];

const demoEdges: GraphEdge[] = [
  // 患者-诊断
  { source: 'P-ZHANG', target: 'D-DM2', relation: '患者-诊断' },
  { source: 'P-ZHANG', target: 'D-HTN', relation: '患者-诊断' },
  { source: 'P-LI', target: 'D-HTN', relation: '患者-诊断' },
  { source: 'P-LI', target: 'D-CHD', relation: '患者-诊断' },
  { source: 'P-LI', target: 'D-COPD', relation: '患者-诊断' },
  // 诊断-用药
  { source: 'D-DM2', target: 'G-MET', relation: '诊断-用药' },
  { source: 'D-DM2', target: 'G-INS', relation: '诊断-用药' },
  { source: 'D-HTN', target: 'G-AML', relation: '诊断-用药' },
  { source: 'D-CHD', target: 'G-ATOR', relation: '诊断-用药' },
  { source: 'D-CHD', target: 'G-AML', relation: '诊断-用药' },
  // 症状-诊断
  { source: 'S-POLY', target: 'D-DM2', relation: '症状-诊断' },
  { source: 'S-HEAD', target: 'D-HTN', relation: '症状-诊断' },
  { source: 'S-CHEST', target: 'D-CHD', relation: '症状-诊断' },
  { source: 'S-DYSP', target: 'D-COPD', relation: '症状-诊断' },
  // 检查-诊断
  { source: 'E-FBG', target: 'D-DM2', relation: '检查-诊断' },
  { source: 'E-HBA1C', target: 'D-DM2', relation: '检查-诊断' },
  { source: 'E-BP', target: 'D-HTN', relation: '检查-诊断' },
  { source: 'E-ECG', target: 'D-CHD', relation: '检查-诊断' },
];

/** 按 id 查节点 */
function findNode(idOrLabel: string): GraphNode | undefined {
  const key = idOrLabel.trim();
  return demoNodes.find((n) => n.id === key || n.label === key);
}

/** 邻接表（无向，便于路径搜索） */
function neighborsOf(id: string): Array<{ node: GraphNode; relation: Relation; direction: 'out' | 'in' }> {
  const out: Array<{ node: GraphNode; relation: Relation; direction: 'out' | 'in' }> = [];
  for (const e of demoEdges) {
    if (e.source === id) {
      const t = demoNodes.find((n) => n.id === e.target);
      if (t) out.push({ node: t, relation: e.relation, direction: 'out' });
    } else if (e.target === id) {
      const s = demoNodes.find((n) => n.id === e.source);
      if (s) out.push({ node: s, relation: e.relation, direction: 'in' });
    }
  }
  return out;
}

/** DFS 找 1~maxHops 跳路径（最多返回 6 条，按跳数升序） */
function findPaths(fromId: string, toId: string, maxHops = 2): Array<Array<{ id: string; label: string; relation?: Relation }>> {
  const results: Array<Array<{ id: string; label: string; relation?: Relation }>> = [];
  const dfs = (cur: string, target: string, visited: Set<string>, path: Array<{ id: string; label: string; relation?: Relation }>, depth: number): void => {
    if (depth > maxHops) return;
    for (const nb of neighborsOf(cur)) {
      if (visited.has(nb.node.id)) continue;
      const nextPath = [...path, { id: nb.node.id, label: nb.node.label, relation: nb.relation }];
      if (nb.node.id === target) {
        results.push(nextPath);
        if (results.length >= 6) return;
      } else {
        visited.add(nb.node.id);
        dfs(nb.node.id, target, visited, nextPath, depth + 1);
        visited.delete(nb.node.id);
        if (results.length >= 6) return;
      }
    }
  };
  const startNode = demoNodes.find((n) => n.id === fromId);
  if (!startNode) return results;
  dfs(fromId, toId, new Set([fromId]), [{ id: startNode.id, label: startNode.label }], 1);
  return results;
}

/** 统计某实体关联的患者数（经过诊断节点 2 跳可达） */
function relatedPatientCount(nodeId: string): number {
  const patients = new Set<string>();
  for (const p of demoNodes.filter((n) => n.category === 'patient')) {
    if (findPaths(nodeId, p.id, 2).length > 0) patients.add(p.id);
  }
  return patients.size;
}

export const medicalCaseGraphRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medical-case-graph/nodes',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ nodes: [] }));
      void c;
      return json(ok({ nodes: demoNodes, total: demoNodes.length }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/medical-case-graph/edges',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ edges: [] }));
      void c;
      return json(ok({ edges: demoEdges, total: demoEdges.length }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/medical-case-graph/paths',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ paths: [] }));
      const fromKey = c.query.get('from') ?? '';
      const toKey = c.query.get('to') ?? '';
      if (!fromKey || !toKey) {
        return json(ok({ paths: [], message: '缺少 from/to 参数' }));
      }
      const fromNode = findNode(fromKey);
      const toNode = findNode(toKey);
      if (!fromNode || !toNode) {
        return json(ok({ paths: [], message: '实体不存在' }));
      }
      const paths = findPaths(fromNode.id, toNode.id, 2);
      return json(ok({ from: fromNode.label, to: toNode.label, paths }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/medical-case-graph/entity/:name',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok(null));
      const node = findNode(c.params.name);
      if (!node) {
        return json(ok({ found: false, message: `实体不存在：${c.params.name}` }));
      }
      const neighbors = neighborsOf(node.id).map((nb) => ({
        id: nb.node.id,
        label: nb.node.label,
        category: nb.node.category,
        relation: nb.relation,
        direction: nb.direction,
      }));
      return json(
        ok({
          found: true,
          entity: node,
          relatedPatientCount: relatedPatientCount(node.id),
          neighbors,
        }),
      );
    },
  },
];
