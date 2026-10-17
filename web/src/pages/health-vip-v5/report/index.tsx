/**
 * 健澜科技 jlmedaios - 健康管理 VIP 服务 V5 页（M274-D）
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
  metrics: { renewalRate: number; healthIndicatorImprovement: number; nps: number; complaint: number };
}

export default function HealthVIPV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/health-vip-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>健康管理 VIP 服务 V5</Title>
        <Paragraph type="secondary">VIP会员·等级·权益·家庭医生·绿通 / 私人医生·签约·上门·转诊 / 慢病管理</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="续约率" value={`${data.metrics.renewalRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="健康指标改善" value={`${data.metrics.healthIndicatorImprovement}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="NPS" value={data.metrics.nps} /></Card></Col>
            <Col span={6}><Card><Statistic title="投诉" value={data.metrics.complaint} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
