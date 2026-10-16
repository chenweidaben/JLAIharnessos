/**
 * 健澜科技 jlmedaios - 适老化页（M199-C）
 *
 * 大字体/语音交互/智能辅助/流程优化/健康监测/用药/远程关爱。深海蓝 VI。
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
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  interface: { largeFont: boolean; highContrast: boolean; simplifiedLayout: boolean };
  voice: { query: boolean; input: boolean; navigation: boolean; dialect: number };
  assistant: { triage: boolean; companion: boolean; reminder: boolean; qa: boolean };
  process: { optimized: number };
  monitoring: { devices: number };
  medication: { reminders: number };
  remote: { familyView: boolean; emergencyCall: boolean; videoConsult: number };
  training: { sessions: number };
  suggestions: string[];
}

export default function ElderlyFriendlyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/elderly-friendly/report');
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
        <Title level={3} style={{ color: VI.deep }}>适老化改造</Title>
        <Paragraph type="secondary">大字体 / 语音交互 / 智能辅助 / 流程优化 / 健康监测 / 用药管理 / 远程关爱</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="适老设备" value={data.monitoring.devices} /></Card></Col>
              <Col span={6}><Card><Statistic title="用药提醒" value={data.medication.reminders} /></Card></Col>
              <Col span={6}><Card><Statistic title="视频问诊" value={data.remote.videoConsult} /></Card></Col>
              <Col span={6}><Card><Statistic title="培训场次" value={data.training.sessions} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>适老功能覆盖</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'lf', name: '大字体模式', on: data.interface.largeFont },
                  { key: 'hc', name: '高对比模式', on: data.interface.highContrast },
                  { key: 'sl', name: '简化布局', on: data.interface.simplifiedLayout },
                  { key: 'em', name: '紧急呼叫', on: data.remote.emergencyCall },
                  { key: 'fv', name: '子女查看', on: data.remote.familyView },
                ]}
                columns={[
                  { title: '功能', dataIndex: 'name', key: 'name' },
                  { title: '已启用', dataIndex: 'on', key: 'on', render: (on: boolean) => <Tag color={on ? 'green' : 'red'}>{on ? '是' : '否'}</Tag> },
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
