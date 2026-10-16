/**
 * 健澜科技 jlmedaios - 临床营养与膳食治疗 V5 页（M272-C）
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
  metrics: { malnutritionRate: number; nutritionInterventionRate: number; calorieTarget: number; complication: number };
}

export default function ClinicalNutritionV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/clinical-nutrition-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>临床营养与膳食治疗 V5</Title>
        <Paragraph type="secondary">营养筛查·NRS-2002·MNA·GLIM / 膳食治疗·糖尿病·肾病·管饲·治疗膳食</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="营养不良率" value={`${data.metrics.malnutritionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="营养干预率" value={`${data.metrics.nutritionInterventionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="热量达标率" value={`${data.metrics.calorieTarget}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="并发症率" value={`${data.metrics.complication}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
