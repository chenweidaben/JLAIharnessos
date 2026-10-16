/**
 * 健澜科技 jlmedaios - 【安全质量与运营】M172-D 患者服务与体验深化页（老人也能用）
 *
 * 设计原则：患者服务要简单好用，老人也能用。
 *   自上而下四块：
 *     ① 服务体系：智能导诊 / 院内导航 / 智慧门诊 / 智慧住院 四大深化域能力，
 *        并给出「老人友好度」评分（大字/语音/无障碍/志愿者/一步直达）；
 *     ② 院内导航：从当前位置到科室的逐步人读导引，默认无障碍 + AR 提示；
 *     ③ 等待预测：前方人数/窗口数 → 红黄绿灯，附一句老人能懂的话；
 *     ④ 个性化：按年龄/轮椅/陪同调好的字号、语音、提醒渠道与一句欢迎语。
 *
 * 适老化：整体字号偏大（基准 16px）、高对比深海蓝、按钮加大、文案口语化。
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  EnvironmentOutlined,
  HeartOutlined,
  NavigationOutlined,
  SoundOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const PAGE_BG = '#f5f7fa';

/* 与 BFF patientDeep 输出对齐的前端类型 */
interface ElderlySwitches {
  largeFont: boolean;
  voiceBroadcast: boolean;
  barrierFreeFirst: boolean;
  volunteerDesk: boolean;
  oneStepFlow: boolean;
}
interface DeepServiceModule {
  code: 'guide' | 'nav' | 'outpatient' | 'inpatient';
  name: string;
  capabilities: string[];
  elderlyFeatures: string[];
}
interface DeepPatientServiceSystem {
  patientId: string;
  modules: DeepServiceModule[];
  elderly: ElderlySwitches;
  elderlyReadinessScore: number;
  elderlyLevel: 'excellent' | 'good' | 'fair';
  summary: string;
}
interface NavStep {
  action: 'walk' | 'elevator' | 'turn' | 'arrive';
  instruction: string;
  distanceM: number;
  floor?: number;
}
interface PatientFlowOptimization {
  fromName: string;
  toName: string;
  steps: NavStep[];
  totalDistanceM: number;
  etaMin: number;
  barrierFree: boolean;
  crossFloor: boolean;
  urgent: boolean;
  arGuidance: boolean;
}
interface WaitPrediction {
  serviceTypeName: string;
  predictedWaitMin: number;
  aheadCount: number;
  openWindows: number;
  level: 'low' | 'medium' | 'high';
  plainMessage: string;
}
interface PersonalizedService {
  fontScale: 'large' | 'medium' | 'small';
  voiceBroadcast: boolean;
  forceBarrierFree: boolean;
  volunteerDesk: boolean;
  queuePriority: 'normal' | 'priority';
  reminderChannels: Array<'sms' | 'wechat' | 'voice'>;
  greeting: string;
}
interface DeepView {
  patientId: string;
  system: DeepPatientServiceSystem;
  flow: PatientFlowOptimization | null;
  wait: WaitPrediction | null;
  personalized: PersonalizedService;
}

const LEVEL_COLOR: Record<string, string> = {
  excellent: '#52c41a',
  good: ACCENT,
  fair: '#d48806',
};
const WAIT_COLOR: Record<string, string> = {
  low: '#52c41a',
  medium: '#d48806',
  high: '#cf1322',
};

const AGE_OPTIONS = [
  { label: '老年患者', value: 'elderly' },
  { label: '成人', value: 'adult' },
  { label: '儿童', value: 'child' },
];
const FROM_OPTIONS = [
  { label: '门诊大厅', value: 'code:gate_hall' },
  { label: '急诊入口', value: 'code:emergency' },
];
const TO_OPTIONS = [
  { label: '心内科门诊(3层)', value: 'code:dept_cardio' },
  { label: '胸部CT室(5层)', value: 'code:dept_chest' },
  { label: '急诊抢救室', value: 'code:emergency' },
];

export default function PatientDeepPage() {
  const [patientId] = useState('P-2026101601');
  const [ageBand, setAgeBand] = useState('elderly');
  const [from, setFrom] = useState(FROM_OPTIONS[0].value);
  const [to, setTo] = useState(TO_OPTIONS[0].value);
  const [data, setData] = useState<DeepView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams({
      patientId,
      ageBand,
      from,
      to,
      waitType: 'consultation',
      ahead: '8',
      windows: '2',
      avg: '6',
      voice: ageBand === 'elderly' ? '1' : '0',
    });
    return p.toString();
  }, [patientId, ageBand, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch(`/api/v1/patient/deep?${query}`);
        const json = await resp.json();
        if (json.code !== 0) throw new Error(json.message || '加载失败');
        if (!cancelled) setData(json.data as DeepView);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '网络异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <Spin size="large" tip="正在为您调好患者服务…" />
        </Content>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <Alert type="error" showIcon message="加载失败" description={error || '暂无数据'} />
        </Content>
      </Layout>
    );
  }

  const { system, flow, wait, personalized } = data;
  const ageLabel = AGE_OPTIONS.find((a) => a.value === ageBand)?.label ?? '';

  return (
    <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto', fontSize: 16 }}>
        {/* 头部：深海蓝横幅 */}
        <Card
          style={{
            background: `linear-gradient(135deg, ${DEEP_BG} 0%, ${MID_BLUE} 100%)`,
            border: 'none',
            marginBottom: 16,
          }}
        >
          <Space size="middle" direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
              <div>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                  患者服务与体验深化
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0', fontSize: 16 }}>
                  智能导诊 · 院内导航 · 智慧门诊 · 智慧住院：让患者少排队、少跑路、不迷路，老人也能自己走完。
                </Paragraph>
              </div>
              <Badge count="安全质量与运营" style={{ background: ACCENT }} />
            </div>
            <Space size="large" wrap>
              <Space>
                <UserOutlined style={{ color: '#fff' }} />
                <Segmented options={AGE_OPTIONS} value={ageBand} onChange={(v) => setAgeBand(String(v))} />
              </Space>
              <Space>
                <NavigationOutlined style={{ color: '#fff' }} />
                <Segmented options={FROM_OPTIONS} value={from} onChange={(v) => setFrom(String(v))} />
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>→</Text>
                <Segmented options={TO_OPTIONS} value={to} onChange={(v) => setTo(String(v))} />
              </Space>
            </Space>
          </Space>
        </Card>

        {/* 个性化欢迎条 */}
        <Alert
          style={{ marginBottom: 16, fontSize: 16 }}
          type={personalized.queuePriority === 'priority' ? 'warning' : 'info'}
          showIcon
          icon={<HeartOutlined />}
          message={personalized.greeting}
          description={
            <Space wrap>
              <Tag color={ACCENT}>字号：{personalized.fontScale === 'large' ? '大（已为老人调大）' : '常规'}</Tag>
              {personalized.voiceBroadcast && <Tag color={ACCENT} icon={<SoundOutlined />}>语音播报已开</Tag>}
              {personalized.forceBarrierFree && <Tag color="green">已安排无障碍通道</Tag>}
              {personalized.volunteerDesk && <Tag color="blue">志愿者陪伴窗口</Tag>}
              {personalized.queuePriority === 'priority' && <Tag color="red">优先叫号</Tag>}
              <Tag>提醒：{personalized.reminderChannels.join(' / ')}</Tag>
            </Space>
          }
        />

        {/* ① 服务体系 + 老人友好度 */}
        <Card
          title={<span style={{ color: MID_BLUE, fontSize: 18 }}>① 四大深化域服务体系</span>}
          style={{ marginBottom: 16 }}
          size="small"
          extra={
            <Space>
              <Tag color={LEVEL_COLOR[system.elderlyLevel]}>老人友好度 {system.elderlyReadinessScore} 分</Tag>
              <Text type="secondary">{ageLabel}</Text>
            </Space>
          }
        >
          <Progress
            percent={system.elderlyReadinessScore}
            strokeColor={{ from: MID_BLUE, to: ACCENT }}
            style={{ maxWidth: 320, marginBottom: 8 }}
          />
          <Paragraph type="secondary" style={{ fontSize: 15 }}>{system.summary}</Paragraph>
          <Row gutter={[12, 12]}>
            {system.modules.map((m) => (
              <Col xs={24} sm={12} key={m.code}>
                <Card size="small" style={{ borderTop: `3px solid ${ACCENT}` }}>
                  <Text strong style={{ fontSize: 16, color: DEEP_BG }}>{m.name}</Text>
                  <List
                    size="small"
                    dataSource={m.capabilities}
                    renderItem={(c) => <List.Item style={{ padding: '4px 0', fontSize: 15 }}>· {c}</List.Item>}
                  />
                  <div style={{ marginTop: 8 }}>
                    {m.elderlyFeatures.map((f) => (
                      <Tag key={f} color="green" style={{ marginBottom: 4 }}>{f}</Tag>
                    ))}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* ② 院内导航逐步导引 */}
        {flow && (
          <Card
            title={<span style={{ color: MID_BLUE, fontSize: 18 }}>② 院内导航（{flow.fromName} → {flow.toName}）</span>}
            style={{ marginBottom: 16 }}
            size="small"
            extra={
              <Space wrap>
                <Tag color="blue">约 {flow.totalDistanceM} 米</Tag>
                <Tag color="orange">约 {flow.etaMin} 分钟</Tag>
                {flow.crossFloor && <Tag color="purple">需乘电梯</Tag>}
                {flow.barrierFree && <Tag color="green">无障碍通道</Tag>}
                {flow.arGuidance && <Tag icon={<NavigationOutlined />}>AR 导引</Tag>}
                {flow.urgent && <Tag color="red">急诊·请立即前往</Tag>}
              </Space>
            }
          >
            <List
              dataSource={flow.steps}
              renderItem={(s, i) => (
                <List.Item style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <Space size="middle">
                    <Text strong style={{ color: ACCENT, fontSize: 18 }}>{i + 1}</Text>
                    <EnvironmentOutlined style={{ color: MID_BLUE }} />
                    <Text style={{ fontSize: 16 }}>{s.instruction}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* ③ 等待预测 */}
        {wait && (
          <Card
            title={<span style={{ color: MID_BLUE, fontSize: 18 }}>③ {wait.serviceTypeName}·等待预测</span>}
            style={{ marginBottom: 16 }}
            size="small"
            extra={<Tag color={WAIT_COLOR[wait.level]}>{wait.level === 'low' ? '较快' : wait.level === 'medium' ? '稍等' : '较久'}</Tag>}
          >
            <Row gutter={16} align="middle">
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 700, color: WAIT_COLOR[wait.level] }}>
                    {wait.predictedWaitMin}
                  </div>
                  <Text type="secondary">预计还要等（分钟）</Text>
                </div>
              </Col>
              <Col xs={24} md={16}>
                <Paragraph style={{ fontSize: 16, marginBottom: 4 }}>{wait.plainMessage}</Paragraph>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  前方 {wait.aheadCount} 人 · 开放 {wait.openWindows} 个窗口
                </Text>
              </Col>
            </Row>
          </Card>
        )}

        <Paragraph style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 24 }}>
          杭州健澜科技有限公司 · 【安全质量与运营】患者服务与体验深化 M172-D
        </Paragraph>
      </Content>
    </Layout>
  );
}
