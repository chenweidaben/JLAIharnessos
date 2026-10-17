/**
 * 健澜科技 jlmedaios - 推送个人化学习 V13 页（M303-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Preference {
  deptPref: Record<string, number>;
  diseasePref: Record<string, number>;
  evidencePref: Record<string, number>;
  authorPref: Record<string, number>;
}

interface Resp {
  preference: Preference;
  agedPreference: Preference;
  personalizedScore: number;
}

export default function DoctorPreferencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/doctor-preference?doctorId=dr-001");
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
        <Title level={3} style={{ color: VI.deep }}>个人偏好画像</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Card title="当前偏好分">
                  <List
                    dataSource={Object.entries(data.preference.deptPref)}
                    renderItem={([k, v]) => (
                      <List.Item>
                        <span>{k}</span><Tag color={v > 0 ? "green" : "red"}>{v}</Tag>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="个人化加权分">
                  <Statistic title="为你推荐 (cardio/afib/strong/dr-zhang)" value={data.personalizedScore} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
