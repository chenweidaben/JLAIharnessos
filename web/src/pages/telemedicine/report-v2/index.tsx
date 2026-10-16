/**
 * 健澜科技 jlmedaios - 远程医疗 V2 页（M214-B）
 *
 * 远程会诊/远程门诊/远程影像/病理/心电/教学/培训/设备SLA。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  consult: { remote: number; outpatient: number };
  imaging: { radiology: number; pathology: number; cardiology: number };
  teaching: { sessions: number };
  training: { basic: number };
  equipment: { sla: number };
  suggestions: string[];
}

export default function TelemedicineV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/telemedicine/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>远程医疗 V2</Title>
        <Paragraph type="secondary">远程会诊 / 远程门诊 / 远程影像·病理·心电 / 远程教学 / 设备 SLA</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="远程会诊" value={data.consult.remote} /></Card></Col>
              <Col span={6}><Card><Statistic title="远程影像" value={data.imaging.radiology} /></Card></Col>
              <Col span={6}><Card><Statistic title="远程心电" value={data.imaging.cardiology} /></Card></Col>
              <Col span={6}><Card><Statistic title="设备 SLA" value={`${data.equipment.sla}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>远程影像诊断</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'rad', name: '远程影像', value: data.imaging.radiology },
                  { key: 'pat', name: '远程病理', value: data.imaging.pathology },
                  { key: 'car', name: '远程心电', value: data.imaging.cardiology },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'value', key: 'value' },
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
