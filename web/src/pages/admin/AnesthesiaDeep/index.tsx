/**
 * 健澜科技 jlmedaios - M176-C 手术麻醉管理深化页（仅 admin）
 *
 * 【临床核心深化】麻醉管理要真安全，不能走过场：
 *  - 术前评估：ASA 分级分布 + 风险分层 + 高危手术整改清单；
 *  - 术中监测：每例最低 MAP/SpO2/BIS + 出血量占比 + 实时告警计数；
 *  - 术后恢复：PACU 滞留时长 / Aldrete / NRS 疼痛 / 并发症；
 *  - 麻醉质量：并发症率 / 麻醉死亡率 / 非计划二次插管率 / 优良率。
 *
 * 生产安全：
 *  - 拉取 GET /api/v1/surgery/anesthesia/deep；
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 患者仅 P-xxxx 脱敏标识，不落 PII；不引入新依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Layout,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type AsaGrade = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
type AnesthesiaRiskLevel = 'low' | 'moderate' | 'high' | 'extreme';
type AnesthesiaQualityGrade = 'excellent' | 'good' | 'fair' | 'poor';

interface RiskAssessment {
  surgeryId: string;
  patientRef: string;
  asaGrade: AsaGrade;
  riskScore: number;
  riskLevel: AnesthesiaRiskLevel;
  requiredActions: string[];
  suggestedAnesthesia: string;
}

interface IntraopTrace {
  surgeryId: string;
  sampleCount: number;
  minMap: number;
  minSpo2: number;
  minBis: number | null;
  bloodLossMl: number;
  bloodLossPct: number;
  alertCount: number;
  stable: boolean;
}

interface DemoCase {
  surgeryId: string;
  patientRef: string;
  procedure: string;
  department: string;
  asaGrade: AsaGrade;
  age: number;
  outcome: {
    anesthesiaComplication: boolean;
    unplannedReintubation: boolean;
    pacuStayMin: number;
    aldreteAtDischarge: number;
    painScoreNrs: number;
    postopComplications: string[];
  };
}

interface QualityEval {
  surgeryId: string;
  grade: AnesthesiaQualityGrade;
  score: number;
  flags: string[];
}

interface DeepAnesthesiaMgmt {
  demo: boolean;
  generatedAt: string;
  preop: {
    totalCases: number;
    asaDistribution: Record<AsaGrade, number>;
    riskDistribution: Record<AnesthesiaRiskLevel, number>;
    highRiskCases: RiskAssessment[];
  };
  intraop: {
    traces: IntraopTrace[];
    totalAlerts: number;
    alertRate: number;
  };
  postop: {
    cases: DemoCase[];
    avgPacuMin: number;
    delayedPacuCount: number;
    avgPainScore: number;
    uncontrolledPainCount: number;
  };
  quality: {
    evaluations: QualityEval[];
    complicationRate: number;
    mortalityRate: number;
    unplannedReintubationRate: number;
    excellentRate: number;
  };
  notice: string;
}

/* ------------------------------ 深海蓝 VI ------------------------------ */
const PRIMARY = '#0B2A4A';
const ACCENT = '#1E5AA8';

const RISK_COLOR: Record<AnesthesiaRiskLevel, string> = {
  low: 'green', moderate: 'blue', high: 'orange', extreme: 'red',
};
const GRADE_COLOR: Record<AnesthesiaQualityGrade, string> = {
  excellent: 'green', good: 'blue', fair: 'orange', poor: 'red',
};
const GRADE_TEXT: Record<AnesthesiaQualityGrade, string> = {
  excellent: '优', good: '良', fair: '中', poor: '差',
};

export default function AnesthesiaDeepPage() {
  const [data, setData] = useState<DeepAnesthesiaMgmt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/surgery/anesthesia/deep');
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '加载失败');
      setData(json.data as DeepAnesthesiaMgmt);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" tip="加载麻醉管理看板…" /></div>;
  }
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="麻醉管理看板加载失败" description={error} showIcon />
        <Button style={{ marginTop: 16 }} onClick={load}>重试</Button>
      </div>
    );
  }
  if (!data) {
    return <div style={{ padding: 24 }}>暂无麻醉管理数据。</div>;
  }

  /* ---- 表格列 ---- */
  const intraopColumns: ColumnsType<IntraopTrace> = [
    { title: '手术号', dataIndex: 'surgeryId', key: 'surgeryId', width: 90 },
    { title: '采样点', dataIndex: 'sampleCount', key: 'sampleCount', width: 80 },
    {
      title: '最低 MAP', dataIndex: 'minMap', key: 'minMap', width: 100,
      render: (v: number) => (
        <Text type={v < 60 ? 'danger' : undefined} strong>{v} mmHg</Text>
      ),
    },
    {
      title: '最低 SpO2', dataIndex: 'minSpo2', key: 'minSpo2', width: 100,
      render: (v: number) => (
        <Text type={v < 95 ? 'danger' : undefined} strong>{v}%</Text>
      ),
    },
    {
      title: '最低 BIS', dataIndex: 'minBis', key: 'minBis', width: 100,
      render: (v: number | null) => (v == null ? '-' : <Text strong>{v}</Text>),
    },
    {
      title: '出血量', dataIndex: 'bloodLossMl', key: 'bloodLossMl', width: 110,
      render: (_: number, r) => (
        <Text type={r.bloodLossPct > 0.2 ? 'danger' : undefined}>
          {r.bloodLossMl} ml（{(r.bloodLossPct * 100).toFixed(1)}%）
        </Text>
      ),
    },
    {
      title: '告警', dataIndex: 'alertCount', key: 'alertCount', width: 90,
      render: (v: number) => (
        <Badge count={v} showZero overflowCount={99}
          style={{ backgroundColor: v > 0 ? '#cf1322' : '#52c41a' }} />
      ),
    },
    {
      title: '状态', dataIndex: 'stable', key: 'stable', width: 90,
      render: (s: boolean) => (s ? <Tag color="green">平稳</Tag> : <Tag color="red">异常</Tag>),
    },
  ];

  const postopColumns: ColumnsType<DemoCase> = [
    { title: '手术号', dataIndex: 'surgeryId', key: 'surgeryId', width: 90 },
    { title: '患者', dataIndex: 'patientRef', key: 'patientRef', width: 90 },
    { title: '术式', dataIndex: 'procedure', key: 'procedure' },
    { title: '科室', dataIndex: 'department', key: 'department', width: 100 },
    {
      title: 'PACU(min)', dataIndex: ['outcome', 'pacuStayMin'], key: 'pacu', width: 100,
      render: (v: number) => (
        <Text type={v > 120 ? 'danger' : undefined} strong>{v}</Text>
      ),
    },
    {
      title: 'Aldrete', dataIndex: ['outcome', 'aldreteAtDischarge'], key: 'aldrete', width: 90,
      render: (v: number) => (
        <Text type={v < 9 ? 'danger' : undefined} strong>{v}</Text>
      ),
    },
    {
      title: 'NRS', dataIndex: ['outcome', 'painScoreNrs'], key: 'nrs', width: 70,
      render: (v: number) => (
        <Tag color={v >= 4 ? 'orange' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: '并发症', dataIndex: ['outcome', 'postopComplications'], key: 'comp',
      render: (arr: string[]) =>
        arr.length === 0 ? <Text type="secondary">无</Text> : arr.map((c) => <Tag key={c} color="red">{c}</Tag>),
    },
  ];

  const qualityColumns: ColumnsType<QualityEval> = [
    { title: '手术号', dataIndex: 'surgeryId', key: 'surgeryId', width: 90 },
    { title: '评分', dataIndex: 'score', key: 'score', width: 80, render: (v: number) => <Text strong>{v}</Text> },
    {
      title: '评级', dataIndex: 'grade', key: 'grade', width: 90,
      render: (g: AnesthesiaQualityGrade) => <Tag color={GRADE_COLOR[g]}>{GRADE_TEXT[g]}</Tag>,
    },
    { title: '问题/结论', dataIndex: 'flags', key: 'flags', render: (f: string[]) => f.join('；') },
  ];

  return (
    <Layout style={{ background: '#f0f4f8' }}>
      <Content style={{ padding: 24 }}>
        {/* 标题栏 */}
        <div style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
          padding: '20px 24px', borderRadius: 8, marginBottom: 16 }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>手术麻醉管理深化 · 真安全闭环</Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0' }}>
            术前 ASA/心肺风险评估 → 术中生命体征/BIS/出血监测告警 → 术后 PACU/疼痛/并发症 → 麻醉质量四级评价。
          </Paragraph>
        </div>

        {/* 四维质量指标 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="麻醉并发症率" value={data.quality.complicationRate} suffix="%" valueStyle={{ color: data.quality.complicationRate > 20 ? '#cf1322' : PRIMARY }} /></Card></Col>
          <Col span={6}><Card><Statistic title="麻醉死亡率" value={data.quality.mortalityRate} suffix="‰" valueStyle={{ color: PRIMARY }} /></Card></Col>
          <Col span={6}><Card><Statistic title="非计划二次插管率" value={data.quality.unplannedReintubationRate} suffix="%" valueStyle={{ color: data.quality.unplannedReintubationRate > 10 ? '#cf1322' : PRIMARY }} /></Card></Col>
          <Col span={6}><Card><Statistic title="麻醉优良率(优)" value={data.quality.excellentRate} suffix="%" valueStyle={{ color: '#52c41a' }} /></Card></Col>
        </Row>

        {/* 术前评估 */}
        <Card title={<span style={{ color: PRIMARY }}>① 术前评估 · ASA 与风险分层</span>} style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>ASA 分级分布：</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {(Object.keys(data.preop.asaDistribution) as AsaGrade[]).map((g) => (
                  <Tag key={g} color={data.preop.asaDistribution[g] > 0 ? ACCENT : 'default'}>
                    ASA {g}：{data.preop.asaDistribution[g]}
                  </Tag>
                ))}
              </Space>
            </Col>
            <Col span={12}>
              <Text strong>风险分层：</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {(Object.keys(data.preop.riskDistribution) as AnesthesiaRiskLevel[]).map((l) => (
                  <Tag key={l} color={RISK_COLOR[l]}>{l}：{data.preop.riskDistribution[l]}</Tag>
                ))}
              </Space>
            </Col>
          </Row>
          <Title level={5} style={{ marginTop: 16 }}>高危手术整改清单（{data.preop.highRiskCases.length} 例）</Title>
          <List
            size="small"
            dataSource={data.preop.highRiskCases}
            renderItem={(r) => (
              <List.Item>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color={RISK_COLOR[r.riskLevel]}>{r.riskLevel.toUpperCase()}</Tag>
                    <Text strong>{r.surgeryId}</Text>
                    <Text type="secondary">{r.patientRef} · ASA {r.asaGrade} · 评分 {r.riskScore}</Text>
                    <Tag>{r.suggestedAnesthesia}</Tag>
                  </Space>
                  <Text type="secondary">整改：{r.requiredActions.join('；')}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>

        {/* 术中监测 */}
        <Card title={<span style={{ color: PRIMARY }}>② 术中监测 · 生命体征 / 麻醉深度 / 出血</span>} style={{ marginBottom: 16 }}
          extra={<Tag color={data.intraop.totalAlerts > 0 ? 'red' : 'green'}>告警 {data.intraop.totalAlerts} 条 · 例均 {data.intraop.alertRate}</Tag>}>
          <Table rowKey="surgeryId" size="small" columns={intraopColumns} dataSource={data.intraop.traces} pagination={false} />
        </Card>

        {/* 术后恢复 */}
        <Card title={<span style={{ color: PRIMARY }}>③ 术后恢复 · PACU / 疼痛 / 并发症</span>} style={{ marginBottom: 16 }}
          extra={
            <Space>
              <Tag color="blue">平均 PACU {data.postop.avgPacuMin} min</Tag>
              <Tag color={data.postop.delayedPacuCount > 0 ? 'red' : 'green'}>延迟 {data.postop.delayedPacuCount} 例</Tag>
              <Tag color={data.postop.uncontrolledPainCount > 0 ? 'orange' : 'green'}>疼痛未控 {data.postop.uncontrolledPainCount} 例</Tag>
            </Space>
          }>
          <Table rowKey="surgeryId" size="small" columns={postopColumns} dataSource={data.postop.cases} pagination={false} />
        </Card>

        {/* 麻醉质量 */}
        <Card title={<span style={{ color: PRIMARY }}>④ 麻醉质量评价 · 四级评级</span>}>
          <Table rowKey="surgeryId" size="small" columns={qualityColumns} dataSource={data.quality.evaluations} pagination={false} />
          <Alert style={{ marginTop: 12 }} type="info" showIcon message={data.notice} />
        </Card>
      </Content>
    </Layout>
  );
}
