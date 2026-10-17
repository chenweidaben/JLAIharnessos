/**
 * 健澜科技 jlmedaios - 临床研究 V13 页（M355-B，stats 避让已有 clinicalResearchV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  gcpProjectCount: number;
  ethicsReviewCount: number;
  sciPaperCount: number;
}

export default function ClinicalResearchStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/clinical-research-stats");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>临床研究</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="GCP 在研项目数" value={data.gcpProjectCount} suffix="项" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="年度伦理审查数" value={data.ethicsReviewCount} suffix="次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="SCI 论文产出数" value={data.sciPaperCount} suffix="篇" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
