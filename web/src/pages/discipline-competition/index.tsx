/**
 * 健澜科技 jlmedaios - 学科竞赛 V13 页（M403-C）
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
  nationalClinicalKeySpecialtyRanking: number;
  fudanRankingCount: number;
  bestSpecialtyReputationCount: number;
}

export default function DisciplineCompetitionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/discipline-competition");
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
        <Title level={3} style={{ color: VI.deep }}>学科竞赛</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="国家临床重点专科最佳排名" value={data.nationalClinicalKeySpecialtyRanking} suffix="名" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="复旦排行榜上榜数" value={data.fudanRankingCount} suffix="个" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="最佳专科声誉数" value={data.bestSpecialtyReputationCount} suffix="个" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
