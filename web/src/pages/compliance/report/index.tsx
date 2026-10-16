/**
 * 健澜科技 jlmedaios - 合规管理页（M217-B）
 *
 * 医疗法规/药品法规/医保监管/价格/阳光采购/消防/合规培训。深海蓝 VI。
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
  medicalRegulations: { items: number };
  pharmaRegulations: { items: number };
  insurance: { audits: number };
  price: { compliant: boolean };
  procurement: { sunshines: number };
  fireSafety: { compliant: boolean };
  training: { sessions: number };
  suggestions: string[];
}

export default function ComplianceReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/compliance/report');
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
        <Title level={3} style={{ color: VI.deep }}>医院合规管理</Title>
        <Paragraph type="secondary">医疗法规 / 药品法规 / 医保基金监管 / 价格合规 / 阳光采购 / 消防安全</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医疗法规" value={data.medicalRegulations.items} /></Card></Col>
              <Col span={6}><Card><Statistic title="药品法规" value={data.pharmaRegulations.items} /></Card></Col>
              <Col span={6}><Card><Statistic title="医保飞检" value={data.insurance.audits} /></Card></Col>
              <Col span={6}><Card><Statistic title="合规培训" value={data.training.sessions} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>合规状态</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'price', name: '价格合规', value: data.price.compliant ? '合规' : '待整改' },
                  { key: 'fire', name: '消防安全', value: data.fireSafety.compliant ? '合规' : '待整改' },
                  { key: 'proc', name: '阳光采购', value: `${data.procurement.sunshines} 项` },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
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
