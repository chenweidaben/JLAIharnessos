/**
 * 健澜科技 jlmedaios - M171-A 医院科研智能化深化·全流程辅助页
 *
 * 【科研教学后勤】科研全流程要专业，不能外行话：
 *  - 七步：选题 → 文献 → 设计 → 实施 → 分析 → 写作 → 投稿；
 *  - 样本量估算（两独立样本经典公式，Cohen's d）；
 *  - 统计方法推荐（研究设计 × 结局数据类型）；
 *  - 偏倚风险识别（RoB 2 / ROBINS-I / QUADAS-2）。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 所有结果来自 POST /api/v1/research/full-pipeline 纯函数，无预造数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

interface PipelineTask {
  point: string;
  deliverable: string;
}

interface PipelineStage {
  id: string;
  name: string;
  focus: string;
  tasks: PipelineTask[];
  redFlags: string[];
}

interface FullPipeline {
  topic: string;
  stages: PipelineStage[];
  governanceNotes: string[];
}

interface SampleSizeEstimate {
  alpha: number;
  power: number;
  effectSize: number;
  perGroup: number;
  total: number;
  formula: string;
  assumptions: string;
}

interface StatRecommendation {
  studyDesign: string;
  designLabel: string;
  dataType: string;
  primaryTest: string;
  assumptions: string[];
  alternatives: string[];
  effectMeasure: string;
  reportingStandard: string;
}

interface BiasDomain {
  domain: string;
  label: string;
  risk: 'low' | 'moderate' | 'serious' | 'critical';
  source: string;
  mitigation: string;
}

interface BiasRiskReport {
  studyDesign: string;
  designLabel: string;
  domains: BiasDomain[];
  overallRisk: string;
  tool: string;
}

interface PipelineResponse {
  pipeline: FullPipeline;
  sampleSize?: SampleSizeEstimate;
  statRecommendation?: StatRecommendation;
  biasRisk?: BiasRiskReport;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  grid: '#e6ebf2',
};

const DESIGN_OPTIONS = [
  { value: 'rct', label: '随机对照试验（RCT）' },
  { value: 'prospective-cohort', label: '前瞻性队列' },
  { value: 'retrospective-cohort', label: '回顾性队列' },
  { value: 'case-control', label: '病例对照' },
  { value: 'diagnostic', label: '诊断准确性研究' },
  { value: 'cross-sectional', label: '横断面研究' },
];

const DATATYPE_OPTIONS = [
  { value: 'continuous', label: '连续变量' },
  { value: 'binary', label: '二分类' },
  { value: 'survival', label: '生存/时间-事件' },
  { value: 'ordinal', label: '有序分类' },
];

/** 偏倚等级配色（与 BFF risk 对齐） */
const RISK_COLOR: Record<string, string> = {
  low: 'success',
  moderate: 'default',
  serious: 'warning',
  critical: 'error',
};
const RISK_LABEL: Record<string, string> = {
  low: '低风险',
  moderate: '中等',
  serious: '严重',
  critical: '关键',
};

/* --------------------------------- 组件 --------------------------------- */

export default function ResearchPipelinePage() {
  const [topic, setTopic] = useState('');
  const [design, setDesign] = useState('rct');
  const [dataType, setDataType] = useState('binary');
  const [effectSize, setEffectSize] = useState('0.5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PipelineResponse | null>(null);

  const run = async () => {
    const topicText = topic.trim();
    if (!topicText) {
      setError('请先输入研究主题');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/research/full-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicText,
          studyDesign: design,
          dataType,
          alpha: 0.05,
          power: 0.8,
          effectSize: Number(effectSize),
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '科研全流程辅助生成失败');
        return;
      }
      setResult(json.data as PipelineResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  };

  const biasColumns: ColumnsType<BiasDomain> = [
    { title: '偏倚领域', dataIndex: 'label', width: 180, render: (v: string) => <Text strong style={{ color: VI.deep }}>{v}</Text> },
    {
      title: '风险',
      dataIndex: 'risk',
      width: 90,
      render: (v: string) => <Tag color={RISK_COLOR[v] ?? 'default'}>{RISK_LABEL[v] ?? v}</Tag>,
    },
    { title: '风险来源', dataIndex: 'source' },
    { title: '缓解措施', dataIndex: 'mitigation' },
  ];

  const stageSteps = result?.pipeline.stages.map((s, i) => ({
    title: s.name,
    description: s.focus,
    key: s.id,
  }));

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            科研全流程辅助 · 选题→投稿七步贯通
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            【科研教学后勤】样本量估算 / 统计方法推荐 / 偏倚风险识别，全部按临床流行病学方法学口径输出
          </Paragraph>
        </div>

        {/* 输入区 */}
        <Card size="small" style={{ marginBottom: 16, background: '#fff' }}>
          <Space wrap size={[12, 12]} align="start">
            <Input
              placeholder="研究主题（如：阿司匹林对老年高血压患者卒中一级预防的影响）"
              value={topic}
              style={{ width: 420 }}
              onChange={(e) => setTopic(e.target.value)}
              onPressEnter={() => void run()}
            />
            <Select
              value={design}
              options={DESIGN_OPTIONS}
              style={{ width: 200 }}
              onChange={(v) => setDesign(v)}
            />
            <Select
              value={dataType}
              options={DATATYPE_OPTIONS}
              style={{ width: 160 }}
              onChange={(v) => setDataType(v)}
            />
            <Select
              value={effectSize}
              options={[
                { value: '0.2', label: '小效应 d=0.2' },
                { value: '0.5', label: '中效应 d=0.5' },
                { value: '0.8', label: '大效应 d=0.8' },
              ]}
              style={{ width: 160 }}
              onChange={(v) => setEffectSize(v)}
            />
            <Button type="primary" loading={loading} onClick={() => void run()}
              style={{ background: VI.deep, borderColor: VI.deep }}>
              生成全流程方案
            </Button>
          </Space>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在按方法学口径生成全流程…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error}
            action={<Button size="small" onClick={() => void run()}>重试</Button>} />
        )}

        {!loading && !error && !result && (
          <Alert type="info" showIcon
            message="输入研究主题并选择研究设计，系统将输出七步任务清单、样本量、统计方法与偏倚风险。" />
        )}

        {!loading && !error && result && (
          <>
            {/* 七步总览 */}
            <Card size="small" style={{ marginBottom: 16 }} title={<Text strong style={{ color: VI.deep }}>七步流程总览</Text>}>
              <Steps
                direction="horizontal"
                size="small"
                current={result.pipeline.stages.length}
                items={stageSteps}
                responsive={false}
              />
            </Card>

            {/* 关键指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="流程阶段" value={result.pipeline.stages.length} suffix="步" />
                </Card>
              </Col>
              {result.sampleSize && (
                <>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="每组样本量" value={result.sampleSize.perGroup} suffix="例" />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="两组合计" value={result.sampleSize.total} suffix="例" />
                    </Card>
                  </Col>
                </>
              )}
              {result.biasRisk && (
                <Col xs={12} sm={6}>
                  <Card size="small">
                    <Statistic
                      title="总体偏倚风险"
                      value={RISK_LABEL[result.biasRisk.overallRisk] ?? result.biasRisk.overallRisk}
                    />
                  </Card>
                </Col>
              )}
            </Row>

            {/* 七步任务清单 */}
            <Row gutter={[16, 16]}>
              {result.pipeline.stages.map((s) => (
                <Col xs={24} md={12} lg={8} key={s.id}>
                  <Card
                    size="small"
                    title={<span style={{ color: '#fff' }}>{s.name}</span>}
                    headStyle={{ background: VI.deep }}
                  >
                    <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>{s.focus}</Paragraph>
                    {s.tasks.map((t, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 13 }}>• {t.point}</Text>
                        <div style={{ paddingLeft: 14 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>交付物：{t.deliverable}</Text>
                        </div>
                      </div>
                    ))}
                    <Divider style={{ margin: '8px 0' }} />
                    {s.redFlags.map((r, i) => (
                      <Tag key={i} color="error" style={{ marginBottom: 4 }}>红线：{r}</Tag>
                    ))}
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 样本量 */}
            {result.sampleSize && (
              <Card size="small" style={{ marginTop: 16 }}
                title={<Text strong style={{ color: VI.deep }}>样本量估算（两独立样本，双侧 α={result.sampleSize.alpha}，把握度 {result.sampleSize.power}）</Text>}>
                <Paragraph style={{ fontSize: 13 }}>{result.sampleSize.formula}</Paragraph>
                <Paragraph type="secondary" style={{ fontSize: 12 }}>{result.sampleSize.assumptions}</Paragraph>
              </Card>
            )}

            {/* 统计方法推荐 */}
            {result.statRecommendation && (
              <Card size="small" style={{ marginTop: 16 }}
                title={
                  <Space>
                    <Text strong style={{ color: VI.deep }}>统计方法推荐</Text>
                    <Tag color="blue">{result.statRecommendation.designLabel}</Tag>
                    <Tag color="cyan">{result.statRecommendation.reportingStandard}</Tag>
                  </Space>
                }>
                <Paragraph style={{ fontSize: 13 }}>
                  <Text strong>主分析：</Text>{result.statRecommendation.primaryTest}
                </Paragraph>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Text strong style={{ fontSize: 12 }}>前提假设</Text>
                    {result.statRecommendation.assumptions.map((a, i) => (
                      <div key={i}><Text type="secondary" style={{ fontSize: 12 }}>• {a}</Text></div>
                    ))}
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong style={{ fontSize: 12 }}>备选/校正方法</Text>
                    {result.statRecommendation.alternatives.map((a, i) => (
                      <div key={i}><Text type="secondary" style={{ fontSize: 12 }}>• {a}</Text></div>
                    ))}
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong style={{ fontSize: 12 }}>效应量口径</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{result.statRecommendation.effectMeasure}</Text></div>
                  </Col>
                </Row>
              </Card>
            )}

            {/* 偏倚风险 */}
            {result.biasRisk && (
              <Card size="small" style={{ marginTop: 16 }}
                title={
                  <Space>
                    <Text strong style={{ color: VI.deep }}>偏倚风险识别</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{result.biasRisk.tool}</Text>
                  </Space>
                }>
                <Table<BiasDomain>
                  rowKey="domain"
                  columns={biasColumns}
                  dataSource={result.biasRisk.domains}
                  pagination={false}
                  size="small"
                />
              </Card>
            )}

            {/* 全程合规 */}
            <Card size="small" style={{ marginTop: 16 }}
              title={<Text strong style={{ color: VI.deep }}>全程合规与伦理</Text>}>
              {result.pipeline.governanceNotes.map((g, i) => (
                <div key={i}><Text style={{ fontSize: 13 }}>• {g}</Text></div>
              ))}
            </Card>

            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center' }}>
              © {new Date().getFullYear()} 杭州健澜科技有限公司 · 科研全流程辅助（方法学口径，纯函数无预造数据）
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
