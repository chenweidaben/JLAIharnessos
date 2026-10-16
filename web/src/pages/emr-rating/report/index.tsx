/**
 * 健澜科技 jlmedaios - EMR 评级页（M210-C）
 *
 * 1-8级能力/差距分析/整改。深海蓝 VI。
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
  current: number;
  target: number;
  features: { dataCollection: boolean; cdr: boolean; closedLoopCDSS: boolean; paperless: boolean; aiAdvanced: boolean };
  gapAnalysis: { gap: number; actions: string[] };
  suggestions: string[];
}

export default function EMRRatingReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/emr-rating/report');
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
        <Title level={3} style={{ color: VI.deep }}>电子病历评级（0-8 级）</Title>
        <Paragraph type="secondary">1 级数据收集 → 5 级 CDR → 6 级闭环 CDSS → 7 级无纸化 → 8 级 AI 高级应用</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="当前等级" value={`${data.current} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="目标等级" value={`${data.target} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="差距" value={`${data.gapAnalysis.gap} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="整改动作" value={data.gapAnalysis.actions.length} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>能力矩阵</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: '1', name: '数据收集（1级）', value: data.features.dataCollection ? '已具备' : '未具备' },
                  { key: '5', name: 'CDR（5级）', value: data.features.cdr ? '已具备' : '未具备' },
                  { key: '6', name: '闭环 CDSS（6级）', value: data.features.closedLoopCDSS ? '已具备' : '未具备' },
                  { key: '7', name: '无纸化（7级）', value: data.features.paperless ? '已具备' : '未具备' },
                  { key: '8', name: 'AI 高级（8级）', value: data.features.aiAdvanced ? '已具备' : '未具备' },
                ]}
                columns={[
                  { title: '能力', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
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
