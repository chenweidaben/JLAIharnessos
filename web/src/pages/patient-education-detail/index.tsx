/**
 * 健澜科技 jlmedaios - 患者教育明细 V13 页（M400-D，M400 收官，避让旧版 patient-education-stats）
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
  healthEducationSessionCount: number;
  educationMaterialDistributionCount: number;
  patientHealthKnowledgeAwarenessRate: number;
}

export default function PatientEducationDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-education-detail");
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
        <Title level={3} style={{ color: VI.deep }}>患者教育明细</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="健康宣教场次" value={data.healthEducationSessionCount} suffix="场" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="宣教材料发放数" value={data.educationMaterialDistributionCount} suffix="份" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="患者健康知识知晓率" value={data.patientHealthKnowledgeAwarenessRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
