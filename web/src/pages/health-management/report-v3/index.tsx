/**
 * 健澜科技 jlmedaios - 健康管理 V3 页（M206-B）
 *
 * 健康档案/慢病/随访/体检/接种/妇幼/老年/干预。深海蓝 VI。
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
  ehr: { total: number };
  chronic: { hypertension: number; diabetes: number; coronary: number; stroke: number; copd: number };
  followup: { controlRate: number; managedRate: number; complicationRate: number };
  exam: { total: number; abnormal: number };
  vaccination: { flu: number; pneumonia: number };
  maternalChild: { prenatal: number; child: number };
  elderly: { assessment: number };
  intervention: { lifestyle: number };
  suggestions: string[];
}

export default function HealthManagementV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/health-management/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>健康管理与慢病 V2 深化</Title>
        <Paragraph type="secondary">健康档案 / 高血压·糖尿病慢病管理 / 规范管理率 / 健康体检 / 预防接种</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="健康档案" value={data.ehr.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="高血压" value={data.chronic.hypertension} /></Card></Col>
              <Col span={6}><Card><Statistic title="糖尿病" value={data.chronic.diabetes} /></Card></Col>
              <Col span={6}><Card><Statistic title="控制率" value={`${(data.followup.controlRate * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>慢病管理统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ht', name: '高血压', value: data.chronic.hypertension },
                  { key: 'dm', name: '糖尿病', value: data.chronic.diabetes },
                  { key: 'chd', name: '冠心病', value: data.chronic.coronary },
                  { key: 'st', name: '卒中', value: data.chronic.stroke },
                  { key: 'copd', name: 'COPD', value: data.chronic.copd },
                ]}
                columns={[
                  { title: '病种', dataIndex: 'name', key: 'name' },
                  { title: '人数', dataIndex: 'value', key: 'value' },
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
