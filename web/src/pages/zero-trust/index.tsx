/**
 * 健澜科技 jlmedaios - 零信任访问与权限最小化 V5 页（M282-B）
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
  totalPolicies: number;
  highRiskSessions: number;
  mfaRequiredCount: number;
}

export default function ZeroTrustPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/zero-trust");
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
        <Title level={3} style={{ color: VI.deep }}>零信任访问与权限最小化 V5</Title>
        <Paragraph type="secondary">策略判定·会话风险·MFA强制</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="策略总数" value={data.totalPolicies} /></Card></Col>
            <Col span={8}><Card><Statistic title="高风险会话" value={data.highRiskSessions} /></Card></Col>
            <Col span={8}><Card><Statistic title="需MFA" value={data.mfaRequiredCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
