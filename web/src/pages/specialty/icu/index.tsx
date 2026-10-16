/**
 * 健澜科技 jlmedaios - ICU 创伤页（M203-A）
 *
 * APACHE II/SOFA/器官支持/镇静镇痛/VAP-CLABSI/创伤绿色通道。深海蓝 VI。
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
  admissions: { total: number; apacheAvg: number; sofaAvg: number; mortality: number };
  support: { ventilation: number; crrt: number; ecmo: number; iabp: number };
  sedation: { rassTarget: number };
  infection: { vapRate: number; clabsiRate: number; cautiRate: number };
  trauma: { admissions: number; goldenHour: number; multiInjury: number };
  quality: { unplannedExtubation: number; readmission: number };
  suggestions: string[];
}

export default function ICUPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/specialty/icu/report');
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
        <Title level={3} style={{ color: VI.deep }}>重症医学 ICU 与创伤中心</Title>
        <Paragraph type="secondary">APACHE II / SOFA / ECMO·CRRT / VAP·CLABSI·CAUTI / ISS·GCS 创伤 / 黄金一小时</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="ICU 收治" value={data.admissions.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均 APACHE II" value={data.admissions.apacheAvg} /></Card></Col>
              <Col span={6}><Card><Statistic title="死亡率" value={`${(data.admissions.mortality * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="ECMO" value={data.support.ecmo} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医院感染率</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'vap', name: 'VAP 呼吸机相关肺炎', value: `${(data.infection.vapRate * 100).toFixed(1)}%` },
                  { key: 'cbsi', name: 'CLABSI 导管相关血流感染', value: `${(data.infection.clabsiRate * 100).toFixed(1)}%` },
                  { key: 'cauti', name: 'CAUTI 导尿管相关尿路感染', value: `${(data.infection.cautiRate * 100).toFixed(1)}%` },
                  { key: 'ext', name: '非计划拔管', value: data.quality.unplannedExtubation },
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
