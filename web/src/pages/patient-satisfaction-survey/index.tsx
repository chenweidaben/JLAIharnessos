/**
 * 健澜科技 jlmedaios - 患者满意度调研 V13 页（M332-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DimensionScore {
  dimension: string;
  score: number;
}

interface ComplaintReasonCount {
  reason: string;
  count: number;
}

interface Resp {
  overallScore: number;
  dimensions: DimensionScore[];
  complaintReasons: ComplaintReasonCount[];
}

export default function PatientSatisfactionSurveyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-satisfaction-survey");
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
        <Title level={3} style={{ color: VI.deep }}>患者满意度调研</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card>
                  <Statistic title="总体满意度评分" value={data.overallScore} suffix="/ 5" />
                </Card>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {data.dimensions.map((d) => (
                <Col span={6} key={d.dimension}>
                  <Card>
                    <Statistic title={d.dimension} value={d.score} suffix="/ 5" />
                  </Card>
                </Col>
              ))}
            </Row>
            <Card title="不满意原因分布">
              <List
                dataSource={data.complaintReasons}
                renderItem={(item) => (
                  <List.Item>
                    {item.reason}：
                    <Tag color="orange" style={{ marginLeft: 8 }}>{item.count} 人</Tag>
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
