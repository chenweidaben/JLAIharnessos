/**
 * 健澜科技 jlmedaios - M182-C v5.0启动 AI 大脑 2.0 门诊试点页（仅 admin）
 *
 * 展示 GET /api/v1/ai-brain/v2/outpatient：
 *   - 门诊量实时监控：当前在诊 / 候诊 / 平均等待
 *   - 医生负荷实时监控：当前接诊 / 今日接诊 / 平均时长 / 负荷率
 *   - 候诊 > 30 分钟预警（区间桶 + 自动提醒）
 *   - 今日高峰预测（小时桶 + 紧张度）
 *   - AI 优化建议（高峰增开窗口 / 低峰合并诊室）
 *
 * 视觉：深海蓝 VI（#0a2540 -> #123a5e 渐变头部）。
 * 三态：loading / error（可重试）/ empty。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Space, Spin, Statistic, Tag, Timeline, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

type Pressure = 'high' | 'mid' | 'low';
type SuggestionPriority = 'high' | 'medium' | 'low';

interface WaitingAlert {
  bucket: string;
  count: number;
}

interface Snapshot {
  generatedAt: string;
  demo: true;
  dataSource: 'demo' | 'live';
  hospital: { code: string; name: string };
  volume: {
    nowConsulting: number;
    nowWaiting: number;
    avgWaitMinutes: number;
    todayRegistered: number;
    todayVisited: number;
  };
  doctorLoad: {
    nowSeeing: number;
    todaySeen: number;
    avgMinutesPerPatient: number;
    openRooms: number;
    loadRate: number;
  };
  waitingAlerts: WaitingAlert[];
  waitingOver30Count: number;
}

interface PeakSlot {
  slot: string;
  predictedVisits: number;
  pressure: Pressure;
}

interface Forecast {
  period: 'today' | 'tomorrow' | 'week';
  peakWindow: string;
  slots: PeakSlot[];
  totalPredicted: number;
}

interface Suggestion {
  id: string;
  priority: SuggestionPriority;
  title: string;
  message: string;
  actions: string[];
}

interface OutpatientView extends Snapshot {
  forecast: Forecast;
  suggestions: Suggestion[];
  notice: string;
}

const PRESSURE_COLOR: Record<Pressure, string> = {
  high: '#cf3f3f',
  mid: '#e0a030',
  low: '#3a9d6f',
};

const PRIORITY_COLOR: Record<SuggestionPriority, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};

export default function AIBrainV2OutpatientPage() {
  const [data, setData] = useState<OutpatientView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/ai-brain/v2/outpatient');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || 'AI 大脑 2.0 门诊试点加载失败');
        setData(null);
      } else {
        setData(json.data as OutpatientView);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Spin size="large" tip="AI 大脑 2.0 门诊试点加载中…">
          <div style={{ minHeight: 320 }} />
        </Spin>
      </Content>
    );
  }

  if (error) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Alert
          type="error"
          message="AI 大脑 2.0 门诊试点加载失败"
          description={error}
          action={
            <Button size="small" onClick={load}>
              重试
            </Button>
          }
        />
      </Content>
    );
  }

  if (!data) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Alert type="info" showIcon message="暂无门诊试点数据" />
      </Content>
    );
  }

  const { volume, doctorLoad, waitingAlerts, waitingOver30Count, forecast, suggestions } = data;

  return (
    <Layout style={{ background: VI.bg }}>
      {/* 深海蓝渐变头部 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '20px 24px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          AI 大脑 2.0 · 门诊试点
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0' }}>
          v5.0 启动：先门诊试点，不铺大摊子 · {data.hospital.name} ·{' '}
          {new Date(data.generatedAt).toLocaleTimeString('zh-CN')}
        </Paragraph>
      </div>

      <Content style={{ padding: 24 }}>
        <Alert
          type="warning"
          showIcon
          message={data.notice}
          style={{ marginBottom: 16 }}
        />

        {/* 门诊量 + 医生负荷 实时指标 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="门诊量实时监控" headStyle={{ borderBottom: `2px solid ${VI.accent}` }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="当前在诊" value={volume.nowConsulting} suffix="人" />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="当前候诊"
                    value={volume.nowWaiting}
                    suffix="人"
                    valueStyle={volume.nowWaiting >= 120 ? { color: '#cf3f3f' } : undefined}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="平均等待"
                    value={volume.avgWaitMinutes}
                    precision={1}
                    suffix="分钟"
                    valueStyle={volume.avgWaitMinutes >= 30 ? { color: '#cf3f3f' } : undefined}
                  />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Statistic title="今日挂号" value={volume.todayRegistered} suffix="人次" />
                </Col>
                <Col span={12}>
                  <Statistic title="今日已就诊" value={volume.todayVisited} suffix="人次" />
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="医生负荷实时监控" headStyle={{ borderBottom: `2px solid ${VI.accent}` }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="当前接诊医生" value={doctorLoad.nowSeeing} suffix="人" />
                </Col>
                <Col span={8}>
                  <Statistic title="今日接诊" value={doctorLoad.todaySeen} suffix="人次" />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="平均接诊时长"
                    value={doctorLoad.avgMinutesPerPatient}
                    precision={1}
                    suffix="分钟"
                  />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Statistic title="已开诊室" value={doctorLoad.openRooms} suffix="间" />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="医生负荷率"
                    value={doctorLoad.loadRate}
                    precision={1}
                    suffix="%"
                    valueStyle={
                      doctorLoad.loadRate >= 90
                        ? { color: '#cf3f3f' }
                        : doctorLoad.loadRate <= 50
                          ? { color: '#3a9d6f' }
                          : undefined
                    }
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 候诊预警 + 高峰预测 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <span style={{ color: waitingOver30Count > 0 ? '#cf3f3f' : '#3a9d6f' }}>●</span>
                  <span>患者等待预警（候诊 &gt; 30 分钟自动提醒）</span>
                </Space>
              }
              headStyle={{
                borderBottom: `2px solid ${waitingOver30Count > 0 ? '#cf3f3f' : '#3a9d6f'}`,
              }}
            >
              {waitingOver30Count === 0 ? (
                <Alert type="success" showIcon message="当前无患者候诊超过 30 分钟" />
              ) : (
                <>
                  <Alert
                    type="warning"
                    showIcon
                    message={`共 ${waitingOver30Count} 人候诊超过 30 分钟，已自动提醒分诊台与科室主任`}
                    style={{ marginBottom: 12 }}
                  />
                  <List
                    size="small"
                    dataSource={waitingAlerts}
                    renderItem={(a) => (
                      <List.Item>
                        <Space>
                          <Tag color="red">{a.bucket} 分钟段</Tag>
                          <Text strong>{a.count} 人</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card
              title={`今日高峰预测 · 高峰窗口 ${forecast.peakWindow || '暂无'} · 全天 ${forecast.totalPredicted} 人次`}
              headStyle={{ borderBottom: `2px solid ${VI.accent}` }}
            >
              <Row gutter={[8, 8]}>
                {forecast.slots.map((s) => (
                  <Col span={Math.ceil(24 / forecast.slots.length)} key={s.slot}>
                    <div
                      style={{
                        background: `${PRESSURE_COLOR[s.pressure]}18`,
                        borderLeft: `3px solid ${PRESSURE_COLOR[s.pressure]}`,
                        padding: '8px 10px',
                        borderRadius: 4,
                      }}
                    >
                      <Text strong style={{ fontSize: 12 }}>
                        {s.slot}
                      </Text>
                      <div>
                        <Text style={{ fontSize: 12 }}>{s.predictedVisits} 人次</Text>
                        <Tag
                          color={s.pressure === 'high' ? 'red' : s.pressure === 'mid' ? 'gold' : 'green'}
                          style={{ marginLeft: 6, fontSize: 11 }}
                        >
                          {s.pressure === 'high' ? '高峰' : s.pressure === 'mid' ? '平峰' : '低峰'}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>

        {/* AI 优化建议 */}
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="AI 优化建议（高峰增开窗口 / 低峰合并诊室 / 等待预警处置）">
              {suggestions.length === 0 ? (
                <Alert type="success" showIcon message="当前工况平稳，无需干预" />
              ) : (
                <Timeline
                  items={suggestions.map((s) => ({
                    color: s.priority === 'high' ? 'red' : s.priority === 'medium' ? 'orange' : 'blue',
                    children: (
                      <div>
                        <Space size={6} wrap>
                          <Tag color={PRIORITY_COLOR[s.priority]}>{s.priority === 'high' ? '高优' : s.priority === 'medium' ? '中优' : '低优'}</Tag>
                          <Text strong>{s.title}</Text>
                        </Space>
                        <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0' }}>
                          {s.message}
                        </Paragraph>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                          {s.actions.map((a, i) => (
                            <li key={i} style={{ fontSize: 12, color: '#555' }}>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
