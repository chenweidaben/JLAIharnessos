/**
 * 健澜科技 jlmedaios - 院间数据共享授权 V5 页（M281-C）
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
  totalConsents: number;
  activeCount: number;
  revokedCount: number;
  auditCount: number;
}

export default function DataSharingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/data-sharing/audit");
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
        <Title level={3} style={{ color: VI.deep }}>院间数据共享授权 V5</Title>
        <Paragraph type="secondary">患者授权·范围鉴权·撤回审计</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="授权总数" value={data.totalConsents} /></Card></Col>
            <Col span={6}><Card><Statistic title="有效" value={data.activeCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="已撤回" value={data.revokedCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="审计记录" value={data.auditCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
