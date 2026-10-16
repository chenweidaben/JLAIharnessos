/**
 * 健澜科技 jlmedaios - AI 大脑 2.0 住院试点页（M185-A）
 *
 * 实时床位使用率、医生/护士负荷、4小时预测、优化建议。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Layout,
  List,
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

interface LoadRow {
  doctorId?: string;
  nurseId?: string;
  name: string;
  loadIndex: number;
  level: 'low' | 'medium' | 'high';
}

interface InpatientResult {
  dept: string;
  date: string;
  bedOccupancyRate: number;
  doctorLoad: LoadRow[];
  nurseLoad: LoadRow[];
  forecast: Array<{ hoursAhead: number; predictedOccupied: number; predictedRate: number; tension: 'low' | 'medium' | 'high' }>;
  suggestions: Array<{ type: string; message: string; priority: 'low' | 'medium' | 'high' }>;
}

function levelColor(l: string): string {
  if (l === 'high') return 'red';
  if (l === 'medium') return 'orange';
  return 'green';
}

export default function InpatientBrainV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InpatientResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<InpatientResult>('/api/v1/ai-brain/v2/inpatient', { query: { dept: '内科' } });
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>AI 大脑 2.0 · 住院实时看板</Title>
        <Paragraph type="secondary">床位使用率 · 医生/护士负荷 · 4小时预测 · 优化建议</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="床位使用率"
                    value={`${(data.bedOccupancyRate * 100).toFixed(1)}%`}
                    valueStyle={{ color: data.bedOccupancyRate >= 0.95 ? '#f5222d' : VI.mid }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="医生高负荷数" value={data.doctorLoad.filter((d) => d.level === 'high').length} valueStyle={{ color: '#faad14' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="护士高负荷数" value={data.nurseLoad.filter((n) => n.level === 'high').length} valueStyle={{ color: '#faad14' }} />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>医生负荷</Text>}>
                  <Table
                    rowKey="doctorId"
                    size="small"
                    pagination={false}
                    dataSource={data.doctorLoad}
                    columns={[
                      { title: '医生', dataIndex: 'name', key: 'name' },
                      { title: '负荷指数', dataIndex: 'loadIndex', key: 'loadIndex' },
                      {
                        title: '等级',
                        dataIndex: 'level',
                        key: 'level',
                        render: (l: string) => <Tag color={levelColor(l)}>{l}</Tag>,
                      },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>护士负荷</Text>}>
                  <Table
                    rowKey="nurseId"
                    size="small"
                    pagination={false}
                    dataSource={data.nurseLoad}
                    columns={[
                      { title: '护士', dataIndex: 'name', key: 'name' },
                      { title: '负荷指数', dataIndex: 'loadIndex', key: 'loadIndex' },
                      {
                        title: '等级',
                        dataIndex: 'level',
                        key: 'level',
                        render: (l: string) => <Tag color={levelColor(l)}>{l}</Tag>,
                      },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>未来4小时床位预测</Text>} style={{ marginBottom: 16 }}>
              <Timeline
                items={data.forecast.map((f) => ({
                  children: (
                    <div>
                      <Text strong style={{ color: VI.mid }}>{f.hoursAhead}小时后：占用 {f.predictedOccupied} 床（{(f.predictedRate * 100).toFixed(0)}%）</Text>
                      <Tag color={levelColor(f.tension)} style={{ marginLeft: 8 }}>{f.tension}紧张度</Tag>
                    </div>
                  ),
                }))}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>优化建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => (
                  <List.Item>
                    <Tag color={s.priority === 'high' ? 'red' : s.priority === 'medium' ? 'orange' : 'default'}>{s.priority}</Tag>
                    <Text style={{ marginLeft: 8 }}>{s.message}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
