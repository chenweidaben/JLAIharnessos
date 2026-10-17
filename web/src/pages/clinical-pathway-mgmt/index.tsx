/**
 * 健澜科技 jlmedaios - 临床路径管理 V13 页（M421-D，M421 收官，换名避让旧版 clinicalPathwayDetailV13）
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
  clinicalPathwayEnrollmentRate: number;
  clinicalPathwayCompletionRate: number;
  clinicalPathwayVariationRate: number;
}

export default function ClinicalPathwayMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/clinical-pathway-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>临床路径管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="临床路径入径率" value={data.clinicalPathwayEnrollmentRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="临床路径完成率" value={data.clinicalPathwayCompletionRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="临床路径变异率（越低越好）" value={data.clinicalPathwayVariationRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
