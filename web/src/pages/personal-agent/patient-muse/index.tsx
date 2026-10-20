/**
 * 健澜科技 jlmedaios - Patient MUSE V2 患者智能体页（M186-B）
 *
 * 就诊提醒、用药提醒、健康知识、满意度调查。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Layout,
  List,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Medication {
  drugName: string;
  dosage: string;
  frequency: string;
  precautions: string;
}

interface Result {
  patientId: string;
  date: string;
  visitReminder: { appointmentTime: string; department: string; doctor: string; notes: string } | null;
  medications: Medication[];
  healthTips: string[];
  satisfactionSurvey: { available: boolean; deadline: string };
  reminder: string;
}

export default function PatientMUSEV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/personal-agent/patient-muse-v2');
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
      <Content style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>Patient MUSE · 我的健康助手</Title>
        <Paragraph type="secondary">就诊提醒 · 用药指导 · 健康知识 · 满意度评价</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={data.reminder}
            />

            {data.visitReminder && (
              <Card title={<Text strong style={{ color: VI.deep }}>今日就诊</Text>} style={{ marginBottom: 16 }}>
                <Timeline
                  items={[
                    { children: <Text strong>{data.visitReminder!.appointmentTime} {data.visitReminder!.department} - {data.visitReminder!.doctor}</Text> },
                    { children: <Text type="secondary">注意事项：{data.visitReminder!.notes}</Text> },
                  ]}
                />
              </Card>
            )}

            <Card title={<Text strong style={{ color: VI.deep }}>用药提醒</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="drugName"
                size="small"
                pagination={false}
                dataSource={data.medications}
                columns={[
                  { title: '药品', dataIndex: 'drugName', key: 'drugName' },
                  { title: '剂量', dataIndex: 'dosage', key: 'dosage' },
                  { title: '用法', dataIndex: 'frequency', key: 'frequency' },
                  { title: '注意事项', dataIndex: 'precautions', key: 'precautions' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>健康知识推荐</Text>} style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={data.healthTips}
                renderItem={(tip) => <List.Item><Text>{tip}</Text></List.Item>}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>满意度调查</Text>}>
              <Tag color="blue">{data.satisfactionSurvey.deadline}</Tag>
              <Text type="secondary" style={{ marginLeft: 8 }}>请在就诊后填写满意度评价，帮助我们改进服务</Text>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
