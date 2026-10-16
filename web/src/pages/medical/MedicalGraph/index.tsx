/**
 * 健澜科技 jlmedaios - 医学知识图谱深化页（M169-A，知识图谱与 Personal Agent）
 *
 * 与既有「医学知识图谱」（/medical/Graph，一跳邻接）互补：本页面向 Personal Agent
 * 主动健康干预场景，一键展开疾病的多跳深度图谱：
 *   - 根疾病（深海蓝）→ 症状（琥珀，带阳性率）→ 反推疾病 / 一线二线禁忌用药 /
 *     必做选做鉴别检查 / 近期远期并发症 / 首诊转诊科室；
 *   - 右侧栏：相关疾病 TopK（Jaccard 共病提示）+ 药物相互作用自检；
 *   - 边标签区分「一线/二线/禁忌」「必做/选做/鉴别」「近期/远期」「首诊/转诊」。
 *
 * 视觉规范：健澜深海蓝 VI（主色 #0A4D8C），力导向图 ECharts graph。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { AimOutlined, SearchOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------- 类型契约 ------------------------------- */
interface DeepNode {
  id: string;
  name: string;
  type: 'disease' | 'symptom' | 'drug' | 'exam' | 'surgery' | 'department';
  description: string;
  sources: Array<{ name: string; year?: string }>;
  evidenceLevel: number;
}
interface DeepEdge {
  source: string;
  target: string;
  relation: string;
  label: string;
  weight: number;
  qualifier?: string;
  positiveRate?: number;
}
interface DeepGraphView {
  disease: DeepNode | null;
  nodes: DeepNode[];
  edges: DeepEdge[];
  layers: Array<{ layer: number; nodeIds: string[] }>;
  depth: number;
  matched: boolean;
  disclaimer: string;
}
interface RelatedDiseaseView {
  disease: DeepNode;
  similarity: number;
  sharedNodeIds: string[];
  sharedNodeNames: string[];
}
interface InteractionPairView {
  drugA: DeepNode;
  drugB: DeepNode;
  riskLevel: 'high' | 'medium' | 'low';
  label: string;
  weight: number;
}
interface InteractionsView {
  pairs: InteractionPairView[];
  unknownDrugs: string[];
  checkedCount: number;
  disclaimer: string;
}

/* --------------------------- 深海蓝 VI 配色 --------------------------- */
const TYPE_COLOR: Record<DeepNode['type'], string> = {
  disease: '#0A4D8C', // 深海蓝（主色）
  symptom: '#FAAD14', // 琥珀
  drug: '#13C2C2',    // 青
  exam: '#1890FF',    // 亮蓝
  surgery: '#722ED1', // 紫
  department: '#52C41A', // 绿
};
const TYPE_LABEL: Record<DeepNode['type'], string> = {
  disease: '疾病', symptom: '症状', drug: '药物', exam: '检查', surgery: '手术', department: '科室',
};
const RELATION_LABEL: Record<string, string> = {
  disease_has_symptom: '症状',
  disease_treated_by_drug: '用药',
  symptom_suggests_disease: '提示',
  drug_interacts_with_drug: '相互作用',
  disease_needs_exam: '检查',
  disease_has_surgery: '手术',
  disease_visit_department: '科室',
  disease_has_complication: '并发症',
};
const RISK_COLOR: Record<InteractionPairView['riskLevel'], string> = {
  high: '#F5222D',
  medium: '#FAAD14',
  low: '#52C41A',
};
const watermarkText = ['健澜科技', '知识图谱 · Personal Agent', 'jlmedaios'];

/** 候选疾病快捷按钮 */
const PRESET_DISEASES = ['高血压', '2型糖尿病', '冠心病', '社区获得性肺炎', '胃溃疡', '脑梗死'];

/**
 * 把后端 DeepGraphView 编译为 ECharts 力导向图 option。
 * 根疾病放大高亮；禁忌边标红、并发症边紫色加粗；症状边 tooltip 显示阳性率。
 */
function buildOption(view: DeepGraphView): EChartsOption {
  const idSet = new Set(view.nodes.map((n) => n.id));
  return {
    backgroundColor: '#FFFFFF',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#E8ECF1',
      textStyle: { color: '#262626', fontSize: 12 },
      formatter: (p: unknown) => {
        const item = p as { dataType?: string; data?: Record<string, unknown> };
        if (item.dataType === 'edge') {
          const d = item.data ?? {};
          return `${String(d.value ?? '')}<br/><span style="color:#8c8c8c">权重 ${Number(d.w ?? 0).toFixed(2)}</span>`;
        }
        const d = item.data ?? {};
        return `<b>${p.name}</b><br/>类型：${String(d.tname ?? '')}<br/>${String(d.desc ?? '')}<br/><span style="color:#8c8c8c">${String(d.src ?? '')}</span>`;
      },
    },
    legend: {
      data: Object.values(TYPE_LABEL),
      bottom: 8,
      textStyle: { color: '#262626' },
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        categories: Object.entries(TYPE_LABEL).map(([value, name]) => ({
          name,
          itemStyle: { color: TYPE_COLOR[value as DeepNode['type']] },
        })),
        force: { repulsion: 380, edgeLength: [60, 140], gravity: 0.08 },
        label: { show: true, position: 'right', fontSize: 11, color: '#262626' },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 6,
        lineStyle: { color: '#9DB8D2', width: 1.2, curveness: 0.12 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
        data: view.nodes
          .filter((n) => idSet.has(n.id))
          .map((n) => ({
            id: n.id,
            name: n.name,
            symbolSize: n.id === view.disease?.id ? 58 : 32,
            category: TYPE_LABEL[n.type],
            itemStyle: {
              color: TYPE_COLOR[n.type],
              borderColor: n.id === view.disease?.id ? '#F5222D' : '#fff',
              borderWidth: n.id === view.disease?.id ? 2.5 : 1,
            },
            desc: n.description,
            tname: TYPE_LABEL[n.type],
            src: n.sources.map((s) => s.name).join(' / '),
          })),
        links: view.edges
          .filter((e) => idSet.has(e.source) && idSet.has(e.target))
          .map((e) => {
            const isContra = e.qualifier === '禁忌';
            const isCompl = e.relation === 'disease_has_complication';
            const label = e.qualifier ? `${e.label}·${e.qualifier}` : e.label;
            return {
              source: e.source,
              target: e.target,
              value: label,
              w: e.weight,
              label: { show: true, formatter: label, fontSize: 10, color: '#5B7A9E' },
              lineStyle: {
                width: isContra ? 2.6 : isCompl ? 2.0 : 1.2,
                color: isContra ? '#F5222D' : isCompl ? '#722ED1' : '#9DB8D2',
                type: isContra ? 'dashed' : 'solid',
              },
            };
          }),
      },
    ],
  } as EChartsOption;
}

export default function MedicalGraphDeepPage() {
  const [disease, setDisease] = useState('高血压');
  const [depth, setDepth] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<DeepGraphView | null>(null);
  const [related, setRelated] = useState<RelatedDiseaseView[]>([]);
  const [interactions, setInteractions] = useState<InteractionsView | null>(null);

  const load = useCallback(async () => {
    if (!disease.trim()) {
      setError('请输入疾病名（如 高血压 / 2型糖尿病）');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [deep, rel] = await Promise.all([
        get<DeepGraphView>('/api/v1/medical-graph', { disease: disease.trim(), depth: String(depth) }),
        get<{ items: RelatedDiseaseView[] }>('/api/v1/medical-graph', {
          mode: 'related',
          disease: disease.trim(),
          topK: '5',
        }),
      ]);
      setView(deep);
      setRelated(rel.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '知识图谱加载失败');
    } finally {
      setLoading(false);
    }
  }, [disease, depth]);

  // 药物相互作用自检：默认校验该疾病的一线用药组合（高血压示例：氨氯地平+阿司匹林+华法林 会命中出血风险）
  useEffect(() => {
    const drugsMap: Record<string, string> = {
      '高血压': '氨氯地平,缬沙坦,阿司匹林,华法林',
      '2型糖尿病': '二甲双胍,门冬胰岛素',
      '冠心病': '阿司匹林,阿托伐他汀,氯吡格雷,华法林',
      '社区获得性肺炎': '阿莫西林,头孢呋辛,克拉霉素,阿托伐他汀',
      '胃溃疡': '奥美拉唑,铝碳酸镁,阿司匹林',
      '脑梗死': '阿司匹林,氯吡格雷,阿托伐他汀',
    };
    const drugs = drugsMap[disease.trim()] ?? '阿司匹林,华法林';
    get<InteractionsView>('/api/v1/medical-graph', { mode: 'interactions', drugs })
      .then(setInteractions)
      .catch(() => setInteractions(null));
  }, [disease]);

  useEffect(() => { load(); }, [load]);

  return (
    <Watermark content={watermarkText} style={{ minHeight: '100vh', background: '#F4F7FB' }}>
      <Layout>
        <Header style={{ background: '#0A4D8C', padding: '0 24px' }}>
          <Space size="middle">
            <AimOutlined style={{ color: '#fff', fontSize: 20 }} />
            <Title level={4} style={{ color: '#fff', margin: 0 }}>医学知识图谱深化 · Personal Agent</Title>
            <Text style={{ color: '#BFD4EA' }}>疾病多跳展开 / 相关疾病 / 药物相互作用</Text>
          </Space>
        </Header>
        <Content style={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card size="small">
                <Space wrap>
                  <Text strong>疾病：</Text>
                  <Input
                    style={{ width: 200 }}
                    value={disease}
                    onChange={(e) => setDisease(e.target.value)}
                    onPressEnter={load}
                    prefix={<SearchOutlined />}
                  />
                  <Text strong>深度：</Text>
                  <Select
                    value={depth}
                    style={{ width: 100 }}
                    onChange={setDepth}
                    options={[
                      { value: 1, label: '1 跳' },
                      { value: 2, label: '2 跳' },
                      { value: 3, label: '3 跳' },
                    ]}
                  />
                  <Button type="primary" style={{ background: '#0A4D8C' }} onClick={load} loading={loading}>
                    展开图谱
                  </Button>
                  <Space wrap size={[4, 4]}>
                    {PRESET_DISEASES.map((d) => (
                      <Tag key={d} color="blue" style={{ cursor: 'pointer' }} onClick={() => setDisease(d)}>
                        {d}
                      </Tag>
                    ))}
                  </Space>
                </Space>
              </Card>
            </Col>

            {error && (
              <Col span={24}>
                <Alert type="error" showIcon message={error} />
              </Col>
            )}

            <Col xs={24} xl={16}>
              <Card
                title={
                  <Space>
                    <SafetyCertificateOutlined style={{ color: '#0A4D8C' }} />
                    <span>深度知识图谱（{view?.disease?.name ?? disease} · {view?.depth ?? 0} 跳）</span>
                  </Space>
                }
                extra={<Text type="secondary" style={{ fontSize: 12 }}>{view?.disclaimer ?? ''}</Text>}
              >
                <Spin spinning={loading}>
                  {view && view.matched ? (
                    <ReactECharts option={buildOption(view)} style={{ height: 560 }} notMerge />
                  ) : (
                    <Alert type="info" showIcon message="输入疾病名后点击「展开图谱」" />
                  )}
                </Spin>
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card title="相关疾病（共病/并发症提示）" size="small" style={{ marginBottom: 16 }}>
                {related.length === 0 ? (
                  <Text type="secondary">暂无共病关系</Text>
                ) : (
                  related.map((r) => (
                    <div key={r.disease.id} style={{ marginBottom: 10 }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{r.disease.name}</Text>
                        <Tag color={r.similarity > 0.3 ? 'red' : 'blue'}>
                          相似度 {Math.round(r.similarity * 100)}%
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        共享：{r.sharedNodeNames.join('、')}
                      </Text>
                    </div>
                  ))
                )}
              </Card>

              <Card title="药物相互作用自检" size="small">
                {!interactions ? (
                  <Text type="secondary">加载中…</Text>
                ) : interactions.pairs.length === 0 ? (
                  <Alert type="success" showIcon message={`已校验 ${interactions.checkedCount} 种药物，未发现已知相互作用`} />
                ) : (
                  interactions.pairs.map((p, idx) => (
                    <Alert
                      key={idx}
                      type={p.riskLevel === 'high' ? 'error' : p.riskLevel === 'medium' ? 'warning' : 'info'}
                      showIcon
                      style={{ marginBottom: 8 }}
                      message={
                        <span>
                          <b>{p.drugA.name}</b> × <b>{p.drugB.name}</b>
                          <Tag color={RISK_COLOR[p.riskLevel]} style={{ marginLeft: 8 }}>{p.riskLevel}</Tag>
                        </span>
                      }
                      description={p.label}
                    />
                  ))
                )}
                {interactions && interactions.unknownDrugs.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    未识别药物：{interactions.unknownDrugs.join('、')}
                  </Text>
                )}
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Watermark>
  );
}
