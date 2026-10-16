/**
 * 健澜科技 jlmedaios - 功能检查中心页（M223-D）
 *
 * 常规/Holter心电图/运动平板/ABPM动态血压/肺功能·睡眠呼吸/胃肠镜·支气管镜/超声心动/脑电图·肌电图。深海蓝 VI。
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
  ecg: { routine: number; holter: number; treadmill: number };
  abpm: { dynamic: number };
  pulmonary: { spirometry: number; sleep: number };
  endoscopy: { gastro: number; colon: number; bronchus: number };
  echo: { echocardiogram: number };
  neuro: { eeg: number; emg: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function FunctionalReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/functional/report');
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
        <Title level={3} style={{ color: VI.deep }}>功能检查中心</Title>
        <Paragraph type="secondary">常规·Holter 心电图 / ABPM 动态血压 / 肺功能·睡眠呼吸 / 胃肠镜·支气管镜 / 超声心动·脑电图·肌电图</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="常规心电图" value={data.ecg.routine} /></Card></Col>
              <Col span={6}><Card><Statistic title="Holter" value={data.ecg.holter} /></Card></Col>
              <Col span={6}><Card><Statistic title="胃肠镜" value={data.endoscopy.gastro + data.endoscopy.colon} /></Card></Col>
              <Col span={6}><Card><Statistic title="超声心动" value={data.echo.echocardiogram} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>专科检查</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'abpm', name: '动态血压 ABPM', value: data.abpm.dynamic },
                  { key: 'pf', name: '肺功能', value: data.pulmonary.spirometry },
                  { key: 'sleep', name: '睡眠呼吸监测', value: data.pulmonary.sleep },
                  { key: 'eeg', name: '脑电图 EEG', value: data.neuro.eeg },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
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
