/**
 * 健澜科技 jlmedaios - 学科建设 V13 页（M397-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Rank { rank: number; deptName: string; }
interface Resp {
  keyDisciplineCount: number;
  disciplineLeaderCount: number;
  specialtyReputationRank: Rank;
}

export default function DisciplineConstructionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/discipline-construction");
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
        <Title level={3} style={{ color: VI.deep }}>学科建设</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="重点学科数" value={data.keyDisciplineCount} suffix="个" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="学科带头人数量" value={data.disciplineLeaderCount} suffix="人" />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="专科声誉排名">
                <Statistic title="排名" value={`第 ${data.specialtyReputationRank.rank} 名`} />
                <Statistic title="科室" value={data.specialtyReputationRank.deptName} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
