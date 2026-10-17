/**
 * 健澜科技 jlmedaios - 经验图谱与后继者继承 V5 页（M275-D）
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
  nodeCount: number;
  edgeCount: number;
  specialtyCount: number;
  inheritorCount: number;
  avgCompletionPct: number;
}

export default function ExperienceGraphPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/experience-graph");
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
        <Title level={3} style={{ color: VI.deep }}>经验图谱与后继者继承</Title>
        <Paragraph type="secondary">专科-场景-经验图谱 / 新人入职自动生成必读经验包</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="节点数" value={data.nodeCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="边数" value={data.edgeCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="后继者数" value={data.inheritorCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均完成率" value={`${data.avgCompletionPct}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
