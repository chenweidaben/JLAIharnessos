/**
 * 健澜科技 jlmedaios - 心理心身与 EAP V5 页（M272-D）
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
  metrics: { screeningPositiveRate: number; counselingVolume: number; crisisIntervention: number; satisfaction: number };
}

export default function PsychEAPV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/psych-eap-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>心理心身与 EAP V5</Title>
        <Paragraph type="secondary">心理筛查·PHQ-9·GAD-7·PSQI / 心理门诊·心理咨询·认知行为 / EAP员工帮助</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="筛查阳性率" value={`${data.metrics.screeningPositiveRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="咨询量" value={data.metrics.counselingVolume} /></Card></Col>
            <Col span={6}><Card><Statistic title="危机干预" value={data.metrics.crisisIntervention} /></Card></Col>
            <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
