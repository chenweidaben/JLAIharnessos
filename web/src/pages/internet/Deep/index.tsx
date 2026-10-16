/**
 * 健澜科技 jlmedaios - M163-D 互联网医院深化页（处方流转与药品配送）
 *
 * 【医院全场景】处方流转要合规，不能违规售药：
 *  - 问诊七步流程蓝图：预约→接诊→问诊→开方→流转→配送→随访（含每步合规卡口）；
 *  - 处方流转：选处方 + 填患者定位 → BFF 纯函数先合规复核再就近选双证药房；
 *  - 药品配送追踪：按处方回读配送链路（建单/打包/发货/送达/取药）；
 *  - 麻精毒放等特殊药品、复诊二次方未审方，BFF 一律 409 阻断，前端红字提示。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 写操作（处方流转）由 BFF 鉴权 + 合规双重拦截，前端不绕过。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Layout,
  List,
  Row,
  Space,
  Spin,
  Steps,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  grid: '#e6ebf2',
};

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

interface FlowStep {
  key: string;
  order: number;
  title: string;
  complianceGate: string;
}

interface RouteDecision {
  prescriptionId: string;
  routed: boolean;
  pharmacyId: string | null;
  pharmacyName: string | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  channel: 'self_pick' | 'express' | null;
  reason: string;
  warnings: string[];
}

interface DeliveryTrackEvent {
  stage: string;
  title: string;
  at: string;
  note?: string;
}

interface DeliveryTrack {
  prescriptionId: string;
  deliveryNo: string;
  channel: 'self_pick' | 'express';
  currentStage: string;
  currentTitle: string;
  courierCompany: string | null;
  trackingNo: string | null;
  etaMinutes: number | null;
  finished: boolean;
  timeline: DeliveryTrackEvent[];
}

/** 种子处方下拉（与后端 SEED_PRESCRIPTIONS 对齐） */
const RX_OPTIONS = [
  { value: 'rx-seed-001', label: 'RX20261016001（普通处方·已审方）' },
  { value: 'rx-seed-002', label: 'RX20261016002（复诊二次方·已审方）' },
  { value: 'rx-seed-003', label: 'RX20261016003（含麻醉药·禁开演示）' },
  { value: 'rx-seed-004', label: 'RX20261016004（二次方未审方·阻断演示）' },
];

/** 默认患者定位：杭州市中心（武林广场附近） */
const DEFAULT_LNG = 120.160;
const DEFAULT_LAT = 30.275;

export default function InternetDeepPage() {
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [flowLoading, setFlowLoading] = useState(true);
  const [flowError, setFlowError] = useState('');

  // 处方流转
  const [rxId, setRxId] = useState(RX_OPTIONS[0]!.value);
  const [lng, setLng] = useState(String(DEFAULT_LNG));
  const [lat, setLat] = useState(String(DEFAULT_LAT));
  const [routing, setRouting] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteDecision | null>(null);
  const [routeError, setRouteError] = useState('');

  // 配送追踪
  const [trackId, setTrackId] = useState('rx-seed-001');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [track, setTrack] = useState<DeliveryTrack | null>(null);

  const loadFlow = useCallback(async () => {
    setFlowLoading(true);
    setFlowError('');
    try {
      const resp = await fetch('/api/v1/internet/consultation-flow');
      const json = await resp.json();
      if (json.code !== 0) {
        setFlowError(json.message || '问诊流程加载失败');
        return;
      }
      setSteps((json.data as { steps: FlowStep[] }).steps);
    } catch (e) {
      setFlowError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setFlowLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFlow();
  }, [loadFlow]);

  const onRoute = async () => {
    setRouting(true);
    setRouteError('');
    setRouteResult(null);
    try {
      const resp = await fetch('/api/v1/internet/prescription/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionId: rxId,
          patientLocation: { lng: Number(lng), lat: Number(lat) },
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        // 合规不通过（409）：红字展示，禁止流转售药
        setRouteError(json.message || '处方流转被合规拦截');
        return;
      }
      setRouteResult(json.data as RouteDecision);
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setRouting(false);
    }
  };

  const onTrack = async () => {
    if (!trackId.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    setTrack(null);
    try {
      const resp = await fetch(
        `/api/v1/internet/delivery/track/${encodeURIComponent(trackId.trim())}`,
      );
      const json = await resp.json();
      if (json.code !== 0) {
        setTrackError(json.message || '配送追踪加载失败');
        return;
      }
      setTrack(json.data as DeliveryTrack);
    } catch (e) {
      setTrackError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div
        style={{
          background: VI.deep,
          padding: '16px 24px',
          color: '#fff',
        }}
      >
        <Space size="middle">
          <SafetyCertificateOutlined style={{ fontSize: 22 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            互联网医院深化 · 处方流转与药品配送
          </Title>
        </Space>
        <Paragraph style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
          问诊七步闭环 · 麻精毒放禁开 · 复诊二次方须药师审方 · 就近流转双证药房
        </Paragraph>
      </div>

      <Content style={{ padding: 24 }}>
        <Row gutter={[16, 16]}>
          {/* 流程蓝图 */}
          <Col span={24}>
            <Card title="问诊-流转-配送流程蓝图" bordered={false}>
              {flowLoading ? (
                <Spin />
              ) : flowError ? (
                <Alert
                  type="error"
                  showIcon
                  message={flowError}
                  action={
                    <Button size="small" onClick={() => void loadFlow()}>
                      重试
                    </Button>
                  }
                />
              ) : (
                <>
                  <Steps
                    current={steps.length - 1}
                    items={steps.map((s) => ({ title: s.title, description: s.complianceGate }))}
                    style={{ overflowX: 'auto' }}
                  />
                  <List
                    size="small"
                    dataSource={steps}
                    renderItem={(s) => (
                      <List.Item>
                        <Space>
                          <Tag color={VI.accent}>{s.order}</Tag>
                          <Text strong>{s.title}</Text>
                          <Text type="secondary">｜合规卡口：{s.complianceGate}</Text>
                        </Space>
                      </List.Item>
                    )}
                    style={{ marginTop: 16 }}
                  />
                </>
              )}
            </Card>
          </Col>

          {/* 处方流转 */}
          <Col xs={24} lg={12}>
            <Card title={<Space><SendOutlined />处方流转（按患者定位选药房）</Space>} bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong>选择处方</Text>
                  {RX_OPTIONS.map((o) => (
                    <div key={o.value}>
                      <label style={{ fontSize: 13 }}>
                        <input
                          type="radio"
                          name="rx"
                          checked={rxId === o.value}
                          onChange={() => setRxId(o.value)}
                          style={{ marginRight: 8 }}
                        />
                        {o.label}
                      </label>
                    </div>
                  ))}
                </div>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    addonBefore="经度"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                  <Input
                    addonBefore="纬度"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </Space.Compact>
                <Button
                  type="primary"
                  style={{ background: VI.accent }}
                  loading={routing}
                  onClick={() => void onRoute()}
                  icon={<EnvironmentOutlined />}
                >
                  合规复核并流转
                </Button>

                {routeError && (
                  <Alert
                    type="error"
                    showIcon
                    message="已阻断，禁止违规售药"
                    description={routeError}
                  />
                )}

                {routeResult && routeResult.routed && (
                  <Alert
                    type="success"
                    showIcon
                    message={`已流转至：${routeResult.pharmacyName}`}
                    description={
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="距离">
                          {routeResult.distanceKm} km
                        </Descriptions.Item>
                        <Descriptions.Item label="预计送达">
                          {routeResult.etaMinutes} 分钟
                        </Descriptions.Item>
                        <Descriptions.Item label="方式">
                          <Tag color="blue">
                            {routeResult.channel === 'self_pick' ? '到店自取' : '同城快递'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="路由理由">
                          {routeResult.reason}
                        </Descriptions.Item>
                      </Descriptions>
                    }
                  />
                )}
              </Space>
            </Card>
          </Col>

          {/* 配送追踪 */}
          <Col xs={24} lg={12}>
            <Card title={<Space><CheckCircleOutlined />药品配送追踪</Space>} bordered={false}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="处方 ID，如 rx-seed-001"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                />
                <Button
                  type="primary"
                  style={{ background: VI.accent }}
                  loading={trackLoading}
                  onClick={() => void onTrack()}
                >
                  查询
                </Button>
              </Space.Compact>

              {trackError && (
                <Alert
                  style={{ marginTop: 16 }}
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  message={trackError}
                />
              )}

              {track && (
                <div style={{ marginTop: 16 }}>
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="配送单号">{track.deliveryNo}</Descriptions.Item>
                    <Descriptions.Item label="当前状态">
                      <Tag color={track.finished ? 'success' : 'processing'}>
                        {track.currentTitle}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="物流公司">
                      {track.courierCompany ?? '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="运单号">
                      {track.trackingNo ?? '（到店自取）'}
                    </Descriptions.Item>
                  </Descriptions>
                  <Timeline
                    style={{ marginTop: 16 }}
                    items={track.timeline.map((e) => ({
                      color: e.stage === 'cancelled' ? 'red' : 'blue',
                      children: (
                        <>
                          <Text strong>{e.title}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {e.at}
                          </Text>
                          {e.note && (
                            <>
                              <br />
                              <Text style={{ fontSize: 12 }}>{e.note}</Text>
                            </>
                          )}
                        </>
                      ),
                    }))}
                  />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Paragraph style={{ marginTop: 24, color: '#999', fontSize: 12 }}>
          Copyright (c) 2026 杭州健澜科技有限公司 · 处方流转全程合规留痕，不违规售药
        </Paragraph>
      </Content>
    </Layout>
  );
}
