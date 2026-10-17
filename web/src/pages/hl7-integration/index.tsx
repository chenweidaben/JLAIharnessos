/**
 * 健澜科技 jlmedaios - HL7 / WS363 标准对接升级 V5 页（M281-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  totalMessages: number;
  ws363ComplianceRate: number;
}

export default function Hl7IntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/hl7-integration/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>HL7 / WS363 标准对接升级 V5</Title>
        <Paragraph type="secondary">HL7消息收发·WS363国标校验·合规率看板</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={12}><Card><Statistic title="消息总数" value={data.totalMessages} /></Card></Col>
            <Col span={12}><Card><Statistic title="WS363合规率" value={`${data.ws363ComplianceRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
