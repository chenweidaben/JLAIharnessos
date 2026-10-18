/**
 * 健澜科技 jlmedaios - 质控法律法规前端页（M505-D，V14，EMR 深化四模块，M505 收官）
 *
 * 深海蓝VI：法律法规列表（法规名/层级/发布日期）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Regulation {
  title: string;
  level: string;
  publishDate: string;
}

const levelColor: Record<string, string> = {
  "法律": "red",
  "行政法规": "orange",
  "部门规章": "blue",
};

export default function EmrQcRegulationPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Regulation[]>([]);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const url = keyword
        ? `/api/v1/emr-qc-regulation?keyword=${encodeURIComponent(keyword)}`
        : "/api/v1/emr-qc-regulation";
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
        <Title level={3} style={{ color: VI.deep }}>法律法规</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="搜索法规">
          <Input.Search
            placeholder="输入关键词（法规名）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={doSearch}
            enterButton={
              <Button type="primary" style={{ background: VI.accent }}>搜索</Button>
            }
            size="large"
            allowClear
          />
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={searched ? `搜索结果（共 ${results.length} 条）` : "法规列表"}>
          <List
            dataSource={results}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 280, color: VI.deep }}>{item.title}</Text>
                <Tag color={levelColor[item.level] ?? "default"} style={{ width: 100 }}>{item.level}</Tag>
                <Text type="secondary">{item.publishDate}</Text>
              </List.Item>
            )}
            locale={{ emptyText: searched ? "未找到匹配法规" : "请输入关键词搜索" }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
