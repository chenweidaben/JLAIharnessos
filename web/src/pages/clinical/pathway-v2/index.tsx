/**
 * 健澜科技 jlmedaios - 临床路径管理 V2 页（M188-A）
 *
 * 入组率/完成率/变异率 + 费用对比 + 变异原因分析。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  disease: string;
  timeRange: string;
  enrollmentRate: number;
  completionRate: number;
  variationRate: number;
  losComparison: { pathway: number; nonPathway: number; reduction: number };
  costComparison: { pathway: number; nonPathway: number; reduction: number };
  variationReasons: Array<{ reason: string; count: number }>;
  complianceScore: number;
  suggestions: string[];
}

export default function ClinicalPathwayV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/clinical/pathway/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>临床路径 · {data?.dept ?? ''} {data?.disease ?? ''}</Title>
        <Paragraph type="secondary">入组率 / 完成率 / 变异率 / 费用对比 / 变异原因</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="入组率">
                  <Progress percent={data.enrollmentRate} status={data.enrollmentRate >= 80 ? 'success' : 'exception'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="完成率">
                  <Progress percent={data.completionRate} status={data.completionRate >= 90 ? 'success' : 'normal'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="变异率">
                  <Progress percent={data.variationRate} status={data.variationRate <= 10 ? 'success' : 'exception'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="依从性评分" value={data.complianceScore} suffix="/100" /></Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>平均住院日对比（天）</Text>}>
                  <Statistic title="路径组" value={data.losComparison.pathway} suffix="天" />
                  <Statistic title="非路径组" value={data.losComparison.nonPathway} suffix="天" style={{ marginTop: 8 }} />
                  <Text type="secondary">路径组缩短 {data.losComparison.reduction}%</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>费用对比（元）</Text>}>
                  <Statistic title="路径组" value={data.costComparison.pathway} />
                  <Statistic title="非路径组" value={data.costComparison.nonPathway} style={{ marginTop: 8 }} />
                  <Text type="secondary">路径组降低 {data.costComparison.reduction}%</Text>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>变异原因分析</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="reason"
                size="small"
                pagination={false}
                dataSource={data.variationReasons}
                columns={[
                  { title: '原因', dataIndex: 'reason', key: 'reason' },
                  { title: '例数', dataIndex: 'count', key: 'count' },
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
