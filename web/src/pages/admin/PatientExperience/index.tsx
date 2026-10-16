/**
 * 健澜科技 jlmedaios - M180-C 患者体验管理页（质量与体验）
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 患者体验不能只登记投诉，要把"投诉工单"变成"可闭环的改进任务"。
 * 页面分三块：
 *   1. 四大体验维度目标卡（预约/就诊/缴费/投诉 × 子项 × 目标值）；
 *   2. 体验度量输入区（录入一次就诊旅程 → 实时得分 + 瓶颈维度）；
 *   3. 痛点识别与改进措施（粘贴患者反馈 → 命中痛点 → 可执行改进动作）。
 *
 * 三色：loading / error / empty / data。
 * 深海蓝 VI：主色 #0B3D91，背景 #f5f7fa，卡片白色。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Layout,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const DEEP_BLUE = '#0B3D91';

interface SubItem {
  code: string;
  label: string;
  target: string;
}
interface Dimension {
  code: 'appointment' | 'visit' | 'payment' | 'complaint';
  label: string;
  subItems: SubItem[];
}
interface Catalog {
  dimensions: Dimension[];
  scoreBand: Array<{ min: number; level: string; label: string }>;
}
interface DimScore {
  dimension: string;
  label: string;
  score: number;
  issues: string[];
}
interface Measurement {
  patientId: string;
  overallScore: number;
  level: string;
  dimensions: DimScore[];
  bottleneck: string;
}
interface PainPoint {
  code: string;
  dimension: string;
  label: string;
  desc: string;
  hits: string[];
}
interface Improvement {
  code: string;
  painPoint: string;
  dimension: string;
  title: string;
  action: string;
  owner: string;
  dueDays: number;
}
interface ExperienceResponse {
  catalog: Catalog;
  measurement: Measurement | null;
  painPoint: PainPoint | null;
  improvement: Improvement | null;
}

export default function PatientExperiencePage() {
  const [data, setData] = useState<ExperienceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [patientId, setPatientId] = useState('P0001234');
  const [journeyText, setJourneyText] = useState(
    JSON.stringify(
      {
        appointmentChannel: 'wechat',
        appointmentSuccess: true,
        appointmentWaitMin: 5,
        triageMin: 6,
        waitingMin: 55,
        consultMin: 6,
        examCount: 3,
        pharmacyWaitMin: 12,
        paymentChannel: 'mobile',
        mobilePayFailed: false,
        receiptRequeue: false,
        selfScore: 3,
      },
      null,
      2,
    ),
  );
  const [feedback, setFeedback] = useState('候诊等了两小时，医生一句话就打发了');

  const load = async (withJourney: boolean, withFeedback: boolean) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (withJourney) {
        qs.set('patientId', patientId);
        qs.set('journey', journeyText);
      }
      if (withFeedback) qs.set('feedback', feedback);
      const url = `/api/v1/patient/experience${qs.toString() ? `?${qs.toString()}` : ''}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ExperienceResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const levelColor = useMemo(() => {
    switch (data?.measurement?.level) {
      case 'excellent': return '#3f8600';
      case 'good': return DEEP_BLUE;
      case 'fair': return '#d48806';
      case 'poor': return '#cf1322';
      default: return '#999';
    }
  }, [data]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ borderLeft: `4px solid ${DEEP_BLUE}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: DEEP_BLUE, marginBottom: 4 }}>患者体验管理</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            预约 / 就诊 / 缴费 / 投诉 四大维度闭环管理 —— 不只是登记投诉，要真改进。
          </Paragraph>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 48 }}>加载患者体验数据中…</div>}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={() => void load(false, false)}>重试</Button>}
          />
        )}

        {!loading && !error && data && (
          <>
            {/* 1. 四大体验维度目标卡 */}
            <Row gutter={[16, 16]}>
              {data.catalog.dimensions.map((dim) => (
                <Col xs={24} sm={12} lg={6} key={dim.code}>
                  <Card
                    size="small"
                    title={<span style={{ color: DEEP_BLUE }}>{dim.label}</span>}
                    headStyle={{ background: '#eef3fb' }}
                  >
                    {dim.subItems.map((s) => (
                      <div key={s.code} style={{ marginBottom: 8 }}>
                        <Text strong>{s.label}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>目标：{s.target}</Text>
                      </div>
                    ))}
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 2. 体验度量输入区 */}
            <Card
              size="small"
              style={{ marginTop: 16 }}
              title={<span style={{ color: DEEP_BLUE }}>就诊旅程体验度量</span>}
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      addonBefore="患者ID"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                    />
                    <Input.TextArea
                      rows={10}
                      value={journeyText}
                      onChange={(e) => setJourneyText(e.target.value)}
                      placeholder='{"waitingMin":55,"consultMin":6,...}'
                    />
                    <Button type="primary" style={{ background: DEEP_BLUE }} onClick={() => void load(true, false)}>
                      度量本次体验
                    </Button>
                  </Space>
                </Col>
                <Col xs={24} md={16}>
                  {data.measurement ? (
                    <>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="综合体验分"
                            value={data.measurement.overallScore}
                            suffix="/ 100"
                            valueStyle={{ color: levelColor }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="瓶颈维度"
                            value={data.measurement.bottleneck}
                            valueStyle={{ color: '#cf1322' }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="患者（脱敏）"
                            value={data.measurement.patientId}
                          />
                        </Col>
                      </Row>
                      <Table
                        size="small"
                        style={{ marginTop: 12 }}
                        pagination={false}
                        rowKey="dimension"
                        dataSource={data.measurement.dimensions}
                        columns={[
                          { title: '维度', dataIndex: 'label' },
                          {
                            title: '得分',
                            dataIndex: 'score',
                            render: (s: number) => (
                              <Progress percent={s} size="small" strokeColor={DEEP_BLUE} />
                            ),
                          },
                          {
                            title: '问题点',
                            dataIndex: 'issues',
                            render: (arr: string[]) =>
                              arr.length === 0 ? <Tag color="green">达标</Tag> : arr.map((i) => <Tag key={i} color="red">{i}</Tag>),
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <Alert type="info" showIcon message="左侧录入一次就诊旅程（JSON），点击「度量本次体验」即可看到得分与瓶颈维度。" />
                  )}
                </Col>
              </Row>
            </Card>

            {/* 3. 痛点识别与改进措施 */}
            <Card
              size="small"
              style={{ marginTop: 16 }}
              title={<span style={{ color: DEEP_BLUE }}>患者反馈 → 痛点识别 → 改进措施</span>}
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input.TextArea
                      rows={5}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="粘贴患者投诉/反馈原文…"
                    />
                    <Button type="primary" style={{ background: DEEP_BLUE }} onClick={() => void load(false, true)}>
                      识别痛点并生成改进
                    </Button>
                  </Space>
                </Col>
                <Col xs={24} md={16}>
                  {data.painPoint ? (
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label="痛点代码">
                        <Tag color="red">{data.painPoint.code}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="痛点描述">{data.painPoint.label} — {data.painPoint.desc}</Descriptions.Item>
                      <Descriptions.Item label="命中关键词">
                        {data.painPoint.hits.length === 0
                          ? <Text type="secondary">未命中，待人工确认</Text>
                          : data.painPoint.hits.map((h) => <Tag key={h}>{h}</Tag>)}
                      </Descriptions.Item>
                      {data.improvement && (
                        <>
                          <Descriptions.Item label="改进措施">
                            <Text strong style={{ color: DEEP_BLUE }}>{data.improvement.title}</Text>
                            <br />
                            {data.improvement.action}
                          </Descriptions.Item>
                          <Descriptions.Item label="责任部门">{data.improvement.owner}</Descriptions.Item>
                          <Descriptions.Item label="整改时限">{data.improvement.dueDays} 天</Descriptions.Item>
                        </>
                      )}
                    </Descriptions>
                  ) : (
                    <Alert type="info" showIcon message="粘贴患者反馈原文，自动识别痛点并给出可执行的改进动作（责任部门 + 整改时限）。" />
                  )}
                </Col>
              </Row>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
