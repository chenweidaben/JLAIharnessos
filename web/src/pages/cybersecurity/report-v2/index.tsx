/**
 * 健澜科技 jlmedaios - 网络安全 V2 页（M227-C）
 *
 * 防火墙·WAF·IDS-IPS·DMZ/EDR·MDM·补丁/代码审计·渗透·SQL注入·XSS/等保三级·钓鱼演练·事件响应。深海蓝 VI。
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
  perimeter: { firewall: boolean; waf: boolean; ids: boolean; dmz: boolean };
  endpoint: { edr: boolean; mdm: boolean; patched: number };
  server: { hardened: number };
  application: { audited: number; pentested: number };
  data: { encrypted: boolean };
  ops: { monitored: boolean };
  mlps3: { certified: boolean };
  awareness: { phishingDrill: number };
  suggestions: string[];
}

export default function CybersecurityV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/cybersecurity/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>网络安全 V2</Title>
        <Paragraph type="secondary">防火墙·WAF·IDS·DMZ / EDR·MDM·补丁 / 代码审计·渗透测试 / 等保三级·钓鱼演练·事件响应</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="补丁率" value={`${data.endpoint.patched}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="代码审计" value={data.application.audited} /></Card></Col>
              <Col span={6}><Card><Statistic title="渗透测试" value={data.application.pentested} /></Card></Col>
              <Col span={6}><Card><Statistic title="钓鱼演练" value={`${data.awareness.phishingDrill}次/年`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全防护体系</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'firewall', name: '防火墙', value: data.perimeter.firewall ? '已部署' : '未部署' },
                  { key: 'waf', name: 'WAF', value: data.perimeter.waf ? '已部署' : '未部署' },
                  { key: 'edr', name: 'EDR 终端', value: data.endpoint.edr ? '已部署' : '未部署' },
                  { key: 'mlps3', name: '等保三级', value: data.mlps3.certified ? '已认证' : '未认证' },
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
