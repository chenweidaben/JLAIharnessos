/**
 * 健澜科技 jlmedaios - M130-B 院感监测预警页（管理驾驶舱，仅 admin）
 *
 * 展示 BFF /api/v1/admin/infection/alerts 的各病区院感风险检测结论：
 * 发热患者聚集 / 手术部位感染 SSI / 耐药菌 MDRO / 呼吸机相关肺炎 VAP。
 * 【核心业务深化】发现 high/critical 风险病区立即标红（红色卡片 + 红色警示灯）。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无预警数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type EventType = 'fever_cluster' | 'ssi' | 'mdro' | 'vap';

interface RiskSignal {
  type: EventType;
  level: RiskLevel;
  patientCount: number;
  clustered: boolean;
  message: string;
}

interface RiskResult {
  wardCode: string;
  wardName: string;
  census: number;
  overallLevel: RiskLevel;
  redAlert: boolean;
  signals: RiskSignal[];
}

interface AlertsView {
  generatedAt: string;
  totalWards: number;
  redWards: number;
  summary: Record<RiskLevel, number>;
  alerts: RiskResult[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const LEVEL_META: Record<RiskLevel, { color: string; text: string; tag: string }> = {
  critical: { color: '#cf1322', text: '暴发确认', tag: 'error' },
  high: { color: '#ff4d4f', text: '暴发风险', tag: 'error' },
  medium: { color: '#faad14', text: '聚集预警', tag: 'warning' },
  low: { color: '#52c41a', text: '散发/正常', tag: 'success' },
};

const TYPE_LABEL: Record<EventType, string> = {
  fever_cluster: '发热聚集',
  ssi: '手术部位感染',
  mdro: '耐药菌检出',
  vap: '呼吸机相关肺炎',
};

function LevelDot({ level }: { level: RiskLevel }) {
  const meta = LEVEL_META[level];
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: meta.color,
        boxShadow: `0 0 8px ${meta.color}`,
        marginRight: 8,
      }}
    />
  );
}

export default function InfectionAlertsPage() {
  const [data, setData] = useState<AlertsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/infection/alerts');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as AlertsView);
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
          院感监测预警 · 风险病区红色预警
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          发热聚集 / 手术部位感染 / 耐药菌 / 呼吸机相关肺炎 · 仅 admin 可见
          · 已标红病区 {data?.redWards ?? 0} 个
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在聚合院感风险信号…" />
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
        {!loading && !error && (!data || data.alerts.length === 0) && (
          <Alert type="info" showIcon message="暂住院感监测数据。实时信号接入后将自动展示风险病区。" />
        )}

        {!loading && !error && data && data.alerts.length > 0 && (
          <>
            {/* 红色预警总览横幅 */}
            <Card
              style={{
                marginBottom: 16,
                border: redAlerts.length > 0 ? '2px solid #ff4d4f' : 'none',
              }}
            >
              <Row align="middle" gutter={24}>
                <Col>
                  <Text strong>全院病区 {data.totalWards}</Text>
                </Col>
                <Col>
                  {/* 【核心业务深化】发现风险立即标红 */}
                  <Tag color="error" style={{ fontSize: 16, padding: '4px 16px' }}>
                    红色预警病区 {data.redWards}
                  </Tag>
                </Col>
                <Col>
                  <Tag color="error">暴发确认 {data.summary.critical}</Tag>
                </Col>
                <Col>
                  <Tag color="warning">聚集预警 {data.summary.medium}</Tag>
                </Col>
                <Col>
                  <Tag color="success">正常 {data.summary.low}</Tag>
                </Col>
              </Row>
              {redAlerts.length > 0 && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="error"
                  showIcon
                  message={`发现 ${redAlerts.length} 个病区存在 high/critical 院感风险，请院感科立即介入流调与隔离处置。`}
                />
              )}
            </Card>

            {/* 病区风险卡片：红色预警病区置顶并红色描边 */}
            <Row gutter={[16, 16]}>
              {data.alerts.map((ward) => {
                const meta = LEVEL_META[ward.overallLevel];
                return (
                  <Col xs={24} sm={12} md={12} key={ward.wardCode}>
                    <Card
                      style={{
                        borderLeft: ward.redAlert ? `6px solid ${meta.color}` : '6px solid #d9d9d9',
                      }}
                      title={
                        <span>
                          <LevelDot level={ward.overallLevel} />
                          {ward.wardName}
                          <Text type="secondary" style={{ marginLeft: 8, fontWeight: 400 }}>
                            {ward.wardCode} · 在院 {ward.census} 人
                          </Text>
                        </span>
                      }
                      extra={<Tag color={meta.tag}>{meta.text}</Tag>}
                    >
                      {ward.signals.length === 0 && (
                        <Text type="secondary">当前无院感风险信号，持续监测中。</Text>
                      )}
                      {ward.signals.map((s, i) => (
                        <div
                          key={`${s.type}-${i}`}
                          style={{
                            marginBottom: 8,
                            padding: 8,
                            background: s.level === 'high' || s.level === 'critical' ? '#fff1f0' : '#fafafa',
                            border: s.level === 'high' || s.level === 'critical' ? '1px solid #ffa39e' : 'none',
                          }}
                        >
                          <Tag color={LEVEL_META[s.level].tag}>{TYPE_LABEL[s.type]}</Tag>
                          {s.clustered && <Tag color="error">聚集</Tag>}
                          <div style={{ marginTop: 4 }}>
                            <Text>{s.message}</Text>
                          </div>
                        </div>
                      ))}
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
