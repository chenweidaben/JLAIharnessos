/**
 * 健澜科技 jlmedaios - 风险管理页（M217-D）
 *
 * 风险识别/风险矩阵/医疗/运营/财务/法律/风险委员会。深海蓝 VI。
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
  identification: { strategic: number; operational: number; financial: number; legal: number; reputational: number };
  matrix: { high: number; medium: number; low: number };
  medical: { disputes: number; incidents: number; infection: number };
  operational: { risks: number };
  financial: { risks: number };
  legal: { risks: number };
  committee: { meetings: number };
  suggestions: string[];
}

export default function RiskReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/risk/report');
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
        <Title level={3} style={{ color: VI.deep }}>医院风险管理</Title>
        <Paragraph type="secondary">风险识别（战略·运营·财务·法律·声誉）/ 可能性×影响度矩阵 / 医疗风险 / 风险委员会</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="高风险" value={data.matrix.high} /></Card></Col>
              <Col span={6}><Card><Statistic title="中风险" value={data.matrix.medium} /></Card></Col>
              <Col span={6}><Card><Statistic title="医疗纠纷" value={data.medical.disputes} /></Card></Col>
              <Col span={6}><Card><Statistic title="风险委员会" value={data.committee.meetings} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>风险识别分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'str', name: '战略风险', value: data.identification.strategic },
                  { key: 'ops', name: '运营风险', value: data.identification.operational },
                  { key: 'fin', name: '财务风险', value: data.identification.financial },
                  { key: 'leg', name: '法律风险', value: data.identification.legal },
                  { key: 'rep', name: '声誉风险', value: data.identification.reputational },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'value', key: 'value' },
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
