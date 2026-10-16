/**
 * 健澜科技 jlmedaios - 康复医学与日间康复 V5 页（M272-B）
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
  metrics: { adlImprovement: number; returnToWork: number; readmission: number; satisfaction: number };
}

export default function RehabilitationV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/rehabilitation-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>康复医学与日间康复 V5</Title>
        <Paragraph type="secondary">康复评估·Brunnstrom·Fugl-Meyer·Barthel·FIM / 康复治疗·PT·OT·ST·物理因子</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="ADL改善率" value={`${data.metrics.adlImprovement}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="重返工作率" value={`${data.metrics.returnToWork}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="再入院率" value={`${data.metrics.readmission}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
