/**
 * 健澜科技 jlmedaios - 检验检查智能审核页（M190-A）
 *
 * 检验/影像报告准确率/及时率 + 危急值 + 改进建议。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  labAccuracy: number;
  labTimeliness: number;
  criticalValueRate: number;
  imagingAccuracy: number;
  imagingTimeliness: number;
  suggestions: string[];
}

export default function LabImagingAuditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/lab-imaging/audit/report');
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
        <Title level={3} style={{ color: VI.deep }}>检验检查智能审核 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">检验/影像报告准确率/及时率 + 危急值报告率</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="检验准确率">
                  <Progress percent={Math.round(data.labAccuracy * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="检验及时率">
                  <Progress percent={Math.round(data.labTimeliness * 100)} size="small" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="影像准确率">
                  <Progress percent={Math.round(data.imagingAccuracy * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="危急值报告率" value={`${(data.criticalValueRate * 100).toFixed(1)}%`} /></Card>
              </Col>
            </Row>

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
