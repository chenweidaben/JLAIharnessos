/**
 * 健澜科技 jlmedaios - MUSE 跨角色任务流转 V5 页（M284-B）
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
  totalHandoffs: number;
  pendingCount: number;
  closedCount: number;
}

export default function MuseHandoffPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-handoff/pending");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 跨角色任务流转</Title>
        <Paragraph type="secondary">角色交接·自动路由·闭环追踪</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="交接总数" value={data.totalHandoffs} /></Card></Col>
            <Col span={8}><Card><Statistic title="待处理" value={data.pendingCount} /></Card></Col>
            <Col span={8}><Card><Statistic title="已闭环" value={data.closedCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
