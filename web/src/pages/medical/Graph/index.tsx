/**
 * 健澜科技 jlmedaios - 医学知识图谱可视化页面（M131-D，AI 能力深化）
 *
 * 力导向图（ECharts graph · force）呈现「疾病—症状—药物—检查—手术」
 * 有向知识网络：医生输入起点概念（如「胸痛」），一键展开其症状/用药/检查
 * 邻接关系；可选填终点触发路径推理，高亮「症状→疾病→药物」完整诊疗链。
 *
 * 视觉规范：健澜深海蓝 VI（主色 #0A4D8C），节点按类型配色，
 * 边标签标注医学关系（典型症状/推荐用药/相互作用…）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ApartmentOutlined, SearchOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { get } from '@/services/request';

const { Header, Content } = Layout;

/* ------------------------------- 类型契约 ------------------------------- */
/** 与 BFF medicalGraphAggregator 信封对齐（前端镜像类型） */
interface GraphNodeView {
  id: string;
  name: string;
  type: 'disease' | 'symptom' | 'drug' | 'exam' | 'surgery';
  description: string;
  sources: Array<{ name: string; year?: string }>;
  evidenceLevel: number;
}
interface GraphEdgeView {
  source: string;
  target: string;
  relation: string;
  label: string;
  weight: number;
}
interface GraphPathView {
  nodes: string[];
  relations: string[];
  labels: string[];
}
interface GraphResultView {
  startNode: GraphNodeView | null;
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  relationType: string | null;
  matched: boolean;
  neighborCount: number;
  paths: GraphPathView[];
  disclaimer: string;
}

/* --------------------------- 深海蓝 VI 配色 --------------------------- */
const TYPE_COLOR: Record<GraphNodeView['type'], string> = {
  disease: '#0A4D8C', // 深海蓝（主色）
  symptom: '#FAAD14', // 琥珀
  drug: '#13C2C2',    // 青
  exam: '#1890FF',    // 亮蓝
  surgery: '#722ED1', // 紫
};
const TYPE_LABEL: Record<GraphNodeView['type'], string> = {
  disease: '疾病', symptom: '症状', drug: '药物', exam: '检查', surgery: '手术',
};

const RELATION_OPTIONS = [
  { value: '', label: '全部关系' },
  { value: 'disease_has_symptom', label: '疾病 → 症状' },
  { value: 'disease_treated_by_drug', label: '疾病 → 药物' },
  { value: 'symptom_suggests_disease', label: '症状 → 疾病' },
  { value: 'drug_interacts_with_drug', label: '药物 ↔ 药物相互作用' },
  { value: 'disease_needs_exam', label: '疾病 → 检查' },
  { value: 'disease_has_surgery', label: '疾病 → 手术' },
];

const watermarkText = ['健澜科技', '医学知识图谱', 'jlmedaios'];

/**
 * 把后端 GraphResult 编译为 ECharts 力导向图 option。
 * 【AI 能力深化】起点节点放大高亮；路径模式下命中路径边加粗标红。
 */
function buildGraphOption(result: GraphResultView): EChartsOption {
  const idSet = new Set(result.nodes.map((n) => n.id));
  const pathEdges = new Set(
    result.paths.flatMap((p, i) =>
      p.nodes.slice(0, -1).map((n, j) => `${i}:${n}->${p.nodes[j + 1]}`),
    ),
  );

  return {
    backgroundColor: '#FFFFFF',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#E8ECF1',
      textStyle: { color: '#262626', fontSize: 12 },
      formatter: (p: unknown) => {
        const item = p as { dataType?: string; data?: { desc?: string; typeName?: string; src?: string }; name?: string };
        if (item.dataType === 'edge') return '';
        const d = item.data ?? {};
        return `<b>${item.name ?? ''}</b><br/>类型：${d.typeName ?? ''}<br/>${d.desc ?? ''}<br/><span style="color:#8c8c8c">${d.src ?? ''}</span>`;
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
          itemStyle: { color: TYPE_COLOR[value as GraphNodeView['type']] },
        })),
        force: {
          repulsion: 420,
          edgeLength: [70, 150],
          gravity: 0.08,
        },
        label: { show: true, position: 'right', fontSize: 12, color: '#262626' },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 7,
        lineStyle: { color: '#9DB8D2', width: 1.2, curveness: 0.12 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
        data: result.nodes
          .filter((n) => idSet.has(n.id))
          .map((n) => ({
            id: n.id,
            name: n.name,
            symbolSize: n.id === result.startNode?.id ? 56 : 34,
            category: TYPE_LABEL[n.type],
            itemStyle: {
              color: TYPE_COLOR[n.type],
              borderColor: n.id === result.startNode?.id ? '#F5222D' : '#fff',
              borderWidth: n.id === result.startNode?.id ? 2.5 : 1,
            },
            desc: n.description,
            typeName: TYPE_LABEL[n.type],
            src: n.sources.map((s) => s.name).join(' / '),
          })),
        links: result.edges
          .filter((e) => idSet.has(e.source) && idSet.has(e.target))
          .map((e) => ({
            source: e.source,
            target: e.target,
            value: e.label,
            label: { show: true, formatter: e.label, fontSize: 10, color: '#5B7A9E' },
            lineStyle: {
              width: pathEdges.size > 0 ? 2.4 : 1.2,
              color: pathEdges.size > 0 ? '#F5222D' : '#9DB8D2',
            },
          })),
      },
    ],
    // 防止 TS 对 formatter 中扩展字段的过严推断
  } as EChartsOption;
}

export default function MedicalGraphPage() {
  const [node, setNode] = useState('胸痛');
  const [relation, setRelation] = useState<string>('');
  const [end, setEnd] = useState<string>('阿司匹林');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GraphResultView | null>(null);

  const load = useCallback(async () => {
    if (!node.trim()) {
      setError('请输入起点医学概念（如 胸痛 / 高血压）');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await get<GraphResultView>('/api/v1/medical/graph/query', {
        node: node.trim(),
        ...(relation ? { relation } : {}),
        ...(end.trim() ? { end: end.trim() } : {}),
      });
      setResult(data);
      if (!data.matched) setError(`未检索到「${node}」相关医学概念，请更换关键词`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '知识图谱加载失败');
    } finally {
      setLoading(false);
    }
  }, [node, relation, end]);

  useEffect(() => { void load(); }, [load]);

  const option = useMemo(() => (result ? buildGraphOption(result) : null), [result]);

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-slate-50">
        <Header className="flex items-center justify-between px-6 shadow-md" style={{ background: '#0A4D8C' }}>
          <div className="flex items-center gap-3">
            <ApartmentOutlined style={{ fontSize: 22, color: '#fff' }} />
            <Typography.Title level={4} className="!mb-0 !text-white">
              医学知识图谱 · 力导向推理
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              疾病 / 症状 / 药物 / 检查 / 手术 · 指南溯源 · 路径推理
            </span>
          </div>
          <Tag color="cyan">AI 能力深化</Tag>
        </Header>

        <Content className="p-6">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card size="small">
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} md={6}>
                  <Input
                    addonBefore="起点"
                    placeholder="如 胸痛 / 高血压 / 二甲双胍"
                    value={node}
                    onChange={(e) => setNode(e.target.value)}
                    onPressEnter={load}
                    allowClear
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Select
                    style={{ width: '100%' }}
                    value={relation}
                    onChange={setRelation}
                    options={RELATION_OPTIONS}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Input
                    addonBefore="终点(可选)"
                    placeholder="填则触发路径推理"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    onPressEnter={load}
                    allowClear
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Button type="primary" icon={<SearchOutlined />} onClick={load} loading={loading}>
                    展开图谱
                  </Button>
                </Col>
              </Row>
            </Card>

            {error ? <Alert type="warning" showIcon message={error} /> : null}

            <Card
              title={
                <Space>
                  <span>知识网络</span>
                  {result?.startNode ? (
                    <Tag color="#0A4D8C">{result.startNode.name} · {result.neighborCount} 个邻接</Tag>
                  ) : null}
                </Space>
              }
            >
              <Spin spinning={loading}>
                {option ? (
                  <ReactECharts option={option} style={{ height: 560, width: '100%' }} notMerge lazyUpdate />
                ) : (
                  <div style={{ height: 560 }} />
                )}
              </Spin>
            </Card>

            {result && result.paths.length > 0 ? (
              <Card title="推理路径（症状 → 诊断 → 用药）" size="small">
                {result.paths.map((p, i) => {
                  const nameOf = (id: string) => result.nodes.find((n) => n.id === id)?.name ?? id;
                  return (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <Tag color="blue">路径 {i + 1}</Tag>
                      <span>{p.nodes.map(nameOf).join(' → ')}</span>
                      <span style={{ color: '#8c8c8c', marginLeft: 12 }}>
                        （{p.labels.join(' · ')}）
                      </span>
                    </div>
                  );
                })}
              </Card>
            ) : null}

            <Alert type="info" showIcon message={result?.disclaimer ?? '本图谱内容仅供临床参考，不构成医疗建议。'} />
          </Space>
        </Content>
      </Layout>
    </Watermark>
  );
}
