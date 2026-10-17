/**
 * 健澜科技 jlmedaios - 经验更新与版本迭代 V13 页（M296-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Version {
  experienceId: string;
  version: number;
  title: string;
  content: string;
  authorId: string;
  archived: boolean;
}

export default function ExperienceVersionsPage() {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Version[]>("/api/v1/experience/e-1/versions");
        if (!cancelled) setVersions(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>经验版本历史</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title={`共 ${versions.length} 个版本`}>
            <List
              dataSource={versions}
              renderItem={(v) => (
                <List.Item
                  actions={[
                    v.archived
                      ? <Tag key="a" color="default">已归档</Tag>
                      : <Button key="n" size="small" type="primary">生成新版本</Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={`v${v.version} · ${v.title}`}
                    description={`${v.content}（作者 ${v.authorId}）`}
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
