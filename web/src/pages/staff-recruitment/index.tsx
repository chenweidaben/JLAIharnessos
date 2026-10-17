/**
 * 健澜科技 jlmedaios - 人员招聘 V13 页（M384-A）
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
  recruitmentPositionCount: number;
  hiredCount: number;
  recruitmentOnboardRate: number;
}

export default function StaffRecruitmentPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/staff-recruitment");
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
        <Title level={3} style={{ color: VI.deep }}>人员招聘</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="招聘岗位数" value={data.recruitmentPositionCount} suffix="个" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="录用人数" value={data.hiredCount} suffix="人" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="招聘到岗率" value={data.recruitmentOnboardRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
