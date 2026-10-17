/**
 * 健澜科技 jlmedaios - 智慧医院分级 V13 页（M395-A，避让旧版 smart-hospital）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface GradeLevel { level: number; score: number; }
interface Resp {
  smartServiceGradeLevel: GradeLevel;
  smartMedicalGradeLevel: GradeLevel;
  smartManagementGradeLevel: GradeLevel;
}

export default function SmartHospitalGradePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/smart-hospital-grade");
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
        <Title level={3} style={{ color: VI.deep }}>智慧医院分级</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card title="智慧服务分级">
                <Statistic title="等级" value={`Level ${data.smartServiceGradeLevel.level}`} />
                <Statistic title="得分" value={data.smartServiceGradeLevel.score} precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="智慧医疗分级">
                <Statistic title="等级" value={`Level ${data.smartMedicalGradeLevel.level}`} />
                <Statistic title="得分" value={data.smartMedicalGradeLevel.score} precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="智慧管理分级">
                <Statistic title="等级" value={`Level ${data.smartManagementGradeLevel.level}`} />
                <Statistic title="得分" value={data.smartManagementGradeLevel.score} precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
