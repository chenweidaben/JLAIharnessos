/**
 * 健澜科技 jlmedaios - 移植透析页（M203-C）
 *
 * 等待/肾移植/肝移植/HSCT/血液净化/透析充分性/随访/伦理。深海蓝 VI。
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
  waiting: { list: number; avgWaitMonths: number; deceasedDonor: number; livingDonor: number };
  kidney: { transplants: number; oneYearSurvival: number };
  liver: { transplants: number; oneYearSurvival: number };
  hsct: { transplants: number; engraftment: number; gvhdRate: number };
  dialysis: { patients: number; hd: number; hdf: number; crrt: number; ktvAvg: number };
  followup: { graftSurvivalRate: number };
  ethics: { approved: number };
  suggestions: string[];
}

export default function TransplantPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/specialty/transplant/report');
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
        <Title level={3} style={{ color: VI.deep }}>器官移植与血液净化</Title>
        <Paragraph type="secondary">肾/肝移植 · 造血干细胞移植 · GVHD · HD/HDF/CRRT · Kt/V 充分性 · 移植物存活</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="等待名单" value={data.waiting.list} /></Card></Col>
              <Col span={6}><Card><Statistic title="肾移植" value={data.kidney.transplants} /></Card></Col>
              <Col span={6}><Card><Statistic title="透析患者" value={data.dialysis.patients} /></Card></Col>
              <Col span={6}><Card><Statistic title="Kt/V 平均" value={data.dialysis.ktvAvg} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>移植存活</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'kid', name: '肾移植 1 年存活', value: `${(data.kidney.oneYearSurvival * 100).toFixed(0)}%` },
                  { key: 'liv', name: '肝移植 1 年存活', value: `${(data.liver.oneYearSurvival * 100).toFixed(0)}%` },
                  { key: 'hsc', name: 'HSCT 植入率', value: `${(data.hsct.engraftment * 100).toFixed(0)}%` },
                  { key: 'gv', name: 'GVHD 发生率', value: `${(data.hsct.gvhdRate * 100).toFixed(0)}%` },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
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
