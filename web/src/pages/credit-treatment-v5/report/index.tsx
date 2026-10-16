/**
 * 健澜科技 jlmedaios - 信用就医先诊后付 V5 页（M271-B）
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
  metrics: { signupRate: number; postPayRatio: number; defaultRate: number; collectionTime: number; satisfaction: number };
}

export default function CreditTreatmentV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/credit-treatment-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>信用就医先诊后付 V5</Title>
        <Paragraph type="secondary">先诊疗后付费·信用分级·免押金·后付费 / 信用评估·医保信用·金融信用·院内信用</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="签约率" value={`${data.metrics.signupRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="后付占比" value={`${data.metrics.postPayRatio}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="违约率" value={`${data.metrics.defaultRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
