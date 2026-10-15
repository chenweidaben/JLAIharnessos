/**
 * 健澜科技 jlmedaios - 医学知识图谱可视化页（M147-A 知识图谱与患者教育）
 *
 * 纯 SVG 径向力导布局（零新增依赖）：中心为疾病，四周按「症状/药物/检查/科室」
 * 放射排布；边按 qualifier 着色（一线/必做/首诊为深海蓝实线，二线/选做为灰虚线）。
 * 左侧支持主诉症状反查鉴别诊断 TopN，附置信度与下一步就诊建议。
 *
 * 视觉规范：深海蓝 VI（#0a4d8c 主色），与全站 variables.css 对齐。
 * 医疗安全：底部固定免责声明，结果仅供参考、不构成医疗建议。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Input, Layout, List, Space, Spin, Tag, Typography } from 'antd';
import { get } from '@/api/client';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

/* ------------------------------- 与 BFF 对齐的类型 ------------------------------- */

type NodeType = 'disease' | 'symptom' | 'drug' | 'exam' | 'surgery' | 'department';

interface GNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  evidenceLevel: number;
}

interface GEdge {
  source: string;
  target: string;
  relation: string;
  label: string;
  weight: number;
  qualifier?: string;
}

interface DiseaseGraphView {
  disease: GNode | null;
  commonSymptoms: GEdge[];
  differentialSymptoms: GEdge[];
  firstLineDrugs: GEdge[];
  secondLineDrugs: GEdge[];
  requiredExams: GEdge[];
  optionalExams: GEdge[];
  firstVisitDepartments: GEdge[];
  referralDepartments: GEdge[];
  surgeries: GEdge[];
  nodes: GNode[];
  edges: GEdge[];
  matched: boolean;
  disclaimer: string;
}

interface DiagnosisItem {
  diseaseId: string;
  diseaseName: string;
  score: number;
  confidence: number;
  matchedSymptoms: GNode[];
  missingTypicalSymptoms: GNode[];
  firstVisitDepartments: GNode[];
  firstLineDrugs: GNode[];
  requiredExams: GNode[];
}

/* ------------------------------- 深海蓝 VI 配色 ------------------------------- */

const VI = {
  primary: '#0a4d8c',
  primaryDark: '#073a6b',
  primaryLight: '#1a6bb8',
  blue: '#1890ff',
  cyan: '#13c2c2',
  success: '#52c41a',
  warning: '#fa8c16',
  gray: '#8c8c8c',
  bg: '#f5f7fa',
  border: '#e8ecf1',
};

const NODE_COLOR: Record<NodeType, string> = {
  disease: VI.primary,
  symptom: VI.blue,
  drug: VI.cyan,
  exam: VI.success,
  department: VI.warning,
  surgery: VI.gray,
};

const NODE_LABEL: Record<NodeType, string> = {
  disease: '疾病',
  symptom: '症状',
  drug: '药物',
  exam: '检查',
  surgery: '手术',
  department: '科室',
};

/** 预置疾病快捷入口（与聚合器种子 id 对齐） */
const PRESET_DISEASES: Array<{ id: string; name: string }> = [
  { id: 'D-HTN', name: '高血压' },
  { id: 'D-DM2', name: '2型糖尿病' },
  { id: 'D-CHD', name: '冠心病' },
  { id: 'D-CAP', name: '社区获得性肺炎' },
  { id: 'D-PU', name: '胃溃疡' },
  { id: 'D-IS', name: '脑梗死' },
];

/* ------------------------------- 径向布局计算 ------------------------------- */

interface Positioned {
  node: GNode;
  x: number;
  y: number;
}

/**
 * 确定性径向布局：中心放疾病，按类型分四个象限环带。
 * 无物理迭代、无外部依赖，渲染稳定。
 */
function layoutGraph(view: DiseaseGraphView): { nodes: Positioned[]; width: number; height: number } {
  const width = 760;
  const height = 520;
  const cx = width / 2;
  const cy = height / 2;
  const out: Positioned[] = [];
  if (view.disease) {
    out.push({ node: view.disease, x: cx, y: cy });
  }

  const buckets: Array<{ edges: GEdge[]; angle: number; radius: number }> = [
    { edges: [...view.commonSymptoms, ...view.differentialSymptoms], angle: -90, radius: 190 }, // 上：症状
    { edges: [...view.firstLineDrugs, ...view.secondLineDrugs], angle: 0, radius: 210 }, // 右：药物
    { edges: [...view.requiredExams, ...view.optionalExams, ...view.surgeries], angle: 90, radius: 190 }, // 下：检查
    { edges: [...view.firstVisitDepartments, ...view.referralDepartments], angle: 180, radius: 200 }, // 左：科室
  ];

  const nodeById = new Map(view.nodes.map((n) => [n.id, n]));
  for (const b of buckets) {
    const n = b.edges.length;
    b.edges.forEach((e, i) => {
      const node = nodeById.get(e.target);
      if (!node) return;
      // 在该象限 ±35° 扇区内均布
      const spread = n > 1 ? 70 : 0;
      const a = ((b.angle + (n > 1 ? -spread / 2 + (spread * i) / (n - 1) : 0)) * Math.PI) / 180;
      out.push({ node, x: cx + b.radius * Math.cos(a), y: cy + b.radius * Math.sin(a) });
    });
  }
  return { nodes: out, width, height };
}

/* --------------------------------- 主组件 --------------------------------- */

export default function MedicalGraphVisualizer() {
  const [diseaseId, setDiseaseId] = useState<string>('D-CHD');
  const [view, setView] = useState<DiseaseGraphView | null>(null);
  const [loading, setLoading] = useState(false);
  const [symptomInput, setSymptomInput] = useState('胸痛,胸闷');
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  const loadDisease = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await get<DiseaseGraphView>(`/api/v1/graph/disease/${encodeURIComponent(id)}`);
      setView(data);
    } catch {
      setView(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDisease(diseaseId);
  }, [diseaseId, loadDisease]);

  const runDifferential = useCallback(async () => {
    setDiagLoading(true);
    try {
      const q = symptomInput.split(/[,，、\s]+/).filter(Boolean).join(',');
      const data = await get<{ items: DiagnosisItem[]; total: number }>(
        '/api/v1/graph/differential',
        { symptoms: q },
      );
      setDiagnoses(data.items ?? []);
    } catch {
      setDiagnoses([]);
    } finally {
      setDiagLoading(false);
    }
  }, [symptomInput]);

  const positioned = useMemo(() => (view ? layoutGraph(view) : null), [view]);
  const posById = useMemo(
    () => new Map((positioned?.nodes ?? []).map((p) => [p.node.id, p])),
    [positioned],
  );

  return (
    <Content style={{ padding: 24, background: VI.bg }}>
      <Title level={3} style={{ color: VI.primaryDark, marginBottom: 4 }}>
        医学知识图谱 · 患者教育
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        疾病全景图：常见/鉴别症状、一线/二线用药、必做/选做检查、首诊/转诊科室，一图读懂诊疗路径。
      </Paragraph>

      <Space style={{ marginBottom: 16 }} wrap>
        {PRESET_DISEASES.map((d) => (
          <Button
            key={d.id}
            type={diseaseId === d.id ? 'primary' : 'default'}
            onClick={() => setDiseaseId(d.id)}
            style={diseaseId === d.id ? { background: VI.primary, borderColor: VI.primary } : undefined}
          >
            {d.name}
          </Button>
        ))}
      </Space>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderColor: VI.primaryLight, background: '#eef4fb' }}
        message={view?.disclaimer ?? '本图谱内容整理自权威医学指南，仅供临床参考，不构成医疗建议。'}
      />

      <Spin spinning={loading}>
        <Card
          style={{ marginBottom: 16, borderTop: `3px solid ${VI.primary}` }}
          title={
            <Space>
              <span style={{ color: VI.primary }}>疾病全景图</span>
              <Tag color={VI.primary}>{view?.disease?.name ?? '未选择'}</Tag>
            </Space>
          }
        >
          {positioned && view && (
            <svg width={positioned.width} height={positioned.height} style={{ background: '#fff', borderRadius: 8 }}>
              {/* 边 */}
              {view.edges.map((e, i) => {
                const a = posById.get(e.source);
                const b = posById.get(e.target);
                if (!a || !b) return null;
                const key = `${e.source}-${e.target}-${i}`;
                const emphasis = e.qualifier === '一线' || e.qualifier === '必做' || e.qualifier === '首诊';
                return (
                  <line
                    key={key}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={emphasis ? VI.primaryLight : VI.gray}
                    strokeWidth={emphasis ? 1.6 : 1}
                    strokeDasharray={emphasis ? undefined : '4 3'}
                    opacity={0.7}
                  />
                );
              })}
              {/* 节点 */}
              {positioned.nodes.map((p) => (
                <g key={p.node.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.node.type === 'disease' ? 26 : 16}
                    fill={NODE_COLOR[p.node.type]}
                    opacity={p.node.type === 'disease' ? 1 : 0.9}
                  />
                  <text
                    x={p.x}
                    y={p.y + (p.node.type === 'disease' ? 42 : 4)}
                    textAnchor="middle"
                    fontSize={p.node.type === 'disease' ? 14 : 11}
                    fill={VI.primaryDark}
                  >
                    {p.node.name}
                  </text>
                </g>
              ))}
            </svg>
          )}
          {/* 图例 */}
          <Space wrap style={{ marginTop: 8 }}>
            {(Object.keys(NODE_LABEL) as NodeType[]).map((t) => (
              <Space key={t} size={4}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: NODE_COLOR[t] }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{NODE_LABEL[t]}</Text>
              </Space>
            ))}
          </Space>
        </Card>
      </Spin>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card size="small" title={<Text strong style={{ color: VI.primary }}>鉴别诊断（主诉症状反查）</Text>}>
            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
              <Input
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                placeholder="输入主诉症状，逗号分隔，如：胸痛,胸闷"
              />
              <Button type="primary" style={{ background: VI.primary }} onClick={runDifferential} loading={diagLoading}>
                反查
              </Button>
            </Space.Compact>
            <List
              size="small"
              dataSource={diagnoses}
              locale={{ emptyText: '输入症状后点击「反查」' }}
              renderItem={(d) => (
                <List.Item>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Space>
                      <Tag color={VI.primary}>{d.diseaseName}</Tag>
                      <Text type="secondary">置信度 {Math.round(d.confidence * 100)}%</Text>
                    </Space>
                    {d.firstVisitDepartments.length > 0 && (
                      <Text style={{ fontSize: 12 }}>
                        首诊：{d.firstVisitDepartments.map((x) => x.name).join('、')}
                      </Text>
                    )}
                    {d.missingTypicalSymptoms.length > 0 && (
                      <Text style={{ fontSize: 12, color: VI.warning }}>
                        还要警惕：{d.missingTypicalSymptoms.map((x) => x.name).join('、')}
                      </Text>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title={<Text strong style={{ color: VI.primary }}>诊疗路径分桶</Text>}>
            {view && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>常见症状：{view.commonSymptoms.map((e) => e.target).join('、') || '—'}</Text>
                <Text>鉴别警报：{view.differentialSymptoms.map((e) => e.target).join('、') || '—'}</Text>
                <Text>一线用药：{view.firstLineDrugs.map((e) => e.target).join('、') || '—'}</Text>
                <Text>必做检查：{view.requiredExams.map((e) => e.target).join('、') || '—'}</Text>
                <Text>首诊科室：{view.firstVisitDepartments.map((e) => e.target).join('、') || '—'}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  用药与检查建议请由执业医师结合患者实际判断。
                </Text>
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </Content>
  );
}
