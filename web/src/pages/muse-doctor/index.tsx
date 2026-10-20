/**
 * 健澜科技 jlmedaios - 医生 MUSE 工作台 V5 页（M283-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  pendingCount: number;
  highSeverityCount: number;
  adviceCount: number;
  experienceTips: string[];
  topPatient: { patientId: string; name: string; severity: number } | null;
}

export default function MuseDoctorPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-doctor");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>医生 MUSE 工作台</Title>
        <Paragraph type="secondary">今日待诊·AI建议·经验提醒</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}><Statistic title="在院患者" value={data.pendingCount} /></Col>
                <Col span={6}><Statistic title="重症" value={data.highSeverityCount} /></Col>
                <Col span={6}><Statistic title="AI建议" value={data.adviceCount} /></Col>
                <Col span={6}><Statistic title="优先查房" value={data.topPatient?.name ?? "—"} /></Col>
              </Row>
            </Card>
            <Card title="经验提醒">
              <List
                size="small"
                dataSource={data.experienceTips}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
