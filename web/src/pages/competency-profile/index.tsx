/**
 * 健澜科技 jlmedaios - 医生能力画像与个性化学习路径 V5 页（M276-D）
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
  totalDoctors: number;
  avgScore: number;
}

export default function CompetencyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/competency-profile");
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
        <Title level={3} style={{ color: VI.deep }}>医生能力画像与个性化学习路径</Title>
        <Paragraph type="secondary">能力维度评分·短板识别·个性化经验精读与专项演练</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={12}><Card><Statistic title="医生总数" value={data.totalDoctors} /></Card></Col>
            <Col span={12}><Card><Statistic title="平均能力分" value={data.avgScore} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
