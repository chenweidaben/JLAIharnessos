/**
 * 健澜科技 jlmedaios - 患者用药教育与依从性随访 V7 页（M289-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AdherenceRow {
  patientId: string;
  drugCode: string;
  dosesPrescribed: number;
  dosesTaken: number;
  adherenceRate: number;
  grade: "good" | "fair" | "poor";
}

export default function MedAdherencePage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<AdherenceRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<AdherenceRow[]>("/api/v1/med-adherence");
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
        <Title level={3} style={{ color: VI.deep }}>用药依从性随访</Title>
        <Paragraph type="secondary">依从率红黄绿·用药教育</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="患者依从率">
            <List
              dataSource={list}
              renderItem={(r) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${r.patientId} · ${r.drugCode}`}
                    description={`应服${r.dosesPrescribed}次 / 实服${r.dosesTaken}次`}
                  />
                  <Tag color={r.grade === "good" ? "green" : r.grade === "fair" ? "orange" : "red"}>
                    {r.adherenceRate}% · {r.grade}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
