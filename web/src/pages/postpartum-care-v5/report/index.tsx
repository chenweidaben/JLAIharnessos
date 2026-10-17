/**
 * 健澜科技 jlmedaios - 月子中心与产后康复 V5 页（M274-B）
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
  timeRange: string;
  metrics: { occupancyRate: number; dischargeDuration: number; infectionRate: number; repurchaseRate: number };
}

export default function PostpartumCareV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/postpartum-care-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>月子中心与产后康复 V5</Title>
        <Paragraph type="secondary">入住管理·房型·套餐·母婴床 / 产妇照护·伤口·恶露·泌乳 / 新生儿·黄疸·喂养</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="入住率" value={`${data.metrics.occupancyRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="出所时长" value={`${data.metrics.dischargeDuration}天`} /></Card></Col>
            <Col span={6}><Card><Statistic title="感染率" value={`${data.metrics.infectionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="复购率" value={`${data.metrics.repurchaseRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
