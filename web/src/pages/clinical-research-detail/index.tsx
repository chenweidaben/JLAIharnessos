/**
 * 健澜科技 jlmedaios - 临床研究明细 V13 页（M397-C，避让旧版 clinical-research/clinical-research-stats）
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
  clinicalTrialProjectCount: number;
  investigatorInitiatedResearchCount: number;
  ethicsReviewProjectCount: number;
}

export default function ClinicalResearchDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/clinical-research-detail");
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
        <Title level={3} style={{ color: VI.deep }}>临床研究明细</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="临床试验项目数" value={data.clinicalTrialProjectCount} suffix="项" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="研究者发起临床研究数" value={data.investigatorInitiatedResearchCount} suffix="项" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="伦理审查项目数" value={data.ethicsReviewProjectCount} suffix="项" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
