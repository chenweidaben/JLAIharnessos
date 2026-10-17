/**
 * 健澜科技 jlmedaios - FHIR 资源建模与网关 V5 页（M281-A）
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
  totalCalls: number;
  errorRate: number;
  avgLatencyMs: number;
}

export default function FhirGatewayPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/fhir-gateway");
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
        <Title level={3} style={{ color: VI.deep }}>FHIR 资源建模与网关 V5</Title>
        <Paragraph type="secondary">资源构造·字段校验·调用日志看板</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="调用总数" value={data.totalCalls} /></Card></Col>
            <Col span={8}><Card><Statistic title="错误率" value={`${data.errorRate}%`} /></Card></Col>
            <Col span={8}><Card><Statistic title="平均时延" value={`${data.avgLatencyMs}ms`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
