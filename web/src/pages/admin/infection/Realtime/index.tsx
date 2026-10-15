/**
 * 健澜科技 jlmedaios - M153-C 医院感染实时监测大屏（管理驾驶舱，仅 admin）
 *
 * 【临床决策支持】展示 BFF /api/v1/admin/infection/realtime 的实时院感指标：
 *   手术部位感染率 SSI / 导管相关血流感染率 CLABSI / 呼吸机相关肺炎率 VAP / 多重耐药菌检出率 MDRO。
 * 【核心业务深化】超阈值即红色暴发预警（不等月报），红色卡片 + 红色警示灯置顶。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type InfectionType = 'ssi' | 'clabsi' | 'vap' | 'mdro';

interface DeptRate {
  deptCode: string;
  deptName: string;
  period: string;
  ssiRate: number;
  clabsiRate: number;
  vapRate: number;
  mdroRate: number;
}

interface OutbreakItem {
  deptCode: string;
  deptName: string;
  infectionType: InfectionType;
  cases: number;
  threshold: number;
  outbreak: boolean;
  redAlert: boolean;
  level: 'red' | 'orange' | 'yellow';
  message: string;
}

interface AlertItem {
  alertNo: string;
  deptName: string;
  deptCode: string;
  infectionType: InfectionType;
  level: 'red' | 'orange' | 'yellow';
  cases: number;
  threshold: number;
  rateValue: number;
  rateUnit: '%' | '‰';
  title: string;
  message: string;
  redAlert: boolean;
  actions: string[];
}

interface RealtimeView {
  generatedAt: string;
  period: string;
  thresholds: Record<InfectionType, number>;
  typeLabels: Record<InfectionType, string>;
  totalDepts: number;
  redAlertCount: number;
  deptRates: DeptRate[];
  outbreaks: OutbreakItem[];
  alerts: AlertItem[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 四项指标在科室卡片上的展示配置 */
const RATE_CARDS: {
  key: keyof Pick<DeptRate, 'ssiRate' | 'clabsiRate' | 'vapRate' | 'mdroRate'>;
  label: string;
  unit: '%' | '‰';
}[] = [
  { key: 'ssiRate', label: '手术部位感染率', unit: '%' },
  { key: 'clabsiRate', label: '导管相关血流感染率', unit: '‰' },
  { key: 'vapRate', label: '呼吸机相关肺炎率', unit: '‰' },
  { key: 'mdroRate', label: '多重耐药菌检出率', unit: '%' },
];

const LEVEL_TAG: Record<string, string> = {
  red: 'error',
  orange: 'warning',
  yellow: 'default',
};

export default function InfectionRealtimePage() {
  const [data, setData] = useState<RealtimeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/infection/realtime');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as RealtimeView);
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

  const redAlerts = data?.alerts?.filter((a) => a.redAlert) ?? [];

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
          院感实时监测大屏 · 暴发红色预警（不等月报）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          手术部位感染率 / 导管相关血流感染率 / 呼吸机相关肺炎率 / 多重耐药菌检出率 ·
          周期 {data?.period ?? '-'} · 红色预警 {data?.redAlertCount ?? 0} 条
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在实时聚合院感指标…" />
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

        {/* empty 态 */}
        {!loading && !error && (!data || data.deptRates.length === 0) && (
          <Alert type="info" showIcon message="暂无院感实时监测数据。业务库实时聚合接入后将自动展示。" />
        )}

        {!loading && !error && data && data.deptRates.length > 0 && (
          <>
            {/* 【核心业务深化】红色暴发预警总览 */}
            <Card
              style={{
                marginBottom: 16,
                border: redAlerts.length > 0 ? '2px solid #cf1322' : 'none',
                background: redAlerts.length > 0 ? '#fff1f0' : '#fff',
              }}
            >
              <Row gutter={24}>
                <Col span={6}>
                  <Statistic title="监测科室" value={data.totalDepts} suffix="个" />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="红色暴发预警"
                    value={data.redAlertCount}
                    valueStyle={{ color: '#cf1322' }}
                    suffix="条"
                  />
                </Col>
                <Col span={6}>
                  <Statistic title="更新时刻" value={new Date(data.generatedAt).toLocaleTimeString()} />
                </Col>
                <Col span={6}>
                  <Statistic title="统计周期" value={data.period} />
                </Col>
              </Row>
              {redAlerts.length > 0 && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="error"
                  showIcon
                  banner
                  message={`【临床决策支持】发现 ${redAlerts.length} 条超阈值暴发预警，院感科请立即介入流调与隔离处置。`}
                />
              )}
            </Card>

            {/* 红色预警列表：置顶 */}
            {data.alerts.length > 0 && (
              <Card title="暴发预警（超阈值即触发）" style={{ marginBottom: 16 }}>
                <Row gutter={[12, 12]}>
                  {data.alerts.map((a) => (
                    <Col xs={24} sm={12} key={a.alertNo}>
                      <div
                        style={{
                          padding: 12,
                          borderLeft: `6px solid ${a.redAlert ? '#cf1322' : '#faad14'}`,
                          background: a.redAlert ? '#fff1f0' : '#fffbe6',
                          border: a.redAlert ? '1px solid #ffa39e' : '1px solid #ffe58f',
                        }}
                      >
                        <div>
                          <Tag color={LEVEL_TAG[a.level]}>{data.typeLabels[a.infectionType]}</Tag>
                          {a.redAlert && <Tag color="error">红色暴发</Tag>}
                          <Text strong>{a.deptName}</Text>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <Text>{a.message}</Text>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <Text type="secondary">
                            例数 {a.cases} / 阈值 {a.threshold} · 实测率 {a.rateValue}
                            {a.rateUnit}
                          </Text>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}

            {/* 各科室四项指标率 */}
            <Row gutter={[16, 16]}>
              {data.deptRates.map((d) => {
                const deptOutbreaks = data.outbreaks.filter((o) => o.deptCode === d.deptCode);
                const hasRed = deptOutbreaks.some((o) => o.redAlert);
                return (
                  <Col xs={24} sm={12} md={12} key={d.deptCode}>
                    <Card
                      title={
                        <span>
                          {d.deptName}
                          <Text type="secondary" style={{ marginLeft: 8, fontWeight: 400 }}>
                            {d.deptCode}
                          </Text>
                        </span>
                      }
                      extra={
                        hasRed ? (
                          <Tag color="error" icon={<span />}>
                            红色预警
                          </Tag>
                        ) : (
                          <Tag color="success">正常</Tag>
                        )
                      }
                      style={{ borderLeft: hasRed ? '6px solid #cf1322' : '6px solid #52c41a' }}
                    >
                      <Row gutter={16}>
                        {RATE_CARDS.map((rc) => {
                          const v = Number(d[rc.key]) || 0;
                          // 简易进度条：SSI 按 5%、CLABSI/VAP 按 10‰、MDRO 按 30% 做满刻度
                          const max = rc.unit === '%' ? (rc.key === 'mdroRate' ? 30 : 5) : 10;
                          const pct = Math.min(100, Math.round((v / max) * 100));
                          return (
                            <Col span={12} key={rc.key} style={{ marginBottom: 12 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {rc.label}
                              </Text>
                              <div style={{ fontSize: 20, fontWeight: 600 }}>
                                {v}
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {' '}
                                  {rc.unit}
                                </Text>
                              </div>
                              <Progress percent={pct} showInfo={false} size="small" status={v === 0 ? 'success' : 'active'} />
                            </Col>
                          );
                        })}
                      </Row>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
