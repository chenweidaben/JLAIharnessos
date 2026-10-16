/**
 * 健澜科技 jlmedaios - 等级评审页（M205-D）
 *
 * 三级评审/电子病历/互联互通/智慧医院/准备/现场/整改。深海蓝 VI。
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
  tertiary: { chapters: number; coreClauses: number; starClauses: number; selfScore: number };
  emr: { level: number; target: number };
  interoperability: { level: number; target: number };
  smartHospital: { service: boolean; management: boolean; patient: boolean };
  preparation: { selfAssessment: number; policies: number; drills: number; training: number };
  onSite: { ledger: number; tracer: number; interview: number; dataAnalysis: number };
  rectification: { cycles: number; closedLoop: number };
  suggestions: string[];
}

export default function AccreditationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/accreditation/report');
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
        <Title level={3} style={{ color: VI.deep }}>医院等级评审</Title>
        <Paragraph type="secondary">三级综合医院评审 / 电子病历评级 / 互联互通 / 智慧医院三位一体</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="自评得分" value={data.tertiary.selfScore} /></Card></Col>
              <Col span={6}><Card><Statistic title="电子病历评级" value={`${data.emr.level} 级（目标 ${data.emr.target}）`} /></Card></Col>
              <Col span={6}><Card><Statistic title="互联互通" value={`${data.interoperability.level} 乙（目标 ${data.interoperability.target}）`} /></Card></Col>
              <Col span={6}><Card><Statistic title="整改闭环" value={`${data.rectification.closedLoop}/${data.rectification.cycles}`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>评审条款统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ch', name: '评审章节', value: data.tertiary.chapters },
                  { key: 'core', name: '核心条款', value: data.tertiary.coreClauses },
                  { key: 'star', name: '★条款', value: data.tertiary.starClauses },
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
