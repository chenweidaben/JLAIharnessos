/**
 * 健澜科技 jlmedaios - 操作审计与数据防泄漏 DLP V5 页（M282-C）
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
  highRiskCount: number;
  blockedCount: number;
  pendingApprovals: number;
}

export default function DlpPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/dlp");
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
        <Title level={3} style={{ color: VI.deep }}>操作审计与数据防泄漏 DLP V5</Title>
        <Paragraph type="secondary">泄漏检测·导出审批·告警分级</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="事件总数" value={data.totalEvents} /></Card></Col>
            <Col span={6}><Card><Statistic title="高风险" value={data.highRiskCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="已阻断" value={data.blockedCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="待审批导出" value={data.pendingApprovals} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
