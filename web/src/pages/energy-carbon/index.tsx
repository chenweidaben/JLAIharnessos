/**
 * 健澜科技 jlmedaios - 能源碳排放与绿色医院 V5 页（M279-D）
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
  totalCarbonKg: number;
  anomalyCount: number;
  reductionPct: number;
  onTrack: boolean;
}

export default function EnergyCarbonPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/energy-carbon");
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
        <Title level={3} style={{ color: VI.deep }}>能源碳排放与绿色医院 V5</Title>
        <Paragraph type="secondary">碳足迹核算·能耗异常·减排进度·分项计量</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="总碳排放" value={`${data.totalCarbonKg}kg`} /></Card></Col>
            <Col span={6}><Card><Statistic title="异常区域" value={data.anomalyCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="减排比例" value={`${data.reductionPct}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="达标" value={data.onTrack ? "是" : "否"} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
