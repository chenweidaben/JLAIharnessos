/**
 * 健澜科技 jlmedaios - 康复老年页（M202-A）
 *
 * 康复评定/治疗/脑卒中/骨科/心肺/老年CGA/综合征/照护。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  assessment: { adlPatients: number; strokePatients: number; orthoPatients: number; cardiacPatients: number };
  treatment: { physical: number; occupational: number; speech: number; traditional: number };
  geriatrics: { cgaCompleted: number; syndromePatients: number; careDays: number };
  outcomes: { avgImprovement: number; effectiveRate: number };
  suggestions: string[];
}

export default function RehabilitationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/specialty/rehabilitation/report');
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
        <Title level={3} style={{ color: VI.deep }}>康复医学与老年医学</Title>
        <Paragraph type="secondary">ADL 评定 / 物理作业言语治疗 / 脑卒中·骨科·心肺康复 / 老年 CGA / 老年综合征</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="ADL 评定患者" value={data.assessment.adlPatients} /></Card></Col>
              <Col span={6}><Card><Statistic title="脑卒中康复" value={data.assessment.strokePatients} /></Card></Col>
              <Col span={6}><Card><Statistic title="CGA 完成" value={data.geriatrics.cgaCompleted} /></Card></Col>
              <Col span={6}><Card><Statistic title="康复有效率" value={`${(data.outcomes.effectiveRate * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>康复治疗分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pt', name: '物理治疗 PT', value: data.treatment.physical },
                  { key: 'ot', name: '作业治疗 OT', value: data.treatment.occupational },
                  { key: 'st', name: '言语治疗 ST', value: data.treatment.speech },
                  { key: 'tr', name: '传统康复', value: data.treatment.traditional },
                ]}
                columns={[
                  { title: '治疗类型', dataIndex: 'name', key: 'name' },
                  { title: '人次', dataIndex: 'value', key: 'value' },
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
