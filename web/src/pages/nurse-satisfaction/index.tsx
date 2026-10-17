/**
 * 健澜科技 jlmedaios - 护士满意度调研 V13 页（M332-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DimensionScore {
  dimension: string;
  score: number;
}

interface Resp {
  dimensions: DimensionScore[];
}

export default function NurseSatisfactionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/nurse-satisfaction");
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
        <Title level={3} style={{ color: VI.deep }}>护士满意度调研</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            {data.dimensions.map((d) => (
              <Col span={8} key={d.dimension}>
                <Card>
                  <Statistic title={d.dimension} value={d.score} suffix="/ 5" />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
