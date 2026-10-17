/**
 * 健澜科技 jlmedaios - MUSE 错误拦截与风险避免 V5 页（M285-B）
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
  totalEvents: number;
  interceptedCount: number;
  avoidedHarmTotal: number;
  topRisk: string;
}

export default function MuseInterceptionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-interception");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 错误拦截</Title>
        <Paragraph type="secondary">风险拦截·损害避免·类型排行</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="总事件" value={data.totalEvents} /></Card></Col>
            <Col span={6}><Card><Statistic title="已拦截" value={data.interceptedCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="避免损害值" value={data.avoidedHarmTotal} /></Card></Col>
            <Col span={6}><Card><Statistic title="最高风险" value={data.topRisk} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
