/**
 * 健澜科技 jlmedaios - 床位需求与周转预测 V3 页（M277-B）
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
  ward: string;
  forecastOccupied: number;
  occupancyRate: number;
  turnover: number;
  bedPressure: string;
}

export default function BedForecastPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/bed-forecast?ward=心内科");
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
        <Title level={3} style={{ color: VI.deep }}>床位需求与周转预测 V3</Title>
        <Paragraph type="secondary">占用预测·LOS估算·出院协调·床位压力分级</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="病区" value={data.ward} /></Card></Col>
            <Col span={6}><Card><Statistic title="预测占用" value={data.forecastOccupied} /></Card></Col>
            <Col span={6}><Card><Statistic title="占用率" value={`${data.occupancyRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="床位压力" value={data.bedPressure} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
