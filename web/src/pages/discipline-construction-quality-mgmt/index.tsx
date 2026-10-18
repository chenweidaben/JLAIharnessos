/**
 * 健澜科技 jlmedaios - 学科建设质量管理 V13 页（M434-D，M434 收官，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
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
  disciplineKeyDisciplineCount: number;
  disciplineLeaderCount: number;
  disciplineInfluenceScore: number;
}

export default function DisciplineConstructionQualityMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/discipline-construction-quality-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>学科建设质量管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="重点学科数" value={data.disciplineKeyDisciplineCount} suffix="个" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="学科带头人人数" value={data.disciplineLeaderCount} suffix="人" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="学科影响力评分" value={data.disciplineInfluenceScore} precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
