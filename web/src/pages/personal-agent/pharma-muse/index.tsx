/**
 * 健澜科技 jlmedaios - Pharma MUSE V2 药事智能体页（M185-D）
 *
 * 处方审核、用药咨询、库存预警、经验沉淀。深海蓝 VI。
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
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface InteractionAlert {
  drugA: string;
  drugB: string;
  severity: 'contraindicated' | 'caution';
  message: string;
}

interface InventoryAlert {
  drugName: string;
  reason: string;
  level: 'low' | 'medium' | 'high';
}

interface Result {
  pharmacistId: string;
  date: string;
  interactionAlerts: InteractionAlert[];
  inventoryAlerts: InventoryAlert[];
  consultRecommendations: string[];
  caseLibrary: Array<{ caseId: string; prescriptionIssue: string; resolution: string }>;
}

function sevColor(s: string): string {
  if (s === 'contraindicated') return 'red';
  return 'orange';
}

export default function PharmaMUSEV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/personal-agent/pharma-muse-v2');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>Pharma MUSE · 药事智能体</Title>
        <Paragraph type="secondary">处方审核 · 用药咨询 · 库存预警 · 经验沉淀</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            {data.interactionAlerts.length > 0 && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message={`${data.interactionAlerts.length} 条药物相互作用警告`}
                description={data.interactionAlerts.map((a, i) => (
                  <div key={i}>
                    <Tag color={sevColor(a.severity)}>{a.severity}</Tag>
                    <Text style={{ marginLeft: 8 }}>{a.message}</Text>
                  </div>
                ))}
              />
            )}

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>库存预警</Text>}>
                  <Table
                    rowKey="drugName"
                    size="small"
                    pagination={false}
                    dataSource={data.inventoryAlerts}
                    columns={[
                      { title: '药品', dataIndex: 'drugName', key: 'drugName' },
                      { title: '原因', dataIndex: 'reason', key: 'reason' },
                      {
                        title: '等级',
                        dataIndex: 'level',
                        key: 'level',
                        render: (l: string) => <Tag color={l === 'high' ? 'red' : l === 'medium' ? 'orange' : 'default'}>{l}</Tag>,
                      },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>用药咨询推荐</Text>}>
                  <List
                    size="small"
                    dataSource={data.consultRecommendations}
                    renderItem={(item) => <List.Item><Text>{item}</Text></List.Item>}
                  />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>典型不合理处方案例库</Text>}>
              <List
                size="small"
                dataSource={data.caseLibrary}
                renderItem={(c) => (
                  <List.Item>
                    <Text strong>{c.prescriptionIssue}：</Text>
                    <Text type="secondary">{c.resolution}</Text>
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
