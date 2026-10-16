/**
 * 健澜科技 jlmedaios - M173-D【质量提升与新场景】医院互联网医院深化页
 *
 * 互联网医院要合规，不能违规售药。本页一次呈现四大深化域：
 *   - 在线问诊深化：图文/语音/视频 + 复诊管理 + 处方流转；
 *   - 互联网药房：处方流转 + 药品配送 + 用药指导；
 *   - 健康管理：在线建档 + 健康档案 + 慢病管理；
 *   - 医患沟通：在线随访 + 健康宣教 + 满意度调查。
 *
 * 数据来源：GET /api/v1/internet/deep（薄壳路由，业务规则在纯函数聚合器层）。
 * 合规红线（前端不绕过，写操作一律由 BFF 鉴权 + 合规双重拦截）：
 *   - 仅复诊可在线处方，初诊必须线下；
 *   - 处方流转必须电子签名 + 药师审核；
 *   - 药品配送必须冷链 / 麻精药特殊管控；
 *   - 无处方不卖药。
 *
 * 生产安全：深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；三态 loading/error/empty。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Layout,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
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

interface ComplianceSwitches {
  followupOnlyPrescription: boolean;
  requireESignature: boolean;
  requirePharmacistReview: boolean;
  coldChainControl: boolean;
  controlledSubstancePickup: boolean;
}

interface DeepModule {
  code: 'consultation' | 'pharmacy' | 'health' | 'communication';
  name: string;
  capabilities: string[];
  complianceGates: string[];
}

interface DeepSystem {
  modules: DeepModule[];
  compliance: ComplianceSwitches;
  complianceReadinessScore: number;
  complianceLevel: 'excellent' | 'good' | 'fair';
  summary: string;
}

interface ConsultationSlot {
  patientId: string;
  order: number;
  channel: string;
  canOnlinePrescribe: boolean;
  action: 'accept_online' | 'recommend_offline';
  note: string;
}

interface Schedule {
  doctorId: string;
  slots: ConsultationSlot[];
  initialCount: number;
  followupCount: number;
  avgWindowMinutes: number;
}

interface JourneyStep {
  step: string;
  name: string;
  done: boolean;
  doneAt: string | null;
  note: string;
}

interface Journey {
  patientId: string;
  steps: JourneyStep[];
  doneCount: number;
  total: number;
  bottleneck: { step: string; name: string; note: string } | null;
  progress: number;
}

interface SmartRoute {
  prescriptionId: string;
  compliant: boolean;
  routed: boolean;
  pharmacyName: string | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  channel: string | null;
  reason: string;
  warnings: string[];
}

interface DeepData {
  system: DeepSystem;
  schedule: Schedule | null;
  journey: Journey | null;
  smartRoute: SmartRoute;
  generatedAt: string;
}

const MODULE_ICONS: Record<DeepModule['code'], string> = {
  consultation: '🩺',
  pharmacy: '💊',
  health: '❤️',
  communication: '💬',
};

export default function InternetHospitalDeepPage() {
  const [data, setData] = useState<DeepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(
        '/api/v1/internet/deep?doctorId=D-DEMO&patientId=P-DEEP',
      );
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '互联网医院深化加载失败');
        return;
      }
      setData(json.data as DeepData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: VI.bg }}>
        <div style={{ textAlign: 'center', padding: '120px 0' }}>
          <Spin size="large" tip="加载互联网医院深化…" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout style={{ minHeight: '100vh', background: VI.bg }}>
        <Content style={{ padding: 24 }}>
          <Alert
            type="error"
            message="加载失败"
            description={error || '未知错误'}
            showMessage
            action={<Button onClick={load}>重试</Button>}
          />
        </Content>
      </Layout>
    );
  }

  const { system, schedule, journey, smartRoute } = data;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: VI.deep, padding: '16px 24px', color: '#fff' }}>
        <Space size="middle">
          <SafetyCertificateOutlined style={{ fontSize: 22 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            互联网医院深化 · 合规不违规售药
          </Title>
        </Space>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          在线问诊深化 / 互联网药房 / 健康管理 / 医患沟通 —— 仅复诊开方，电子签名 + 药师审核，冷链与麻精特殊管控。
        </Paragraph>
      </div>

      <Content style={{ padding: 24 }}>
        {/* 合规 readiness 总览 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={24} align="middle">
            <Col flex="auto">
              <Title level={5} style={{ marginTop: 0 }}>
                <SafetyCertificateOutlined /> 合规 readiness
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {system.summary}
              </Paragraph>
            </Col>
            <Col>
              <Progress
                type="dashboard"
                size={120}
                percent={system.complianceReadinessScore}
                strokeColor={VI.accent}
              />
              <div style={{ textAlign: 'center' }}>
                <Tag color={system.complianceLevel === 'excellent' ? 'green' : system.complianceLevel === 'good' ? 'blue' : 'orange'}>
                  {system.complianceLevel === 'excellent' ? '合规优秀' : system.complianceLevel === 'good' ? '基本合规' : '存在缺口'}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 四大深化域 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {system.modules.map((m) => (
            <Col xs={24} sm={12} lg={6} key={m.code}>
              <Card
                size="small"
                title={
                  <span>
                    <span style={{ marginRight: 8 }}>{MODULE_ICONS[m.code]}</span>
                    {m.name}
                  </span>
                }
                headStyle={{ borderBottom: `2px solid ${VI.accent}` }}
              >
                <List
                  size="small"
                  dataSource={m.capabilities}
                  renderItem={(c) => <List.Item style={{ padding: '4px 0' }}>{c}</List.Item>}
                />
                <div style={{ marginTop: 8 }}>
                  {m.complianceGates.map((g) => (
                    <Tag key={g} color="default" style={{ marginBottom: 4 }}>
                      {g}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          {/* 在线问诊排班优化 */}
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={<span><ScheduleOutlined /> 在线问诊排班优化</span>}
              style={{ height: '100%' }}
            >
              {schedule ? (
                <>
                  <Descriptions size="small" column={3} style={{ marginBottom: 12 }}>
                    <Descriptions.Item label="复诊在线">{schedule.followupCount} 人</Descriptions.Item>
                    <Descriptions.Item label="初诊转线下">{schedule.initialCount} 人</Descriptions.Item>
                    <Descriptions.Item label="均窗口">{schedule.avgWindowMinutes} 分钟</Descriptions.Item>
                  </Descriptions>
                  <List
                    size="small"
                    dataSource={schedule.slots}
                    renderItem={(s) => (
                      <List.Item>
                        <Space direction="vertical" size={0}>
                          <Space>
                            <Text strong>#{s.order} {s.patientId}</Text>
                            <Tag>{s.channel}</Tag>
                            {s.canOnlinePrescribe ? (
                              <Tag color="green">可在线开方</Tag>
                            ) : (
                              <Tag color="red">初诊·转线下</Tag>
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>{s.note}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </>
              ) : (
                <Text type="secondary">传入 doctorId 查看排班优化。</Text>
              )}
            </Card>
          </Col>

          {/* 处方智能路由演示 */}
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={<span><MedicineBoxOutlined /> 处方智能路由（合规先于就近）</span>}
              style={{ height: '100%' }}
            >
              {!smartRoute.compliant ? (
                <Alert
                  type="error"
                  showIcon
                  message="处方已合规阻断，不得售药"
                  description={smartRoute.reason}
                />
              ) : (
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message={`已路由：${smartRoute.pharmacyName ?? ''}`}
                  description={
                    <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
                      <Descriptions.Item label="配送方式">
                        <Tag color="blue">{smartRoute.channel}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="距离/预计">
                        {smartRoute.distanceKm} km / 约 {smartRoute.etaMinutes} 分钟
                      </Descriptions.Item>
                      <Descriptions.Item label="说明">{smartRoute.reason}</Descriptions.Item>
                    </Descriptions>
                  }
                />
              )}
              {smartRoute.warnings.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {smartRoute.warnings.map((w) => (
                    <Tag key={w} icon={<WarningOutlined />} color="orange" style={{ marginBottom: 4 }}>
                      {w}
                    </Tag>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 线上患者旅程 */}
        {journey && (
          <Card size="small" title="线上患者旅程跟踪" style={{ marginTop: 16 }}>
            <Row gutter={24}>
              <Col flex="auto">
                <Timeline
                  items={journey.steps.map((s) => ({
                    color: s.done ? 'green' : s.step === journey.bottleneck?.step ? 'red' : 'gray',
                    children: (
                      <Space direction="vertical" size={0}>
                        <Space>
                          <Text strong={s.done}>{s.name}</Text>
                          {s.done ? <Tag color="green">已完成</Tag> : <Tag color="orange">待完成</Tag>}
                        </Space>
                        {s.doneAt && <Text type="secondary" style={{ fontSize: 12 }}>{s.doneAt}</Text>}
                      </Space>
                    ),
                  }))}
                />
              </Col>
              <Col style={{ width: 220 }}>
                <Progress type="circle" percent={journey.progress} strokeColor={VI.accent} size={120} />
                <div style={{ marginTop: 8 }}>
                  {journey.bottleneck ? (
                    <Text type="warning">
                      当前卡点：{journey.bottleneck.name}（{journey.bottleneck.note}）
                    </Text>
                  ) : (
                    <Text type="success">旅程已全部完成</Text>
                  )}
                </div>
              </Col>
            </Row>
          </Card>
        )}

        <Text type="secondary" style={{ fontSize: 12 }}>
          数据时间：{data.generatedAt} · 杭州健澜科技有限公司
        </Text>
      </Content>
    </Layout>
  );
}
