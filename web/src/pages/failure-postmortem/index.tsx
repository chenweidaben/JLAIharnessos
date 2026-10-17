/**
 * 健澜科技 jlmedaios - 失败案例根因复盘与防再发机制 V10 页（M292-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface GroupRow {
  rootCause: string;
  count: number;
  totalRecurrence: number;
  preventionPlan: string;
  items: { id: string; patientCase: string; description: string; recurrenceCnt: number }[];
}

const TAG_COLOR: Record<string, string> = {
  diagnosis_error: "red",
  medication_error: "orange",
  communication_delay: "blue",
  process_breakdown: "purple",
};

export default function FailurePostmortemPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<GroupRow[]>("/api/v1/failure/postmortem");
        if (!cancelled) setGroups(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>失败案例复盘</Title>
        <Paragraph type="secondary">根因聚类·复发次数·防再发措施</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            {groups.map((g) => (
              <Card
                key={g.rootCause}
                title={
                  <span>
                    <Tag color={TAG_COLOR[g.rootCause]}>{g.rootCause}</Tag>
                    共{g.count}例 · 累计复发{g.totalRecurrence}次
                  </span>
                }
                style={{ marginTop: 16 }}
                extra={<Tag color="green">防再发：{g.preventionPlan}</Tag>}
              >
                <List
                  dataSource={g.items}
                  renderItem={(it) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`${it.patientCase} · ${it.description}`}
                        description={`复发次数=${it.recurrenceCnt}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </>
        )}
      </Content>
    </Layout>
  );
}
