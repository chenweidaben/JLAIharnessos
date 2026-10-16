/**
 * 健澜科技 jlmedaios - 网络安全 V3 页（M244-C）
 *
 * 防火墙WAF-IDS-IPS-DMZ-VPN-SD-WAN/杀毒EDR准入MDM补丁IoT/代码审计渗透SQL注入XSS越权API/等保三级红蓝对抗。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
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
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  perimeter: { firewall: number; waf: number; ids: number; vpn: number };
  endpoint: { edr: number; mdm: number; patch: number; iot: number };
  application: { codeAudit: number; pentest: number; api: number };
  compliance: { mlps: number; redBlue: number };
  suggestions: string[];
}

export default function CybersecurityV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/cybersecurity-v3/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>网络安全 V3</Title>
        <Paragraph type="secondary">防火墙·WAF·IDS·IPS·DMZ·VPN·SD-WAN / 杀毒·EDR·准入·MDM·补丁·IoT / 代码审计·渗透·SQL 注入·XSS·越权 API / 等保三级·红蓝对抗</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="防火墙" value={data.perimeter.firewall} /></Card></Col>
              <Col span={6}><Card><Statistic title="EDR 终端" value={data.endpoint.edr} /></Card></Col>
              <Col span={6}><Card><Statistic title="补丁率" value={`${data.endpoint.patch}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="等保级别" value={data.compliance.mlps} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "waf", name: "WAF", value: data.perimeter.waf },
                  { key: "vpn", name: "VPN 用户", value: data.perimeter.vpn },
                  { key: "pentest", name: "渗透测试", value: data.application.pentest },
                  { key: "redBlue", name: "红蓝对抗", value: data.compliance.redBlue },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
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
