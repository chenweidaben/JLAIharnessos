/**
 * 健澜科技 jlmedaios - 质量管理体系页（M189-C）
 *
 * 医疗/护理/医技/服务质量 + 评分 + PDCA 建议。深海蓝 VI。
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
  medicalScore: number;
  nursingQuality: { passRate: number; pressureUlcerRate: number; fallRate: number };
  medtechQuality: { reportAccuracy: number };
  serviceQuality: { satisfaction: number; complaintRate: number };
  pdcaSuggestions: string[];
}

export default function QualityManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/quality-management/report');
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
        <Title level={3} style={{ color: VI.deep }}>质量管理体系 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">医疗 / 护理 / 医技 / 服务质量 + PDCA 改进</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card><Statistic title="医疗质量得分" value={data.medicalScore} suffix="/100" /></Card>
              </Col>
              <Col span={6}>
                <Card title="护理合格率">
                  <Progress percent={Math.round(data.nursingQuality.passRate * 100)} size="small" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="医技报告准确率">
                  <Progress percent={Math.round(data.medtechQuality.reportAccuracy * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="患者满意度">
                  <Progress percent={Math.round(data.serviceQuality.satisfaction * 100)} size="small" status="active" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>PDCA 改进建议</Text>}>
              <List
                size="small"
                dataSource={data.pdcaSuggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
