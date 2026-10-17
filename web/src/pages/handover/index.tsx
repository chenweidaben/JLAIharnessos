/**
 * 健澜科技 jlmedaios - 继任者经验传承交接 V13 页（M297-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Package {
  packageId: string;
  fromDoctor: string;
  toDoctor: string;
  experienceCount: number;
  freshCount: number;
  staleCount: number;
  adaptationNote: string;
  status: "pending" | "accepted" | "rejected";
}

export default function HandoverPage() {
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState<Package[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Package[]>("/api/v1/handover?toDoctorId=li");
        if (!cancelled) setInbox(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>经验传承交接</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title={`待接收 ${inbox.length} 个交接包`}>
            <List
              dataSource={inbox}
              renderItem={(p) => (
                <List.Item
                  actions={[
                    <Button key="a" size="small" type="primary">接收</Button>,
                    <Button key="r" size="small" danger>拒绝</Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={`来自 ${p.fromDoctor}（${p.experienceCount} 条经验）`}
                    description={p.adaptationNote}
                  />
                  <Tag color="green">fresh {p.freshCount}</Tag>
                  <Tag color="orange" style={{ marginLeft: 8 }}>stale {p.staleCount}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
