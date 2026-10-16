/**
 * 健澜科技 jlmedaios - 职业病防治页（M221-D）
 *
 * 上岗前/在岗/离岗体检/尘肺·职业中毒诊断/粉尘·化学毒物危害/防护用品/应急救援。深海蓝 VI。
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
  exam: { pre: number; in: number; post: number };
  diagnosis: { pneumoconiosis: number; toxicology: number; physical: number };
  hazard: { dust: number; chemical: number; biological: number };
  protection: { ppe: number };
  epidemiology: { surveys: number };
  management: { records: number };
  service: { clinics: number };
  emergency: { drills: number };
  suggestions: string[];
}

export default function OccupationalHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/occupational-health/report');
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
        <Title level={3} style={{ color: VI.deep }}>职业病防治</Title>
        <Paragraph type="secondary">上岗前·在岗·离岗体检 / 尘肺·职业中毒诊断 / 危害因素监测 / 防护与应急</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="上岗前体检" value={data.exam.pre} /></Card></Col>
              <Col span={6}><Card><Statistic title="在岗体检" value={data.exam.in} /></Card></Col>
              <Col span={6}><Card><Statistic title="尘肺诊断" value={data.diagnosis.pneumoconiosis} /></Card></Col>
              <Col span={6}><Card><Statistic title="防护用品" value={data.protection.ppe} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>危害因素与诊断</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'dust', name: '粉尘危害', value: data.hazard.dust },
                  { key: 'chem', name: '化学毒物', value: data.hazard.chemical },
                  { key: 'biol', name: '生物因素', value: data.hazard.biological },
                  { key: 'tox', name: '职业中毒', value: data.diagnosis.toxicology },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
