/**
 * 健澜科技 jlmedaios - 疾控传染病与慢病直报 V5 页（M278-C）
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
  totalCases: number;
  pendingFollowup: number;
}

export default function CDCANotificationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/cdc-notification");
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
        <Title level={3} style={{ color: VI.deep }}>疾控传染病与慢病直报 V5</Title>
        <Paragraph type="secondary">甲乙丙类识别·自动直报卡·随访追踪·订正报告</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={12}><Card><Statistic title="直报总数" value={data.totalCases} /></Card></Col>
            <Col span={12}><Card><Statistic title="待随访" value={data.pendingFollowup} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
