/**
 * 健澜科技 jlmedaios - 31 天再入院率 V13 页（M335-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DiseaseRate {
  disease: string;
  rate: number;
}

interface Resp {
  overallRate: number;
  diseaseRates: DiseaseRate[];
}

export default function ReadmissionStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/readmission-stats");
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
        <Title level={3} style={{ color: VI.deep }}>31 天再入院率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card>
                  <Statistic title="总体再入院率" value={data.overallRate} suffix="%" />
                </Card>
              </Col>
            </Row>
            <Card title="各病种再入院率">
              <List
                dataSource={data.diseaseRates}
                renderItem={(item) => (
                  <List.Item>
                    {item.disease}：
                    <Tag color={item.rate > 5 ? "red" : "green"} style={{ marginLeft: 8 }}>
                      {item.rate}%
                    </Tag>
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
