/**
 * 健澜科技 jlmedaios - 质控制度查询前端页（M505-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：制度搜索框+结果列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PolicyItem {
  title: string;
  content: string;
}

export default function EmrQcPolicyQueryPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<PolicyItem[]>([]);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const url = keyword
        ? `/api/v1/emr-qc-policy-query?keyword=${encodeURIComponent(keyword)}`
        : "/api/v1/emr-qc-policy-query";
      const resp = await fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setResults(data?.data?.report?.results ?? []);
        setSearched(true);
      } else {
        message.error("查询失败");
      }
    } catch {
      message.error("网络错误");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>制度查询</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="搜索制度">
          <Input.Search
            placeholder="输入关键词（标题或内容）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={doSearch}
            enterButton={
              <Button type="primary" style={{ background: VI.accent }}>搜索</Button>
            }
            size="large"
          />
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={searched ? `搜索结果（共 ${results.length} 条）` : "请输入关键词搜索"}>
          <List
            dataSource={results}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 200, color: VI.deep }}>{item.title}</Text>
                <Text type="secondary">{item.content}</Text>
              </List.Item>
            )}
            locale={{ emptyText: searched ? "未找到匹配制度" : "请输入关键词搜索" }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
