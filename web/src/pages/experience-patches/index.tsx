/**
 * 健澜科技 jlmedaios - 修改点归因与经验补丁 V13 页（M301-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Patch {
  patchId: string;
  experienceId: string;
  clause: "dose" | "timing" | "contraindication" | "unknown";
  suggestion: string;
}

const clauseColor: Record<string, string> = {
  dose: "orange",
  timing: "blue",
  contraindication: "red",
  unknown: "default",
};

export default function ExperiencePatchesPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Patch[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Patch[]>("/api/v1/experience-patches?experienceId=e-1");
        if (!cancelled) setList(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>经验补丁建议</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="基于医生修改点自动归因">
            <List
              dataSource={list}
              renderItem={(it) => (
                <List.Item
                  actions={[<Button key="apply" type="primary">应用补丁</Button>]}
                >
                  <List.Item.Meta
                    title={it.suggestion}
                    description={`经验 ${it.experienceId}`}
                  />
                  <Tag color={clauseColor[it.clause]}>{it.clause}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
