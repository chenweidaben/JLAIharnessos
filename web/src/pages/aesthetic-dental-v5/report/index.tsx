/**
 * 健澜科技 jlmedaios - 医美口腔健康消费 V5 页（M274-C）
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
  metrics: { avgTransaction: number; repurchaseRate: number; conversionRate: number; complaintRate: number };
}

export default function AestheticDentalV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/aesthetic-dental-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>医美口腔健康消费 V5</Title>
        <Paragraph type="secondary">医美项目·皮肤·注射·激光 / 口腔项目·正畸·种植·修复 / 会员·营销获客</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="客单价" value={`¥${data.metrics.avgTransaction}`} /></Card></Col>
            <Col span={6}><Card><Statistic title="复购率" value={`${data.metrics.repurchaseRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="转化率" value={`${data.metrics.conversionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="投诉率" value={`${data.metrics.complaintRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
