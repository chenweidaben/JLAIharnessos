/**
 * 健澜科技 jlmedaios - 学术交流管理 V13 页（M456-C，学科建设与科研管理组）
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
  academicExchangeActivityCount: number;
  academicExchangeAttendeeCount: number;
  academicExchangeContinuingEducationCount: number;
}

export default function AcademicExchangeMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/academic-exchange-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>学术交流管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="学术活动举办次数" value={data.academicExchangeActivityCount} suffix="次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="外出参会人次" value={data.academicExchangeAttendeeCount} suffix="人次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="主办继教项目数" value={data.academicExchangeContinuingEducationCount} suffix="项" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
