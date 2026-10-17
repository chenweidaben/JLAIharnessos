/**
 * 健澜科技 jlmedaios - 医院质量监测 HQMS V5 页（M278-D）
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
  totalMetrics: number;
  passCount: number;
  passRate: number;
  grade: string;
}

export default function HQMSPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/hqms");
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
        <Title level={3} style={{ color: VI.deep }}>医院质量监测 HQMS V5</Title>
        <Paragraph type="secondary">指标采集·基准对标·质量评级·改进闭环</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="指标总数" value={data.totalMetrics} /></Card></Col>
            <Col span={6}><Card><Statistic title="达标数" value={data.passCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="达标率" value={`${data.passRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="质量评级" value={data.grade} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
