/**
 * 健澜科技 jlmedaios - 知识资产生命周期总览 V13 页（M296-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Overview {
  freshCount: number;
  staleCount: number;
  archivedCount: number;
  pendingReviewCount: number;
  total: number;
  healthScore: number;
  gaps: string[];
}

export default function KnowledgeLifecyclePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Overview>("/api/v1/knowledge-lifecycle");
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
        <Title level={3} style={{ color: VI.deep }}>知识资产生命周期</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={4}><Card><Statistic title="fresh" value={data.freshCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="stale" value={data.staleCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="archived" value={data.archivedCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="待复核" value={data.pendingReviewCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="总数" value={data.total} /></Card></Col>
              <Col span={4}><Card><Statistic title="健康分" value={data.healthScore} /></Card></Col>
            </Row>
            <Card title="缺口红黄灯" style={{ marginTop: 16 }}>
              {data.gaps.length === 0 && <Tag color="green">无缺口</Tag>}
              <List
                dataSource={data.gaps}
                renderItem={(g) => <List.Item><Tag color="red">{g}</Tag></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
