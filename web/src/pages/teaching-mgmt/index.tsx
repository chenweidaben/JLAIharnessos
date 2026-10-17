/**
 * 健澜科技 jlmedaios - 教学管理 V13 页（M361-B）
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
  teachingHoursCompletionRate: number;
  teacherQualificationPassRate: number;
  studentSatisfaction: number;
}

export default function TeachingMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/teaching-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>教学管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="教学课时完成率" value={data.teachingHoursCompletionRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="带教老师资质合格率" value={data.teacherQualificationPassRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="学员满意度" value={data.studentSatisfaction} precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
