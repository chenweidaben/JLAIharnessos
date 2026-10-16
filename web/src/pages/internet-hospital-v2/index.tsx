/**
 * 健澜科技 jlmedaios - 互联网医院深化页 V2（M195-A）
 *
 * 在线问诊/处方/缴费/预约/报告/健康管理/合规/运营。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  consultation: { text: number; video: number; phone: number; satisfaction: number };
  prescription: { issued: number; compliance: number };
  payment: { onlinePaid: number; onlineRate: number };
  appointment: { onlineBooked: number };
  reportQuery: { onlineViewed: number };
  healthManagement: { patients: number };
  compliance: { followupRate: number; firstVisitBanned: boolean; prescriptionCompliance: number };
  operations: { mau: number; repurchaseRate: number; retentionRate: number; conversionRate: number };
  suggestions: string[];
}

export default function InternetHospitalV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/internet-hospital/report');
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
        <Title level={3} style={{ color: VI.deep }}>互联网医院深化</Title>
        <Paragraph type="secondary">在线问诊 / 处方 / 缴费 / 预约 / 报告 / 健康管理 / 合规 / 运营</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="MAU" value={data.operations.mau} /></Card></Col>
              <Col span={6}><Card><Statistic title="在线处方" value={data.prescription.issued} /></Card></Col>
              <Col span={6}>
                <Card title="满意度">
                  <Progress percent={Math.round(data.consultation.satisfaction * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="处方合规率">
                  <Progress percent={Math.round(data.prescription.compliance * 100)} size="small" status="success" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>在线问诊类型</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'text', name: '图文问诊', count: data.consultation.text },
                  { key: 'video', name: '视频问诊', count: data.consultation.video },
                  { key: 'phone', name: '电话问诊', count: data.consultation.phone },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '次数', dataIndex: 'count', key: 'count' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
