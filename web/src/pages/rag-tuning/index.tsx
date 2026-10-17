/**
 * 健澜科技 jlmedaios - RAG 知识库检索优化 V5 页（M280-C）
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
  totalChunks: number;
  avgHitRate: number;
  topK: number;
}

export default function RagTuningPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/rag-tuning/hit-rate");
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
        <Title level={3} style={{ color: VI.deep }}>RAG 知识库检索优化 V5</Title>
        <Paragraph type="secondary">向量+关键词混合检索·重排·命中率看板</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="分块总数" value={data.totalChunks} /></Card></Col>
            <Col span={8}><Card><Statistic title="命中率" value={`${data.avgHitRate}%`} /></Card></Col>
            <Col span={8}><Card><Statistic title="TopK" value={data.topK} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
