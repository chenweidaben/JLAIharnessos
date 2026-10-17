/**
 * 健澜科技 jlmedaios - 人才发展 V13 页（M397-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TitleStructure { senior: number; deputySenior: number; intermediate: number; junior: number; }
interface Resp {
  highLevelTalentCount: number;
  titleStructureComposition: TitleStructure;
  talentTrainingPlanCompletionRate: number;
}

export default function TalentDevelopmentPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/talent-development");
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
        <Title level={3} style={{ color: VI.deep }}>人才发展</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="高层次人才数" value={data.highLevelTalentCount} suffix="人" />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="职称结构构成">
                <Statistic title="正高" value={data.titleStructureComposition.senior} />
                <Statistic title="副高" value={data.titleStructureComposition.deputySenior} />
                <Statistic title="中级" value={data.titleStructureComposition.intermediate} />
                <Statistic title="初级" value={data.titleStructureComposition.junior} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="人才培养计划完成率" value={data.talentTrainingPlanCompletionRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
