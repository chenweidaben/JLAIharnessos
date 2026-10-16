/**
 * 健澜科技 jlmedaios - 妇幼健康 V2 页（M221-B）
 *
 * 孕产期保健/高危妊娠/分娩镇痛/新生儿筛查/儿童生长/宫颈乳腺筛查/辅助生殖。深海蓝 VI。
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
  antenatal: { visits: number; highRisk: number };
  labor: { analgesia: number; hemorrhage: number; asphyxia: number };
  newborn: { screening: number };
  child: { growth: number };
  gynecology: { cervical: number; breast: number };
  art: { cycles: number };
  monitoring: { mmr: number };
  management: { coverage: number };
  suggestions: string[];
}

export default function MaternalChildV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/maternal-child/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>妇幼健康 V2</Title>
        <Paragraph type="secondary">孕产期保健 / 高危妊娠 / 分娩镇痛 / 新生儿筛查 / 儿童生长发育 / 宫颈乳腺筛查</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="产前检查" value={data.antenatal.visits} /></Card></Col>
              <Col span={6}><Card><Statistic title="高危妊娠" value={data.antenatal.highRisk} /></Card></Col>
              <Col span={6}><Card><Statistic title="分娩镇痛" value={data.labor.analgesia} /></Card></Col>
              <Col span={6}><Card><Statistic title="新生儿筛查" value={data.newborn.screening} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>关键指标</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'hem', name: '产后出血', value: data.labor.hemorrhage },
                  { key: 'asp', name: '新生儿窒息', value: data.labor.asphyxia },
                  { key: 'cer', name: '宫颈癌筛查', value: data.gynecology.cervical },
                  { key: 'brt', name: '乳腺癌筛查', value: data.gynecology.breast },
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
