/**
 * 健澜科技 jlmedaios - 病历质控知识库前端页（M475-D，M475 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：搜索框 + 知识条目列表（分类徽章+标题+内容预览）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography, Input } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
}

const categoryColor: Record<string, string> = {
  "书写规范": "blue",
  "缺陷类型": "red",
  "整改措施": "orange",
  "评分标准": "green",
  "法律法规": "purple",
};

export default function EmrQcKnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const url = keyword
          ? `/api/v1/emr-qc-knowledge?keyword=${encodeURIComponent(keyword)}`
          : "/api/v1/emr-qc-knowledge";
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setEntries(data?.entries ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [keyword]);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控知识库</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索知识标题，如：书写"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 400 }}
            allowClear
          />
        </Card>
        <Card title="知识条目列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <List
              dataSource={entries}
              renderItem={(item: KnowledgeEntry) => (
                <List.Item>
                  <Tag color={categoryColor[item.category] ?? "default"}>{item.category}</Tag>
                  <Text strong style={{ marginLeft: 12 }}>{item.title}</Text>
                  <Text type="secondary" style={{ marginLeft: 12 }}>{item.content}</Text>
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
