/**
 * 健澜科技 jlmedaios - 管路滑脱风险管理 V13 页（M439-D，M439 收官，患者安全与医疗风险管理组）
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
  tubeDislodgementRate: number;
  tubeDislodgementHighRiskAssessmentRate: number;
  tubeDislodgementReportingRate: number;
}

export default function TubeDislodgementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/tube-dislodgement");
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
        <Title level={3} style={{ color: VI.deep }}>管路滑脱风险管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="管路滑脱率（越低越好）" value={data.tubeDislodgementRate} suffix="‰" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="高危管路评估率" value={data.tubeDislodgementHighRiskAssessmentRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="滑脱上报率" value={data.tubeDislodgementReportingRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
