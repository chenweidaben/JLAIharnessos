/**
 * 健澜科技 jlmedaios - 数字孪生 3D 手术室页（M185-B）
 *
 * 手术室状态、排程偏差、设备状态、利用率、延误预警。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Layout,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface OREquipment { name: string; status: 'ok' | 'warning' | 'fault' }
interface ORRoom {
  orId: string;
  name: string;
  status: 'idle' | 'in_surgery' | 'preparing' | 'cleaning';
  scheduledSurgery: string | null;
  plannedDuration: number;
  actualElapsed: number;
  equipment: OREquipment[];
}

interface ORResult {
  date: string;
  rooms: ORRoom[];
  utilizationRate: number;
  alerts: Array<{ orId: string; type: string; message: string }>;
  flow: Array<{ phase: string; progress: number; estimatedMinutes: number }>;
}

function statusColor(s: string): string {
  if (s === 'in_surgery') return 'red';
  if (s === 'preparing') return 'orange';
  if (s === 'cleaning') return 'blue';
  return 'default';
}

function eqColor(s: string): string {
  if (s === 'fault') return 'red';
  if (s === 'warning') return 'orange';
  return 'green';
}

export default function ORTwins3DPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ORResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<ORResult>('/api/v1/twin3d/or');
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>数字孪生 3D · 手术室看板</Title>
        <Paragraph type="secondary">实时状态 · 排程偏差 · 设备监控 · 延误预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            {data.alerts.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={`${data.alerts.length} 条延误/设备预警`}
                description={data.alerts.map((a, i) => <div key={i}>{a.message}</div>)}
              />
            )}

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic title="手术室利用率" value={`${(data.utilizationRate * 100).toFixed(0)}%`} valueStyle={{ color: VI.mid }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="手术中" value={data.rooms.filter((r) => r.status === 'in_surgery').length} valueStyle={{ color: '#f5222d' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="设备故障" value={data.rooms.reduce((s, r) => s + r.equipment.filter((e) => e.status === 'fault').length, 0)} valueStyle={{ color: '#faad14' }} />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>手术室状态</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="orId"
                size="small"
                pagination={false}
                dataSource={data.rooms}
                columns={[
                  { title: '房间', dataIndex: 'name', key: 'name' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag>,
                  },
                  { title: '手术', dataIndex: 'scheduledSurgery', key: 'scheduledSurgery', render: (v: string | null) => v ?? '—' },
                  {
                    title: '设备',
                    key: 'equipment',
                    render: (_: unknown, r: ORRoom) =>
                      r.equipment.map((e) => <Tag key={e.name} color={eqColor(e.status)}>{e.name}</Tag>),
                  },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>1号手术室流程仿真</Text>}>
              <Timeline
                items={data.flow.map((f) => ({
                  children: (
                    <div>
                      <Text strong>{f.phase}</Text>
                      <Progress percent={Math.round(f.progress * 100)} size="small" style={{ width: 200, marginLeft: 16 }} />
                      <Text type="secondary" style={{ marginLeft: 8 }}>约 {f.estimatedMinutes} 分钟</Text>
                    </div>
                  ),
                }))}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
