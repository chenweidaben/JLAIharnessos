/**
 * 健澜科技 jlmedaios - 营养膳食页（M220-C）
 *
 * NRS2002/PG-SGA/EN·PN/治疗膳食/特殊人群/营养门诊/膳食管理/随访。深海蓝 VI。
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
  screening: { nrs2002: number; pgsga: number };
  treatment: { en: number; pn: number; therapeutic: number };
  special: { maternity: number; pediatric: number; elderly: number; oncology: number; critical: number };
  clinic: { visits: number };
  meals: { served: number };
  followup: { patients: number };
  suggestions: string[];
}

export default function NutritionReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/nutrition/report');
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
        <Title level={3} style={{ color: VI.deep }}>临床营养与膳食</Title>
        <Paragraph type="secondary">NRS2002·PG-SGA 筛查 / EN·PN 营养治疗 / 治疗膳食 / 特殊人群 / 营养门诊·随访</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="NRS2002 筛查" value={data.screening.nrs2002} /></Card></Col>
              <Col span={6}><Card><Statistic title="EN 肠内营养" value={data.treatment.en} /></Card></Col>
              <Col span={6}><Card><Statistic title="PN 肠外营养" value={data.treatment.pn} /></Card></Col>
              <Col span={6}><Card><Statistic title="营养门诊" value={data.clinic.visits} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>特殊人群营养</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'mat', name: '孕产营养', value: data.special.maternity },
                  { key: 'ped', name: '儿童营养', value: data.special.pediatric },
                  { key: 'old', name: '老年营养', value: data.special.elderly },
                  { key: 'onc', name: '肿瘤营养', value: data.special.oncology },
                  { key: 'crit', name: '危重症营养', value: data.special.critical },
                ]}
                columns={[
                  { title: '人群', dataIndex: 'name', key: 'name' },
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
