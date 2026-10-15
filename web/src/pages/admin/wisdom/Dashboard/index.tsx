/**
 * 健澜科技 jlmedaios - M146-A 医院智慧资产看板页（管理驾驶舱，仅 admin）
 *
 * 【越用越聪明深化】让院长一眼看到「医院越来越聪明」：
 *   - 五维资产卡：经验沉淀总量 / 知识覆盖病种数 / AI 助手使用量 / 活跃医生 / 智慧度总分；
 *   - 六维雷达：经验深度 / 病种覆盖 / AI 活跃 / 医生成长 / 推荐采纳 / 满意度闭环；
 *   - 医生成长曲线：本期成长均分、达标人数、Top 医生画像；
 *   - 增长报告：近 N 期智慧度走势 + 段位跃迁 + 结论话术。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type WisdomTier = 'outstanding' | 'excellent' | 'good' | 'pass' | 'weak';

interface RadarDimension {
  key: string;
  name: string;
  weight: number;
  score: number;
  weightedContribution: number;
  raw: Record<string, number>;
  formula: string;
  isWeak: boolean;
}

interface DoctorGrowthEntry {
  doctorId: string;
  doctorName: string;
  deptCode: string;
  growthScore: number;
  experienceCount: number;
}

interface WisdomDashboard {
  hospitalId: string;
  asOf: string;
  demo: boolean;
  assets: {
    experienceTotal: number;
    coveredDiseases: number;
    aiAssistantCalls: number;
    activeDoctors: number;
    wisdomScore: number;
    tier: WisdomTier;
    tierLabel: string;
  };
  radar: RadarDimension[];
  weakDimensions: RadarDimension[];
  doctorGrowth: {
    avgGrowth: number;
    risingDoctors: number;
    entries: DoctorGrowthEntry[];
  };
}

interface SnapshotPoint {
  period: string;
  experienceTotal: number;
  coveredDiseases: number;
  aiAssistantCalls: number;
  wisdomScore: number;
  avgDoctorGrowth: number;
}

interface WisdomGrowthReport {
  hospitalId: string;
  period: string;
  generatedAt: string;
  series: SnapshotPoint[];
  delta: {
    experienceTotal: number;
    coveredDiseases: number;
    aiAssistantCalls: number;
    wisdomScore: number;
  };
  growthRate: {
    experienceTotal: number;
    coveredDiseases: number;
    aiAssistantCalls: number;
    wisdomScore: number;
  };
  tierMigration: { from: WisdomTier; to: WisdomTier; label: string };
  conclusion: string;
  rising: boolean;
}

interface DashboardResponse {
  dashboard: WisdomDashboard;
  report: WisdomGrowthReport;
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const TIER_COLOR: Record<WisdomTier, string> = {
  outstanding: '#52c41a',
  excellent: '#1e6fbf',
  good: '#13c2c2',
  pass: '#faad14',
  weak: '#f5222d',
};

export default function WisdomDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/wisdom/dashboard?period=month');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DashboardResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dash = data?.dashboard;
  const report = data?.report;
  const isEmpty = !dash;

  /** 六维雷达 option */
  const radarOption = useMemo<EChartsOption | null>(() => {
    if (!dash) return null;
    return {
      color: [VI.accent],
      tooltip: {},
      legend: { data: ['当前得分'] },
      radar: {
        indicator: dash.radar.map((d) => ({ name: d.name, max: 100 })),
        axisName: { color: VI.deep, fontSize: 12 },
        splitArea: {
          areaStyle: { color: ['rgba(30,111,191,0.04)', 'rgba(30,111,191,0.08)'] },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: dash.radar.map((d) => d.score),
              name: '当前得分',
              areaStyle: { color: 'rgba(30,111,191,0.25)' },
              lineStyle: { color: VI.accent, width: 2 },
              itemStyle: { color: VI.accent },
            },
          ],
        },
      ],
    };
  }, [dash]);

  /** 智慧度走势 option */
  const trendOption = useMemo<EChartsOption | null>(() => {
    if (!report || report.series.length === 0) return null;
    return {
      color: [VI.accent],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 32 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: report.series.map((p) => p.period),
      },
      yAxis: { type: 'value', min: 0, max: 100, name: '分' },
      series: [
        {
          name: '智慧度总分',
          type: 'line',
          smooth: true,
          data: report.series.map((p) => p.wisdomScore),
          areaStyle: { color: 'rgba(30,111,191,0.15)' },
          markLine: {
            symbol: 'none',
            data: [
              {
                yAxis: 60,
                lineStyle: { color: '#f5222d', type: 'dashed' },
                label: { formatter: '合格线 60' },
              },
            ],
          },
        },
      ],
    };
  }, [report]);

  /** 医生成长对比 option（柱） */
  const growthOption = useMemo<EChartsOption | null>(() => {
    if (!dash || dash.doctorGrowth.entries.length === 0) return null;
    return {
      color: [VI.accent],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 48 },
      xAxis: {
        type: 'category',
        data: dash.doctorGrowth.entries.map((e) => e.doctorName),
        axisLabel: { interval: 0, rotate: 20 },
      },
      yAxis: { type: 'value', min: 0, max: 100, name: '成长分' },
      series: [
        {
          name: '成长分',
          type: 'bar',
          data: dash.doctorGrowth.entries.map((e) => e.growthScore),
          itemStyle: { color: VI.accent, borderRadius: [4, 4, 0, 0] },
          markLine: {
            symbol: 'none',
            data: [
              {
                yAxis: 70,
                lineStyle: { color: '#52c41a', type: 'dashed' },
                label: { formatter: '达标线 70' },
              },
            ],
          },
        },
      ],
    };
  }, [dash]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          医院智慧资产看板
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 【越用越聪明深化】让院长看到医院越来越聪明
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总全院智慧资产…" />
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

        {!loading && !error && isEmpty && (
          <Alert
            type="info"
            showIcon
            message="暂无智慧资产样本。接入经验沉淀、病种覆盖、AI 助手使用与医生成长数据后将自动成图。"
          />
        )}

        {!loading && !error && dash && report && (
          <>
            {dash.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实业务计数，看板仅用于演示「越用越聪明」效果。"
              />
            )}

            {/* 院长结论横幅 */}
            <Card
              style={{
                marginBottom: 16,
                borderLeft: `4px solid ${report.rising ? '#52c41a' : '#faad14'}`,
              }}
            >
              <Text strong style={{ fontSize: 16, color: VI.deep }}>
                {report.conclusion}
              </Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={report.rising ? 'green' : 'orange'}>
                  {report.tierMigration.label}
                </Tag>
                <Tag color="blue">期末智慧度 {dash.assets.wisdomScore.toFixed(1)}</Tag>
                <Tag color="geekblue">
                  经验环比 +{report.delta.experienceTotal}
                </Tag>
                <Tag color="cyan">
                  病种环比 +{report.delta.coveredDiseases}
                </Tag>
              </div>
            </Card>

            {/* 五维资产卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>经验沉淀总量</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: VI.deep }}>
                      {dash.assets.experienceTotal.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>条</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>知识覆盖病种</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: VI.deep }}>
                      {dash.assets.coveredDiseases}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>种</div>
                  </div>
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>AI 助手使用量</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: VI.deep }}>
                      {dash.assets.aiAssistantCalls.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>次/周期</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>活跃沉淀医生</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: VI.deep }}>
                      {dash.assets.activeDoctors}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>人</div>
                  </div>
                </Card>
              </Col>
              <Col span={7}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>智慧度评分</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: VI.deep, lineHeight: 1.1 }}>
                      {dash.assets.wisdomScore.toFixed(1)}
                    </div>
                    <Tag
                      color={TIER_COLOR[dash.assets.tier]}
                      style={{ marginTop: 6, fontSize: 13, padding: '2px 10px' }}
                    >
                      {dash.assets.tierLabel}
                    </Tag>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 雷达 + 趋势 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={10}>
                <Card title="六维智慧度雷达">
                  {radarOption && <ReactECharts option={radarOption} style={{ height: 320 }} />}
                </Card>
              </Col>
              <Col span={14}>
                <Card title="智慧度增长曲线（近 N 期）">
                  {trendOption ? (
                    <ReactECharts option={trendOption} style={{ height: 320 }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', padding: 80 }}>
                      暂无历史趋势数据
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 医生成长 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={10}>
                <Card title="医生成长曲线（本期）">
                  {growthOption ? (
                    <ReactECharts option={growthOption} style={{ height: 280 }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', padding: 60 }}>
                      暂无医生成长样本
                    </div>
                  )}
                  <Row style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <Text type="secondary">全院成长均分</Text>
                      <div style={{ fontSize: 22, fontWeight: 600, color: VI.deep }}>
                        {dash.doctorGrowth.avgGrowth.toFixed(1)}
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">达标医生（≥70）</Text>
                      <div style={{ fontSize: 22, fontWeight: 600, color: '#52c41a' }}>
                        {dash.doctorGrowth.risingDoctors}
                        <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}> 人</span>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={14}>
                <Card title="成长画像 Top 榜">
                  <Table
                    rowKey="doctorId"
                    pagination={false}
                    dataSource={dash.doctorGrowth.entries}
                    locale={{ emptyText: '暂无医生成长数据' }}
                    size="small"
                    columns={[
                      { title: '医生', dataIndex: 'doctorName', width: 120 },
                      { title: '科室', dataIndex: 'deptCode', width: 100 },
                      {
                        title: '成长分',
                        dataIndex: 'growthScore',
                        width: 100,
                        render: (v: number) => (
                          <Tag color={v >= 70 ? 'green' : v >= 60 ? 'blue' : 'red'}>
                            {v.toFixed(0)}
                          </Tag>
                        ),
                      },
                      { title: '累计经验', dataIndex: 'experienceCount' },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            {/* 六维明细 */}
            <Card title="六维明细（可解释口径）">
              <Table
                rowKey="key"
                pagination={false}
                dataSource={dash.radar}
                locale={{ emptyText: '暂无维度数据' }}
                size="small"
                columns={[
                  { title: '维度', dataIndex: 'name', width: 140 },
                  {
                    title: '权重',
                    dataIndex: 'weight',
                    width: 80,
                    render: (v: number) => `${v}%`,
                  },
                  {
                    title: '得分',
                    dataIndex: 'score',
                    width: 90,
                    render: (v: number, record: RadarDimension) => (
                      <Tag color={record.isWeak ? 'red' : 'blue'}>{v.toFixed(1)}</Tag>
                    ),
                  },
                  {
                    title: '加权贡献',
                    dataIndex: 'weightedContribution',
                    width: 100,
                    render: (v: number) => v.toFixed(1),
                  },
                  { title: '计算口径', dataIndex: 'formula' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
