/**
 * 健澜科技 jlmedaios - 检验中心 V2 页（M223-A）
 *
 * 检验前中后/急诊检验/微生物药敏/分子诊断PCR·测序·质谱/LIS互认/自助报告。深海蓝 VI。
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
  preanalytic: { errors: number };
  analytic: { tests: number };
  postanalytic: { reports: number };
  emergency: { stat: number };
  microbiology: { cultures: number; ast: number };
  molecular: { pcr: number; sequencing: number; massSpec: number };
  reporting: { lis: boolean; mutual: boolean; kiosk: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function LaboratoryV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/laboratory/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>检验中心 V2</Title>
        <Paragraph type="secondary">检验前中后全流程 / 急诊检验 / 微生物药敏 / 分子诊断 PCR·测序·质谱 / LIS 互认</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="检验项目" value={data.analytic.tests} /></Card></Col>
              <Col span={6}><Card><Statistic title="急诊检验" value={data.emergency.stat} /></Card></Col>
              <Col span={6}><Card><Statistic title="PCR 检测" value={data.molecular.pcr} /></Card></Col>
              <Col span={6}><Card><Statistic title="自助报告机" value={data.reporting.kiosk} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>专业能力</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'cul', name: '细菌培养', value: data.microbiology.cultures },
                  { key: 'ast', name: '药敏试验', value: data.microbiology.ast },
                  { key: 'seq', name: '基因测序', value: data.molecular.sequencing },
                  { key: 'ms', name: '质谱分析', value: data.molecular.massSpec },
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
