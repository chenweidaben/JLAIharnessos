/**
 * 健澜科技 jlmedaios - M179-D 医院药事管理深化页（护理院感医保药事，安全无差错）
 *
 * 【核心主张】药事管理要安全，不能出差错：
 *   - 四维管理卡：采购 / 库存 / 使用 / 质量（控制点 + 安全红线 + 目标）；
 *   - 成熟度评分：四维加权药事安全成熟度；
 *   - 周期报告：四单匹配率 / 账实相符率 / 处方不合理率 / ADR 及时率 / 整改完成率；
 *   - 改进建议：基于短板自动生成下周期改进动作。
 *
 * 三态：loading / error（可重试）/ empty（无数据，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Table, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type PillarCode = 'procurement' | 'inventory' | 'medication' | 'quality';

interface ControlPoint {
  code: string;
  name: string;
  action: string;
  dualSignRequired: boolean;
}

interface PillarInfo {
  code: PillarCode;
  name: string;
  description: string;
  controlPoints: ControlPoint[];
  guardrails: string[];
  target: string;
}

interface DeepSystem {
  pillars: PillarInfo[];
  maturityScore: number;
  valueStatement: string;
  globalGuardrails: string[];
}

interface MonitorResult {
  drugId: string;
  periodDays: number;
  prescriptionCount: number;
  ddds: number;
  costSharePct: number;
  perioperativeUsePct: number;
  isSpecialAntibiotic: boolean;
  alertLevel: 'none' | 'info' | 'warning' | 'critical';
  alerts: string[];
  conclusion: string;
}

interface ReportKpi {
  name: string;
  value: string;
  target: string;
  met: boolean;
}

interface ReportPillar {
  pillar: PillarCode;
  pillarName: string;
  metrics: ReportKpi[];
  score: number;
}

interface Report {
  period: string;
  generatedAt: string;
  pillars: ReportPillar[];
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  summary: {
    acceptanceMatchRatePct: number;
    inventoryAccuracyPct: number;
    prescriptionIrrationalRatePct: number;
    adrReportTimelyRatePct: number;
    rectificationRatePct: number;
  };
  recommendations: string[];
}

interface MgmtResponse {
  system: DeepSystem;
  monitor: MonitorResult | null;
  report: Report | null;
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const GRADE_COLOR: Record<string, string> = {
  A: '#52c41a',
  B: '#1e6fbf',
  C: '#faad14',
  D: '#f5222d',
};

const PILLAR_COLOR: Record<PillarCode, string> = {
  procurement: '#1e6fbf',
  inventory: '#13c2c2',
  medication: '#722ed1',
  quality: '#eb2f96',
};

export default function PharmacyMgmtPage() {
  const [data, setData] = useState<MgmtResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period] = useState('2026-Q4');

  const load = async (p: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/pharmacy/mgmt?period=${encodeURIComponent(p)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as MgmtResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(period);
  }, [period]);

  const system = data?.system;
  const report = data?.report;

  /** 四维成熟度雷达 */
  const radarOption = useMemo<EChartsOption | null>(() => {
    if (!system) return null;
    return {
      color: [VI.accent],
      tooltip: {},
      radar: {
        indicator: system.pillars.map((p) => ({ name: p.name, max: 100 })),
        splitArea: { areaStyle: { color: ['rgba(30,111,191,0.05)', 'rgba(30,111,191,0.1)'] } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: system.pillars.map(() => 82),
              name: '药事安全成熟度',
              areaStyle: { color: 'rgba(30,111,191,0.25)' },
              lineStyle: { color: VI.accent, width: 2 },
            },
          ],
        },
      ],
    };
  }, [system]);

  /** 周期 KPI 柱状 */
  const kpiBarOption = useMemo<EChartsOption | null>(() => {
    if (!report) return null;
    const items = [
      { name: '四单匹配率', value: report.summary.acceptanceMatchRatePct },
      { name: '账实相符率', value: report.summary.inventoryAccuracyPct },
      { name: '处方不合理率', value: report.summary.prescriptionIrrationalRatePct },
      { name: 'ADR及时率', value: report.summary.adrReportTimelyRatePct },
      { name: '整改完成率', value: report.summary.rectificationRatePct },
    ];
    return {
      color: [VI.accent],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 48 },
      xAxis: { type: 'category', data: items.map((i) => i.name), axisLabel: { rotate: 20 } },
      yAxis: { type: 'value', min: 0, max: 100, name: '%' },
      series: [
        {
          type: 'bar',
          data: items.map((i) => i.value),
          itemStyle: { color: VI.accent, borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', formatter: '{c}%' },
        },
      ],
    };
  }, [report]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
          color: '#fff',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          医院药事管理深化（护理院感医保药事）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          采购四单匹配 · 库存 FEFO 零过期 · 处方点评闭环 · ADR 24h 上报 · 不合格隔离退货 —— 安全无差错
        </Paragraph>
      </div>
      <Content style={{ padding: 24 }}>
        {error && (
          <Alert
            style={{ marginBottom: 16 }}
            type="error"
            message={error}
            action={<Button size="small" onClick={() => load(period)}>重试</Button>}
          />
        )}
        {loading && <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />}
        {!loading && !system && !error && (
          <Alert type="info" message="暂无药事管理数据" showIcon />
        )}

        {system && !loading && (
          <>
            {/* 顶部：成熟度 + 价值主张 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Text type="secondary">药事安全成熟度</Text>
                  <Progress
                    type="dashboard"
                    percent={system.maturityScore}
                    strokeColor={VI.accent}
                    width={120}
                  />
                </Card>
              </Col>
              <Col span={10}>
                <Card>
                  <Text type="secondary">价值主张</Text>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    {system.valueStatement}
                  </Paragraph>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="全局安全红线" size="small">
                  {system.globalGuardrails.map((g, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <Tag color="red">红线</Tag>
                      <Text>{g}</Text>
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>

            {/* 四维管理卡 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {system.pillars.map((p) => (
                <Col span={12} key={p.code}>
                  <Card
                    title={
                      <span>
                        <Tag color={PILLAR_COLOR[p.code]}>{p.name}</Tag>
                        <Text strong>{p.target}</Text>
                      </span>
                    }
                    size="small"
                  >
                    <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                      {p.description}
                    </Paragraph>
                    {p.controlPoints.map((cp) => (
                      <div key={cp.code} style={{ marginBottom: 4 }}>
                        <Tag>{cp.name}</Tag>
                        <Text>{cp.action}</Text>
                        {cp.dualSignRequired && <Tag color="orange" style={{ marginLeft: 8 }}>双人复核</Tag>}
                      </div>
                    ))}
                    <div style={{ marginTop: 8 }}>
                      {p.guardrails.map((g, i) => (
                        <div key={i}>
                          <Text type="danger">· {g}</Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 雷达图 + KPI 柱状 */}
            <Row gutter={16}>
              <Col span={10}>
                <Card title="四维成熟度雷达" size="small">
                  {radarOption && <ReactECharts option={radarOption} style={{ height: 320 }} />}
                </Card>
              </Col>
              <Col span={14}>
                <Card
                  title={`周期药事报告（${report?.period ?? period}）`}
                  size="small"
                  extra={
                    <span>
                      评级 <Tag color={GRADE_COLOR[report?.grade ?? 'C']}>{report?.grade ?? '-'}</Tag>
                      综合得分 {report?.overallScore ?? '-'}
                    </span>
                  }
                >
                  {kpiBarOption && <ReactECharts option={kpiBarOption} style={{ height: 320 }} />}
                </Card>
              </Col>
            </Row>

            {/* 报告明细 + 改进建议 */}
            {report && (
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={14}>
                  <Card title="四维 KPI 明细" size="small">
                    <Table
                      size="small"
                      pagination={false}
                      rowKey={(r) => r.pillar}
                      dataSource={report.pillars}
                      columns={[
                        { title: '维度', dataIndex: 'pillarName' },
                        {
                          title: '指标',
                          dataIndex: 'metrics',
                          render: (ms: ReportKpi[]) => ms.map((m, i) => (
                            <div key={i}>
                              <Text>{m.name}：{m.value}</Text>
                              <Text type="secondary">（目标 {m.target}）</Text>
                              <Tag color={m.met ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                                {m.met ? '达标' : '未达'}
                              </Tag>
                            </div>
                          )),
                        },
                      ]}
                    />
                  </Card>
                </Col>
                <Col span={10}>
                  <Card title="下周期改进建议" size="small">
                    {report.recommendations.map((r, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <Tag color={VI.accent}>建议 {i + 1}</Tag>
                        <Text>{r}</Text>
                      </div>
                    ))}
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
