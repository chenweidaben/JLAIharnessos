/**
 * 健澜科技 jlmedaios - AI 辅助 V2 页（M208-A）
 *
 * CDSS/用药建议/AI病历/报告解读/路径/预警/审计/迭代。深海蓝 VI。
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
  cdss: { suggestions: number; adopted: number; modified: number };
  medication: { alerts: number; interactions: number; contraindications: number };
  emr: { autoWritten: number };
  report: { interpreted: number };
  pathway: { applied: number };
  warning: { sepsis: number; heartFailure: number; vte: number };
  audit: { adoptionRate: number };
  iteration: { misCases: number; retrained: number };
  suggestions: string[];
}

export default function AIAssistV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/ai-assist/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>AI 辅助诊断 V2 深化</Title>
        <Paragraph type="secondary">CDSS 鉴别诊断 / AI 用药建议 / AI 病历书写 / 报告解读 / 脓毒症·心衰·VTE 预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="CDSS 建议" value={data.cdss.suggestions} /></Card></Col>
              <Col span={6}><Card><Statistic title="采纳率" value={`${(data.audit.adoptionRate * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI 病历" value={data.emr.autoWritten} /></Card></Col>
              <Col span={6}><Card><Statistic title="误例库" value={data.iteration.misCases} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 预警</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'sep', name: '脓毒症', value: data.warning.sepsis },
                  { key: 'hf', name: '心衰', value: data.warning.heartFailure },
                  { key: 'vte', name: 'VTE', value: data.warning.vte },
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
