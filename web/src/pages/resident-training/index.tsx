/**
 * 健澜科技 jlmedaios - 住院医师规范化培训 V13 页（M343-A）
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
  residentCount: number;
  graduationPassRate: number;
  mentorCount: number;
}

export default function ResidentTrainingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/resident-training");
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
        <Title level={3} style={{ color: VI.deep }}>住院医师规范化培训</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="在培人数" value={data.residentCount} suffix="人" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="结业考核通过率" value={data.graduationPassRate} suffix="%" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="带教老师数" value={data.mentorCount} suffix="人" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
