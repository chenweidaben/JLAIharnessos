/**
 * 健澜科技 jlmedaios - M179-A 医院护理管理深化页（真关心护士，不是监控，仅 admin）
 *
 * 【护理院感医保药事·核心主张】护理管理要真关心护士，不是监控：
 *   - 护理排班：床护比（每护士分管患者数 vs 公开标准）+ 班次安排 + 加班到点提示调休；
 *   - 护理质量：基础护理合格率 / 危重护理合格率 / 不良事件分级 + 根因分析(RCA)；
 *   - 护理培训：三基三严 + 专科技能 + 应急演练；
 *   - 护理科研：护理论文 + 专利 + 品管圈(QCC)。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Space, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type RatioStatus = 'understaffed' | 'balanced' | 'abundant';

interface WardRatio {
  ward: string;
  wardType: string;
  patients: number;
  nurses: number;
  patientsPerNurse: number;
  standardMaxPerNurse: number;
  requiredNurses: number;
  nurseShortage: number;
  status: RatioStatus;
  careSuggestion: string;
}

interface WardRow {
  ward: string;
  wardName: string;
  wardType: string;
  patients: number;
  nursesOnDuty: number;
  overtimeHours: number;
  overtimeAlert: boolean;
  overtimeNote: string;
  ratio: WardRatio;
}

interface RiskPatientRow {
  patientId: string;
  level: 'high' | 'medium' | 'low';
  factors: string[];
  careActions: string[];
}

interface RiskReport {
  ward: string;
  totalPatients: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  staffingNote: string;
  patients: RiskPatientRow[];
}

interface QualityReport {
  period: string;
  basicCarePassRate: number;
  criticalCarePassRate: number;
  adverseEvents: { eventId: string; ward: string; level: string; category: string; rcaDone: boolean; careAction: string }[];
  adverseEventCount: number;
  rcaDoneRate: number;
  training: { sanjiSanyanPassRate: number; specialtyPassRate: number; emergencyDrills: number };
  research: { papers: number; patents: number; qualityControlCircles: number };
  summary: string;
}

interface NursingDeepResponse {
  generatedAt: string;
  careCharter: string;
  scheduling: {
    wards: WardRow[];
    totalPatients: number;
    totalNurses: number;
    avgPatientsPerNurse: number;
    understaffedWardCount: number;
    overtimeAlertCount: number;
    overtimeCareLimitHours: number;
  };
  quality: QualityReport;
  risk: RiskReport;
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const RATIO_META: Record<RatioStatus, { label: string; color: string }> = {
  understaffed: { label: '人力偏紧', color: 'red' },
  balanced: { label: '达标', color: 'green' },
  abundant: { label: '充足', color: 'blue' },
};

const LEVEL_META: Record<string, { label: string; color: string }> = {
  high: { label: '高危', color: 'red' },
  medium: { label: '中危', color: 'orange' },
  low: { label: '低危', color: 'default' },
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function NursingDeepPage() {
  const [data, setData] = useState<NursingDeepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/nursing/deep');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as NursingDeepResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const wardCols = [
    { title: '病区', dataIndex: 'wardName', key: 'wardName' },
    { title: '在院患者', dataIndex: 'patients', key: 'patients' },
    { title: '当班护士', dataIndex: 'nursesOnDuty', key: 'nursesOnDuty' },
    {
      title: '每护士分管',
      dataIndex: ['ratio', 'patientsPerNurse'],
      key: 'ppn',
      render: (_: unknown, r: WardRow) => (
        <Text strong>
          {r.ratio.patientsPerNurse}
          <Text type="secondary"> / 标准 {r.ratio.standardMaxPerNurse}</Text>
        </Text>
      ),
    },
    {
      title: '床护比状态',
      dataIndex: ['ratio', 'status'],
      key: 'status',
      render: (s: RatioStatus) => {
        const m = RATIO_META[s];
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '加班(月)',
      dataIndex: 'overtimeHours',
      key: 'overtime',
      render: (v: number, r: WardRow) =>
        r.overtimeAlert ? <Text type="danger">{v}h ⚠调休</Text> : <Text>{v}h</Text>,
    },
    {
      title: '关怀建议',
      dataIndex: ['ratio', 'careSuggestion'],
      key: 'care',
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          护理管理深化 · 护理支持驾驶舱
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.78)', margin: '8px 0 0' }}>
          护理院感医保药事 · 仅 admin 可见 · 缺人补位 / 加班调休 / 质量查流程 / 培训给路径 / 科研给时间
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总护理支持数据…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && data && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* 关怀主张 */}
            <Alert type="info" showIcon message={data.careCharter} />

            {/* 顶部 KPI */}
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">全院在院/当班护士</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {data.scheduling.totalPatients}
                    <Text type="secondary" style={{ fontSize: 12 }}> 床 / {data.scheduling.totalNurses} 人</Text>
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">人力偏紧病区</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {data.scheduling.understaffedWardCount}
                    <Text type="secondary" style={{ fontSize: 12 }}> 个 · 建议补位不加班</Text>
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">加班调休提醒</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {data.scheduling.overtimeAlertCount}
                    <Text type="secondary" style={{ fontSize: 12 }}> 个病区超 {data.scheduling.overtimeCareLimitHours}h/月</Text>
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">基础护理合格率</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {pct(data.quality.basicCarePassRate)}
                    <Text type="secondary" style={{ fontSize: 12 }}> · 危重 {pct(data.quality.criticalCarePassRate)}</Text>
                  </Title>
                </Card>
              </Col>
            </Row>

            {/* 护理排班 */}
            <Card title="一、护理排班（床护比公开 + 加班关怀：缺人补位，不逼加班）">
              <Table rowKey="ward" size="small" columns={wardCols} dataSource={data.scheduling.wards} pagination={false} />
            </Card>

            {/* 护理风险识别 */}
            <Card title={`二、护理风险识别（${data.risk.staffingNote}）`}>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={8}><Text>高危患者：<Text strong type="danger">{data.risk.highCount}</Text></Text></Col>
                <Col span={8}><Text>中危患者：<Text strong>{data.risk.mediumCount}</Text></Text></Col>
                <Col span={8}><Text>低危患者：<Text strong>{data.risk.lowCount}</Text></Text></Col>
              </Row>
              <Table
                rowKey="patientId"
                size="small"
                pagination={false}
                dataSource={data.risk.patients}
                columns={[
                  { title: '患者(脱敏)', dataIndex: 'patientId', key: 'patientId' },
                  {
                    title: '风险等级', dataIndex: 'level', key: 'level',
                    render: (l: string) => { const m = LEVEL_META[l]; return <Tag color={m?.color}>{m?.label ?? l}</Tag>; },
                  },
                  { title: '风险因素', dataIndex: 'factors', key: 'factors', render: (f: string[]) => f.join('、') },
                  { title: '关怀动作', dataIndex: 'careActions', key: 'careActions', render: (a: string[]) => a.join('；') },
                ]}
              />
            </Card>

            {/* 护理质量 */}
            <Card title={`三、护理质量（本期不良事件 ${data.quality.adverseEventCount} 起，根因分析完成率 ${pct(data.quality.rcaDoneRate)}）`}>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <Text>基础护理合格率（三基三严）</Text>
                  <Progress percent={Math.round(data.quality.basicCarePassRate * 100)} size="small" />
                </Col>
                <Col span={12}>
                  <Text>危重护理合格率（专科技能）</Text>
                  <Progress percent={Math.round(data.quality.criticalCarePassRate * 100)} size="small" />
                </Col>
              </Row>
              <Table
                rowKey="eventId"
                size="small"
                pagination={false}
                dataSource={data.quality.adverseEvents}
                columns={[
                  { title: '事件', dataIndex: 'eventId', key: 'eventId' },
                  { title: '病区', dataIndex: 'ward', key: 'ward' },
                  { title: '分级', dataIndex: 'level', key: 'level', render: (l: string) => <Tag color={l === 'sentinel' ? 'red' : l === 'ii' ? 'orange' : 'default'}>{l.toUpperCase()}</Tag> },
                  { title: '类别', dataIndex: 'category', key: 'category' },
                  { title: '根因分析', dataIndex: 'rcaDone', key: 'rcaDone', render: (d: boolean) => (d ? <Tag color="green">已完成</Tag> : <Tag>进行中</Tag>) },
                  { title: '流程改进动作', dataIndex: 'careAction', key: 'careAction', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
                ]}
              />
              <Paragraph style={{ marginTop: 8, fontSize: 12 }}>
                <Text type="secondary">{data.quality.summary}</Text>
              </Paragraph>
            </Card>

            {/* 培训与科研 */}
            <Card title="四、护理培训与科研（给路径、给时间，不摊指标）">
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">三基三严合格率</Text>
                  <Progress percent={Math.round(data.quality.training.sanjiSanyanPassRate * 100)} size="small" />
                </Col>
                <Col span={8}>
                  <Text type="secondary">专科技能合格率</Text>
                  <Progress percent={Math.round(data.quality.training.specialtyPassRate * 100)} size="small" />
                </Col>
                <Col span={8}>
                  <Text type="secondary">应急演练 {data.quality.training.emergencyDrills} 场</Text>
                  <Progress percent={data.quality.training.emergencyDrills * 25} size="small" status="active" />
                </Col>
              </Row>
              <Paragraph style={{ marginTop: 12 }}>
                本期科研产出：论文 <Text strong>{data.quality.research.papers}</Text> 篇 ·
                专利 <Text strong>{data.quality.research.patents}</Text> 项 ·
                品管圈 <Text strong>{data.quality.research.qualityControlCircles}</Text> 个。
              </Paragraph>
            </Card>

            {data.demo && (
              <Alert type="warning" showIcon message="当前为内置演示台账（空库可演示）。接入护理管理系统(NIS)真实数据后自动替换，关怀规则不变。" />
            )}
          </Space>
        )}
      </Content>
    </Layout>
  );
}
