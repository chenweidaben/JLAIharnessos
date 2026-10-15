/**
 * 健澜科技 jlmedaios - M127-C 医疗质量监控页（管理驾驶舱，仅 admin）
 *
 * 展示 BFF /api/v1/admin/quality/monitor 的三甲评审六项核心指标：
 * 三级手术占比 / 临床路径入径率 / 抗菌药物使用强度 / 院内感染发生率 /
 * 病历甲级率 / 危急值报告及时率。红绿灯卡片 + 逐月趋势折线图。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无质量数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

type Light = 'green' | 'yellow' | 'red';

interface IndicatorCard {
  key: string;
  name: string;
  unit: string;
  direction: 'higher' | 'lower';
  actual: number;
  target: number;
  light: Light;
  deviation: number;
  series: Array<{ month: string; value: number }>;
}

interface QualityMonitor {
  counts: Record<Light, number>;
  overall: Light;
  currentMonth: string | null;
  indicators: IndicatorCard[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const LIGHT_META: Record<Light, { color: string; text: string; tag: string }> = {
  green: { color: '#52c41a', text: '达标', tag: 'success' },
  yellow: { color: '#faad14', text: '接近目标', tag: 'warning' },
  red: { color: '#ff4d4f', text: '不达标', tag: 'error' },
};

function LightBulb({ light }: { light: Light }) {
  const meta = LIGHT_META[light];
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: meta.color,
        boxShadow: `0 0 6px ${meta.color}`,
        marginRight: 8,
      }}
    />
  );
}

export default function QualityMonitorPage() {
  const [data, setData] = useState<QualityMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/quality/monitor');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as QualityMonitor);
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

  const months = useMemo(
    () => (data?.indicators?.[0]?.series ?? []).map((s) => s.month),
    [data],
  );

  const chartOption = useMemo(() => {
    if (!data) return {};
    return {
      color: [VI.accent, '#13c2c2', '#722ed1', '#eb2f96', '#fa8c16', '#52c41a'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, type: 'scroll' },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: { type: 'category', data: months, boundaryGap: false },
      yAxis: { type: 'value', name: '实际值' },
      series: data.indicators.map((ind) => ({
        name: ind.name,
        type: 'line',
        smooth: true,
        data: ind.series.map((s) => s.value),
      })),
    };
  }, [data, months]);

  const overall = data?.overall ?? 'green';

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
          医疗质量监控 · 管理驾驶舱
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          三甲评审核心指标红绿灯 · 仅 admin 可见 · 最新月份 {data?.currentMonth ?? '-'}
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在聚合医疗质量指标…" />
          </div>
        )}

        {/* error 态 */}
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

        {/* empty 态：成功返回但无指标 */}
        {!loading && !error && (!data || data.indicators.length === 0) && (
          <Alert type="info" showIcon message="暂无医疗质量数据。本月质量数据上报后将自动展示。" />
        )}

        {!loading && !error && data && data.indicators.length > 0 && (
          <>
            {/* 整体结论横幅 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={24}>
                <Col>
                  <span style={{ marginRight: 12 }}>整体结论</span>
                  <LightBulb light={overall} />
                  <Tag color={LIGHT_META[overall].tag} style={{ fontSize: 16, padding: '4px 16px' }}>
                    {LIGHT_META[overall].text}
                  </Tag>
                </Col>
                <Col>
                  <Tag color="success">达标 {data.counts.green}</Tag>
                </Col>
                <Col>
                  <Tag color="warning">接近目标 {data.counts.yellow}</Tag>
                </Col>
                <Col>
                  <Tag color="error">不达标 {data.counts.red}</Tag>
                </Col>
              </Row>
            </Card>

            {/* 红绿灯指标卡片 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {data.indicators.map((ind) => {
                const meta = LIGHT_META[ind.light];
                return (
                  <Col xs={24} sm={12} md={8} key={ind.key}>
                    <Card
                      title={
                        <span>
                          <LightBulb light={ind.light} />
                          {ind.name}
                        </span>
                      }
                    >
                      <Statistic
                        value={ind.actual}
                        suffix={ind.unit}
                        valueStyle={{ color: meta.color }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <span style={{ color: 'rgba(0,0,0,0.55)' }}>
                          目标 {ind.direction === 'higher' ? '≥' : '≤'} {ind.target}
                          {ind.unit} · 偏差 {ind.deviation > 0 ? '+' : ''}
                          {ind.deviation}
                        </span>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 趋势图 */}
            <Card title="逐月趋势">
              <ReactECharts option={chartOption} style={{ height: 360 }} notMerge />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
