/**
 * 健澜科技 jlmedaios - 病历书写规范知识库前端页（M469-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：搜索框+规范条目列表（required 标红星）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Input, Layout, List, Spin, Star, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StandardEntry {
  id: string;
  category: string;
  title: string;
  required: boolean;
}

export default function EmrWritingStandardPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<StandardEntry[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const url = keyword
          ? `/api/v1/emr-writing-standard?keyword=${encodeURIComponent(keyword)}`
          : "/api/v1/emr-writing-standard";
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
        <Title level={3} style={{ color: VI.deep }}>病历书写规范知识库</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索规范条目，如：主诉"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 400 }}
            allowClear
          />
        </Card>
        <Card title="规范条目列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <List
              dataSource={entries}
              renderItem={(item: StandardEntry) => (
                <List.Item>
                  <Tag color="blue">{item.category}</Tag>
                  {item.required && <Star style={{ color: "#faad14", marginLeft: 8 }} />}
                  <Text style={{ marginLeft: 8 }}>{item.title}</Text>
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
