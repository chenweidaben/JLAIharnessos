/**
 * 健澜科技 jlmedaios - 护理交班质量 V13 页（M315-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  patientId: string;
  score: number;
  grade: string;
  omissions: string[];
}

const gradeColor = (g: string): string =>
  g === "优" ? "green" : g === "良" ? "blue" : "red";

export default function NursingHandoverPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/nursing-handover?patientId=p1");
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
        <Title level={3} style={{ color: VI.deep }}>护理交班质量</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`SBAR 齐全率（患者 ${data.patientId}）`} style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 48, color: VI.deep }}>{data.score}%</span>
              <Tag color={gradeColor(data.grade)} style={{ marginLeft: 16, fontSize: 16 }}>
                {data.grade}
              </Tag>
            </Card>
            <Card title="风险交班遗漏">
              <List
                dataSource={data.omissions}
                renderItem={(name) => (
                  <List.Item>
                    <Tag color="red">{name}</Tag>
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
