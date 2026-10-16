/**
 * 健澜科技 jlmedaios - 重症医学 V2 页（M224-D）
 *
 * APACHE II/SOFA/器官支持（呼吸·循环·CRRT·ECMO）/VAP·CLABSI·CAUTI·MDRO/营养·RASS-CAM-ICU/PICS随访。深海蓝 VI。
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
  admission: { patients: number; apache: number };
  organ: { respiratory: number; circulatory: number; crrt: number; ecmo: number };
  monitoring: { beds: number };
  infection: { vap: number; clabsi: number; cauti: number; mdro: number };
  nutrition: { enteral: number };
  sedation: { rass: number; cam: number };
  discharge: { survived: number };
  management: { pics: number };
  suggestions: string[];
}

export default function ICUV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/icu/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>重症医学 V2</Title>
        <Paragraph type="secondary">APACHE II·SOFA / 器官支持（呼吸·循环·CRRT·ECMO）/ VAP·CLABSI·CAUTI / RASS·CAM-ICU / PICS</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="ICU 收治" value={data.admission.patients} /></Card></Col>
              <Col span={6}><Card><Statistic title="呼吸支持" value={data.organ.respiratory} /></Card></Col>
              <Col span={6}><Card><Statistic title="CRRT" value={data.organ.crrt} /></Card></Col>
              <Col span={6}><Card><Statistic title="生存率" value={`${Math.round((data.discharge.survived / data.admission.patients) * 100)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>感染控制</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'vap', name: 'VAP 呼吸机相关肺炎', value: data.infection.vap },
                  { key: 'clabsi', name: 'CLABSI 导管相关血流感染', value: data.infection.clabsi },
                  { key: 'cauti', name: 'CAUTI 导尿管相关尿路感染', value: data.infection.cauti },
                  { key: 'mdro', name: 'MDRO 多重耐药菌', value: data.infection.mdro },
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
