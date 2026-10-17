/**
 * 健澜科技 jlmedaios - 31 天再入院风险预测 V13 页（M314-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Row {
  patientId: string;
  score: number;
  level: string;
}

interface Resp {
  board: Row[];
  highRisk: string[];
}

const tagColor = (lv: string): string =>
  lv === "高" ? "red" : lv === "中" ? "orange" : "green";

export default function ReadmissionRiskPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/readmission-risk");
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
        <Title level={3} style={{ color: VI.deep }}>31 天再入院风险</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="风险分表" style={{ marginBottom: 16 }}>
              <Table
                rowKey="patientId"
                pagination={false}
                dataSource={data.board}
                columns={[
                  { title: "患者", dataIndex: "patientId" },
                  { title: "风险分", dataIndex: "score" },
                  {
                    title: "等级",
                    dataIndex: "level",
                    render: (lv: string) => <Tag color={tagColor(lv)}>{lv}</Tag>,
                  },
                ]}
              />
            </Card>
            <Card title="高风险患者（≥70）">
              <List
                dataSource={data.highRisk}
                renderItem={(pid) => (
                  <List.Item>
                    <Tag color="red">{pid}</Tag>
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
