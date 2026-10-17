/**
 * 健澜科技 jlmedaios - 失败案例回灌学习飞轮 V5 页（M275-C）
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
  verifiedCount: number;
  pendingCount: number;
  verifiedRate: number;
}

export default function FailureFlywheelPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/failure-flywheel");
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
        <Title level={3} style={{ color: VI.deep }}>失败案例回灌学习飞轮</Title>
        <Paragraph type="secondary">不良事件→RCA→自动生成知识条目与预警规则→专家验证后上线</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="事件总数" value={data.totalEvents} /></Card></Col>
            <Col span={6}><Card><Statistic title="已验证" value={data.verifiedCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="待验证" value={data.pendingCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="验证率" value={`${data.verifiedRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
