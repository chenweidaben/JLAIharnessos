/**
 * 健澜科技 jlmedaios - 智慧医院评级自评 V13 页（M323-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  medicalServiceScore: number;
  nursingMgmtScore: number;
  smartMedicalScore: number;
  overallScore: number;
  isQualified: boolean;
}

export default function SmartHospitalRatingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/smart-hospital-rating");
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
        <Title level={3} style={{ color: VI.deep }}>智慧医院评级自评</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="总分" value={data.overallScore} style={{ marginRight: 48 }} />
              {data.isQualified ? (
                <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>达标（智慧医院）</Tag>
              ) : (
                <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>未达标</Tag>
              )}
            </Card>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic title="医疗服务" value={data.medicalServiceScore} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="护理管理" value={data.nursingMgmtScore} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="智慧医疗" value={data.smartMedicalScore} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
