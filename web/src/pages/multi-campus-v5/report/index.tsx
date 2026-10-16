/**
 * 健澜科技 jlmedaios - 多院区一体化运行 V5 页（M273-A）
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
  metrics: { integrationRate: number; recognitionRate: number; crossCampusVisits: number; satisfaction: number };
}

export default function MultiCampusV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/multi-campus-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>多院区一体化运行 V5</Title>
        <Paragraph type="secondary">多院区·统一门户·统一号源·统一EMPI / 一体化数据·跨院区查询·检验检查互认</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="一体化率" value={`${data.metrics.integrationRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="互认率" value={`${data.metrics.recognitionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="跨院区就诊" value={`${data.metrics.crossCampusVisits}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
