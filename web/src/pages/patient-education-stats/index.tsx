/**
 * 健澜科技 jlmedaios - 健教材料推送 V13 页（M326-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DiseaseGroup {
  disease: string;
  count: number;
}

interface Resp {
  diseaseDistribution: DiseaseGroup[];
  readRate: number;
  forwardRate: number;
}

export default function PatientEducationStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-education-stats");
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
        <Title level={3} style={{ color: VI.deep }}>健教材料推送</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="阅读率" value={data.readRate} suffix="%" />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="转发率" value={data.forwardRate} suffix="%" />
                </Card>
              </Col>
            </Row>
            <Card title="按病种推送量">
              <List
                dataSource={data.diseaseDistribution}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.disease} description={`${item.count} 份`} />
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
