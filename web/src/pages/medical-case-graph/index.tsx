/**
 * 健澜科技：P2 医案智图——病历知识图谱可视化（M86-L）
 * 实体/关系/路径分析；DEMO_MODE 下由 BFF 返回内存图谱。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Input, Layout, Row, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

type NodeCategory = 'diagnosis' | 'drug' | 'symptom' | 'exam' | 'patient';
type Relation = '诊断-用药' | '症状-诊断' | '检查-诊断' | '患者-诊断';

interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  patientId?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: Relation;
}

interface PathSegment {
  id: string;
  label: string;
  relation?: Relation;
}

interface EntityDetail {
  found: boolean;
  message?: string;
  entity?: GraphNode;
  relatedPatientCount?: number;
  neighbors?: Array<{ id: string; label: string; category: NodeCategory; relation: Relation; direction: 'out' | 'in' }>;
}

/** 五色图例 */
const CATEGORY_STYLE: Record<NodeCategory, { color: string; label: string }> = {
  diagnosis: { color: '#1E5F8C', label: '诊断' },
  drug: { color: '#4A90D9', label: '药物' },
  symptom: { color: '#E8A33D', label: '症状' },
  exam: { color: '#2E8B57', label: '检查' },
  patient: { color: '#C75B5B', label: '患者' },
};

const CATEGORY_ORDER: NodeCategory[] = ['patient', 'symptom', 'diagnosis', 'exam', 'drug'];
const CATEGORY_X: Record<NodeCategory, number> = {
  patient: 80,
  symptom: 270,
  diagnosis: 520,
  exam: 770,
  drug: 1010,
};

const SVG_W = 1100;
const SVG_H = 560;
const NODE_R = 22;

/** 按分类在列内均匀分布 y 坐标 */
function layoutPositions(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  for (const cat of CATEGORY_ORDER) {
    const col = nodes.filter((n) => n.category === cat);
    if (col.length === 0) continue;
    const top = 70;
    const bottom = SVG_H - 70;
    const step = col.length === 1 ? 0 : (bottom - top) / (col.length - 1);
    col.forEach((n, i) => {
      pos.set(n.id, { x: CATEGORY_X[cat], y: top + step * i });
    });
  }
  return pos;
}

export default function MedicalCaseGraphPage() {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [searchName, setSearchName] = useState('');
  const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
  const [fromId, setFromId] = useState<string | undefined>(undefined);
  const [toId, setToId] = useState<string | undefined>(undefined);
  const [paths, setPaths] = useState<PathSegment[][]>([]);
  const [pathsLoading, setPathsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nodesResp, edgesResp] = await Promise.all([
          get<{ nodes: GraphNode[] }>('/api/v1/medical-case-graph/nodes'),
          get<{ edges: GraphEdge[] }>('/api/v1/medical-case-graph/edges'),
        ]);
        if (!cancelled) {
          setNodes(nodesResp.nodes ?? []);
          setEdges(edgesResp.edges ?? []);
        }
      } catch (e) {
        if (!cancelled) message.error('图谱数据加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const positions = useMemo(() => layoutPositions(nodes), [nodes]);

  const nodeOptions = useMemo(
    () =>
      nodes.map((n) => ({
        value: n.id,
        label: `${n.label}（${CATEGORY_STYLE[n.category].label}）`,
      })),
    [nodes],
  );

  const handleSearch = async () => {
    const name = searchName.trim();
    if (!name) return;
    try {
      const resp = await get<EntityDetail>(`/api/v1/medical-case-graph/entity/${encodeURIComponent(name)}`);
      setEntityDetail(resp);
      if (!resp.found) message.warning(resp.message ?? '未找到该实体');
    } catch {
      message.error('实体查询失败');
    }
  };

  const handleAnalyzePath = async () => {
    if (!fromId || !toId) {
      message.warning('请先选择起点与终点实体');
      return;
    }
    if (fromId === toId) {
      message.info('起点与终点相同');
      return;
    }
    setPathsLoading(true);
    try {
      const resp = await get<{ paths: PathSegment[][] }>('/api/v1/medical-case-graph/paths', {
        from: fromId,
        to: toId,
      });
      setPaths(resp.paths ?? []);
      if (!resp.paths || resp.paths.length === 0) message.info('未发现 2 跳以内的关联路径');
    } catch {
      message.error('路径分析失败');
    } finally {
      setPathsLoading(false);
    }
  };

  /** 高亮：被实体搜索命中或在当前路径中的节点/边 */
  const highlightedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (entityDetail?.entity) set.add(entityDetail.entity.id);
    for (const p of paths) for (const seg of p) set.add(seg.id);
    return set;
  }, [entityDetail, paths]);

  const highlightedEdges = useMemo(() => {
    const set = new Set<string>();
    for (const p of paths) {
      for (let i = 0; i < p.length - 1; i++) {
        set.add(`${p[i].id}->${p[i + 1].id}`);
        set.add(`${p[i + 1].id}->${p[i].id}`);
      }
    }
    return set;
  }, [paths]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>
          医案智图 · 病历知识图谱
        </Title>
        <Paragraph type="secondary">实体关系网络 · 路径推理 · 实体详情（脱敏演示数据）</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={16}>
                <Card title="知识图谱画布" size="small" style={{ marginBottom: 16 }}>
                  <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ background: '#fff', border: '1px solid #eef1f5', borderRadius: 8 }}>
                    {/* 列标题 */}
                    {CATEGORY_ORDER.map((cat) => (
                      <text key={cat} x={CATEGORY_X[cat]} y={30} textAnchor="middle" fontSize={12} fill={VI.mid} fontWeight={600}>
                        {CATEGORY_STYLE[cat].label}
                      </text>
                    ))}
                    {/* 边 */}
                    {edges.map((e, idx) => {
                      const sp = positions.get(e.source);
                      const tp = positions.get(e.target);
                      if (!sp || !tp) return null;
                      const isHi = highlightedEdges.has(`${e.source}->${e.target}`);
                      return (
                        <g key={`e-${idx}`}>
                          <line
                            x1={sp.x}
                            y1={sp.y}
                            x2={tp.x}
                            y2={tp.y}
                            stroke={isHi ? VI.accent : '#c9d4e0'}
                            strokeWidth={isHi ? 2.5 : 1.2}
                            strokeDasharray={e.relation === '患者-诊断' ? '4 3' : undefined}
                          />
                          <text
                            x={(sp.x + tp.x) / 2}
                            y={(sp.y + tp.y) / 2 - 4}
                            fontSize={9}
                            fill={isHi ? VI.accent : '#9aa9b8'}
                            textAnchor="middle"
                          >
                            {e.relation}
                          </text>
                        </g>
                      );
                    })}
                    {/* 节点 */}
                    {nodes.map((n) => {
                      const p = positions.get(n.id);
                      if (!p) return null;
                      const color = CATEGORY_STYLE[n.category].color;
                      const isHi = highlightedNodeIds.has(n.id);
                      return (
                        <g key={n.id} transform={`translate(${p.x},${p.y})`}>
                          <circle
                            r={NODE_R}
                            fill={color}
                            fillOpacity={isHi ? 1 : 0.85}
                            stroke={isHi ? VI.deep : '#fff'}
                            strokeWidth={isHi ? 3 : 1.5}
                          />
                          <text y={4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>
                            {n.label.length > 5 ? n.label.slice(0, 5) : n.label}
                          </text>
                          <text y={NODE_R + 14} textAnchor="middle" fontSize={10} fill={VI.deep}>
                            {n.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <Space wrap size={[8, 8]} style={{ marginTop: 12 }}>
                    {(Object.keys(CATEGORY_STYLE) as NodeCategory[]).map((cat) => (
                      <Tag key={cat} color={CATEGORY_STYLE[cat].color}>
                        {CATEGORY_STYLE[cat].label}
                      </Tag>
                    ))}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      实线=诊断/用药/症状/检查关联；虚线=患者-诊断归属
                    </Text>
                  </Space>
                </Card>
              </Col>

              <Col span={8}>
                <Card title="实体查询" size="small" style={{ marginBottom: 16 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="输入实体名，如：二甲双胍 / 2型糖尿病"
                      prefix={<SearchOutlined />}
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onPressEnter={handleSearch}
                      allowClear
                    />
                    <button onClick={handleSearch} style={primaryBtnStyle} type="button">
                      查询
                    </button>
                  </Space.Compact>
                  {entityDetail?.found && entityDetail.entity && (
                    <div style={{ marginTop: 12 }}>
                      <Text strong style={{ color: VI.deep }}>
                        {entityDetail.entity.label}
                      </Text>
                      <Tag color={CATEGORY_STYLE[entityDetail.entity.category].color} style={{ marginLeft: 8 }}>
                        {CATEGORY_STYLE[entityDetail.entity.category].label}
                      </Tag>
                      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 4 }}>
                        关联患者数（2 跳内）：<Text strong>{entityDetail.relatedPatientCount ?? 0}</Text>
                      </Paragraph>
                      <div>
                        {(entityDetail.neighbors ?? []).map((nb) => (
                          <Tag key={nb.id} style={{ marginBottom: 4 }} color={CATEGORY_STYLE[nb.category].color}>
                            {nb.direction === 'out' ? '→' : '←'} {nb.label}（{nb.relation}）
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                <Card title="路径分析（2 跳）" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="起点实体"
                      options={nodeOptions}
                      value={fromId}
                      onChange={setFromId}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                    />
                    <Select
                      style={{ width: '100%' }}
                      placeholder="终点实体"
                      options={nodeOptions}
                      value={toId}
                      onChange={setToId}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                    />
                    <button onClick={handleAnalyzePath} style={primaryBtnStyle} type="button" disabled={pathsLoading}>
                      {pathsLoading ? '分析中…' : '分析路径'}
                    </button>
                    {paths.length > 0 && (
                      <div>
                        <Text strong style={{ color: VI.deep }}>
                          命中 {paths.length} 条路径：
                        </Text>
                        {paths.map((p, i) => (
                          <div key={i} style={{ marginTop: 6, padding: 8, background: '#f5f9ff', borderRadius: 6 }}>
                            {p.map((seg, j) => (
                              <span key={j}>
                                {j > 0 && <Text type="secondary" style={{ fontSize: 12 }}> —{seg.relation ?? ''}→ </Text>}
                                <Text strong style={{ color: VI.mid }}>
                                  {seg.label}
                                </Text>
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  background: VI.mid,
  color: '#fff',
  border: 'none',
  padding: '4px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
};
