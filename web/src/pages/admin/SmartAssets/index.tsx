/**
 * 健澜科技 jlmedaios - M161-B 全院智慧资产看板页（管理驾驶舱，仅 admin）
 *
 * 【核心主张】智慧资产要量化，不能只说「很聪明」：
 *   - 四维资产卡：经验资产 / 知识资产 / 模型资产 / 数据资产（计数直读）；
 *   - 四维饱和得分：各子项 count/target×100 折算，加权得智慧资产总分；
 *   - 段位对标：起步 / 成长 / 成熟 / 卓越，距下一档差几分一目了然；
 *   - 缺口清单：按「距目标还差多少」降序，标高/中/低严重度与补齐建议；
 *   - 增长曲线：近 N 期四维资产量与总分走势。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * 【远期深化】：后续可下钻到资产清单（每个子项展开为带元数据的条目表）。
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

type AssetDimensionKey = 'experience' | 'knowledge' | 'model' | 'data';
type AssetLevel = 'outstanding' | 'mature' | 'growing' | 'starter';
type GapSeverity = 'high' | 'medium' | 'low';

interface AssetSubItem {
  key: string;
  name: string;
  count: number;
  target: number;
  score: number;
  gap: number;
}

interface AssetDimension {
  key: AssetDimensionKey;
  name: string;
  total: number;
  weight: number;
  score: number;
  weightedContribution: number;
  subs: AssetSubItem[];
  isWeak: boolean;
}

interface AssetGap {
  dimension: AssetDimensionKey;
  dimensionName: string;
  subKey: string;
  subName: string;
  current: number;
  target: number;
  shortfall: number;
  severity: GapSeverity;
  suggestion: string;
}

interface SmartAssetDashboard {
  hospitalId: string;
  asOf: string;
  demo: boolean;
  totalAssets: number;
  dimensions: AssetDimension[];
  smartScore: number;
  level: AssetLevel;
  levelLabel: string;
  gaps: AssetGap[];
}

interface SmartAssetSnapshot {
  period: string;
  experience: number;
  knowledge: number;
  model: number;
  data: number;
  smartScore: number;
}

interface SmartAssetGrowth {
  hospitalId: string;
  period: string;
  generatedAt: string;
  series: SmartAssetSnapshot[];
  delta: { experience: number; knowledge: number; model: number; data: number; smartScore: number };
  growthRate: {
    experience: number;
    knowledge: number;
    model: number;
    data: number;
    smartScore: number;
  };
  rising: boolean;
  conclusion: string;
}

interface DashboardResponse {
  dashboard: SmartAssetDashboard;
  growth: SmartAssetGrowth;
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const SEVERITY_COLOR: Record<GapSeverity, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

const SEVERITY_LABEL: Record<GapSeverity, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export default function SmartAssetsPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/smart-assets/dashboard?period=month');
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
  const growth = data?.growth;
  const isEmpty = !dash;

  /** 四维得分对比（柱） */
  const dimScoreOption = useMemo<EChartsOption | null>(() => {
    if (!dash) return null;
    return {
      color: [VI.accent],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 32 },
      xAxis: { type: 'category', data: dash.dimensions.map((d) => d.name) },
      yAxis: { type: 'value', min: 0, max: 100, name: '饱和得分' },
      series: [
        {
          name: '维度得分',
          type: 'bar',
          data: dash.dimensions.map((d) => d.score),
          itemStyle: { color: VI.accent, borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', formatter: '{c}' },
          markLine: {
            symbol: 'none',
            data: [{ yAxis: 60, lineStyle: { color: '#f5222d', type: 'dashed' }, label: { formatter: '合格线 60' } }],
          },
        },
      ],
    };
  }, [dash]);

  /** 智慧资产总分走势（线） */
  const trendOption = useMemo<EChartsOption | null>(() => {
    if (!growth || growth.series.length === 0) return null;
    return {
      color: [VI.accent],
      tooltip: { trigger: 'axis' },
      legend: { data: ['智慧资产总分'] },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: growth.series.map((p) => p.period),
      },
      yAxis: { type: 'value', min: 0, max: 100, name: '分' },
      series: [
        {
          name: '智慧资产总分',
          type: 'line',
          smooth: true,
          data: growth.series.map((p) => p.smartScore),
          areaStyle: { color: 'rgba(30,111,191,0.15)' },
          lineStyle: { color: VI.accent, width: 2 },
          itemStyle: { color: VI.accent },
        },
      ],
    };
  }, [growth]);

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
          全院智慧资产看板
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 智慧资产要量化，不能只说「很聪明」
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
            message="暂无智慧资产样本。接入经验沉淀、知识建设、模型上线与数据治理计数后将自动成图。"
          />
        )}

        {!loading && !error && dash && growth && (
          <>
            {dash.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实业务计数，看板仅用于演示「智慧资产量化」效果。"
              />
            )}

            {/* 院长结论横幅 */}
            <Card
              style={{
                marginBottom: 16,
                borderLeft: `4px solid ${growth.rising ? '#52c41a' : '#faad14'}`,
              }}
            >
              <Text strong style={{ fontSize: 16, color: VI.deep }}>
                {growth.conclusion}
              </Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={growth.rising ? 'green' : 'orange'}>
                  {growth.rising ? '资产上行' : '资产持平/回落'}
                </Tag>
                <Tag color="blue">全院资产总量 {dash.totalAssets.toLocaleString()}</Tag>
                <Tag color="geekblue">
                  总分 {dash.smartScore.toFixed(1)} · {dash.levelLabel}
                </Tag>
              </div>
            </Card>

            {/* 四维资产卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {dash.dimensions.map((d) => (
                <Col span={6} key={d.key}>
                  <Card>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{d.name}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                        {d.total.toLocaleString()}
                      </div>
                      <Progress
                        percent={d.score}
                        size="small"
                        strokeColor={d.isWeak ? '#faad14' : VI.accent}
                        style={{ marginTop: 8 }}
                      />
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
                        饱和得分 {d.score.toFixed(1)}（权重 {d.weight}%）
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 四维得分 + 总分走势 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={10}>
                <Card title="四维资产饱和得分">
                  {dimScoreOption && <ReactECharts option={dimScoreOption} style={{ height: 300 }} />}
                </Card>
              </Col>
              <Col span={14}>
                <Card title="智慧资产总分走势（近 N 期）">
                  {trendOption ? (
                    <ReactECharts option={trendOption} style={{ height: 300 }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', padding: 80 }}>
                      暂无历史趋势数据
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 缺口清单 */}
            <Card title="资产缺口识别（按距目标缺口降序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="subKey"
                pagination={false}
                dataSource={dash.gaps}
                locale={{ emptyText: '各子项已达饱和目标，暂无缺口' }}
                size="small"
                columns={[
                  { title: '维度', dataIndex: 'dimensionName', width: 110 },
                  { title: '子项', dataIndex: 'subName', width: 110 },
                  {
                    title: '当前 / 目标',
                    width: 130,
                    render: (_: unknown, r: AssetGap) => `${r.current} / ${r.target}`,
                  },
                  {
                    title: '缺口',
                    dataIndex: 'shortfall',
                    width: 90,
                    render: (v: number) => <Text strong type="danger">{v}</Text>,
                  },
                  {
                    title: '严重度',
                    dataIndex: 'severity',
                    width: 90,
                    render: (v: GapSeverity) => <Tag color={SEVERITY_COLOR[v]}>{SEVERITY_LABEL[v]}</Tag>,
                  },
                  { title: '补齐建议', dataIndex: 'suggestion' },
                ]}
              />
            </Card>

            {/* 子项明细 */}
            <Card title="十一子项明细（可解释口径）">
              <Table
                rowKey="key"
                pagination={false}
                dataSource={dash.dimensions.flatMap((d) =>
                  d.subs.map((s) => ({ ...s, dimension: d.name })),
                )}
                locale={{ emptyText: '暂无子项数据' }}
                size="small"
                columns={[
                  { title: '所属维度', dataIndex: 'dimension', width: 110 },
                  { title: '子项', dataIndex: 'name', width: 120 },
                  { title: '当前计数', dataIndex: 'count', width: 100 },
                  { title: '饱和目标', dataIndex: 'target', width: 100 },
                  {
                    title: '得分',
                    dataIndex: 'score',
                    width: 160,
                    render: (v: number) => (
                      <Progress percent={v} size="small" style={{ width: 120 }} />
                    ),
                  },
                  {
                    title: '距目标',
                    dataIndex: 'gap',
                    width: 90,
                    render: (v: number) => (v > 0 ? `差 ${v}` : '已饱和'),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
