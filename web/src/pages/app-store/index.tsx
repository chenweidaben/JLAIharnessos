/**
 * 健澜科技 jlmedaios - 第三方应用市场集成 V5 页（M281-D）
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
  totalApps: number;
  approvedCount: number;
  pendingCount: number;
  installCount: number;
}

export default function AppStorePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/app-store");
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
        <Title level={3} style={{ color: VI.deep }}>第三方应用市场集成 V5</Title>
        <Paragraph type="secondary">应用注册·scope授权·安装卸载看板</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="应用总数" value={data.totalApps} /></Card></Col>
            <Col span={6}><Card><Statistic title="已审核" value={data.approvedCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="待审核" value={data.pendingCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="已安装" value={data.installCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
