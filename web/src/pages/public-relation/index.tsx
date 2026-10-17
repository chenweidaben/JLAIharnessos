/**
 * 健澜科技 jlmedaios - 公共关系 V13 页（M398-D，M398 收官）
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
  mediaPositiveReportCount: number;
  volunteerServiceHours: number;
  communityHealthEducationCount: number;
}

export default function PublicRelationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/public-relation");
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
        <Title level={3} style={{ color: VI.deep }}>公共关系</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="媒体正面报道数" value={data.mediaPositiveReportCount} suffix="篇" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="志愿服务时长" value={data.volunteerServiceHours} suffix="小时" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="社区健康宣教次数" value={data.communityHealthEducationCount} suffix="次" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
