/**
 * 健澜科技 jlmedaios - 健康体检中心智能化 V5 页（M274-A）
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
  metrics: { checkupVolume: number; bookingRate: number; avgDuration: number; positiveRate: number; followupRate: number };
}

export default function HealthCheckupV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/health-checkup-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>健康体检中心智能化 V5</Title>
        <Paragraph type="secondary">套餐管理·基础·精英·VIP·企业团检 / 预约排程·分时段·智能推荐 / AI报告解读</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="体检量" value={data.metrics.checkupVolume} /></Card></Col>
            <Col span={6}><Card><Statistic title="预约率" value={`${data.metrics.bookingRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均时长" value={`${data.metrics.avgDuration}分钟`} /></Card></Col>
            <Col span={6}><Card><Statistic title="阳性率" value={`${data.metrics.positiveRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
