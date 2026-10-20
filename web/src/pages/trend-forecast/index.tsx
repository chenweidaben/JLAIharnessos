/**
 * 健澜科技 jlmedaios - 趋势预测与经营预警 V5 页（M287-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TrendReport {
  metric: string;
  points: number;
  slope: number;
  nextForecast: number;
  anomalyCount: number;
}

export default function TrendForecastPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<TrendReport[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<TrendReport[]>("/api/v1/trend-forecast");
        if (!cancelled) setList(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>趋势预测与预警</Title>
        <Paragraph type="secondary">线性外推·异常红点·下一节点预测</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Row gutter={16}>
            {list.map((r) => (
              <Col span={12} key={r.metric}>
                <Card
                  title={r.metric}
                  extra={r.anomalyCount > 0 ? <Tag color="red">{r.anomalyCount} 异常</Tag> : <Tag color="green">正常</Tag>}
                >
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="斜率" value={r.slope} /></Col>
                    <Col span={8}><Statistic title="下一期预测" value={r.nextForecast} /></Col>
                    <Col span={8}><Statistic title="样本数" value={r.points} /></Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
