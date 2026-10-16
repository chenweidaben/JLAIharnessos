/**
 * 健澜科技 jlmedaios - 安宁疗护与缓和医疗 V5 页（M272-A）
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
  metrics: { symptomControlRate: number; familySatisfaction: number; los: number; bedOccupancy: number };
}

export default function HospicePalliativeV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/hospice-palliative-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>安宁疗护与缓和医疗 V5</Title>
        <Paragraph type="secondary">安宁准入·预后评估·多学科·家属沟通 / 症状管理·疼痛·呼吸困难·谵妄·压疮</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="症状控制率" value={`${data.metrics.symptomControlRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="家属满意度" value={`${data.metrics.familySatisfaction}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均住院日" value={`${data.metrics.los}天`} /></Card></Col>
            <Col span={6}><Card><Statistic title="床位占用率" value={`${data.metrics.bedOccupancy}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
