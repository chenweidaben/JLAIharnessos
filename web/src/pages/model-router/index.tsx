/**
 * 健澜科技 jlmedaios - 多模型路由与降级 V5 页（M280-A）
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
  avgLatencyP95: number;
  totalCost: number;
  fallbackCount: number;
}

export default function ModelRouterPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/model-router");
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
        <Title level={3} style={{ color: VI.deep }}>多模型路由与降级 V5</Title>
        <Paragraph type="secondary">按场景路由主模型·降级链·成本与时延看板</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="调用总数" value={data.totalCalls} /></Card></Col>
            <Col span={6}><Card><Statistic title="P95时延" value={`${data.avgLatencyP95}ms`} /></Card></Col>
            <Col span={6}><Card><Statistic title="总成本" value={`¥${data.totalCost}`} /></Card></Col>
            <Col span={6}><Card><Statistic title="降级次数" value={data.fallbackCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
