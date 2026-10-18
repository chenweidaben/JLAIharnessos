/**
 * 健澜科技 jlmedaios - 门诊病历模板库前端页（M523-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：门诊病历模板库（分类/模板总数/搜索词/匹配列表/匹配数/首个模板）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface OutpatientLibrary {
  category: string;
  totalTemplates: number;
}

interface SearchResult {
  matched: { id: string; name: string }[];
  count: number;
}

interface LibraryReport {
  count: number;
  firstTemplate: string;
}

const DEFAULT_TEMPLATES = [
  { id: "T001", name: "上呼吸道感染模板", dept: "呼吸科" },
  { id: "T002", name: "高血压门诊模板", dept: "心内科" },
];

export default function EmrTemplateOutpatientLibraryPage() {
  const [library, setLibrary] = useState<OutpatientLibrary | null>(null);
  const [query, setQuery] = useState("感染");
  const [templates] = useState(DEFAULT_TEMPLATES);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [report, setReport] = useState<LibraryReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-outpatient-library", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLibrary(data?.data ?? null);
        }
      } catch {
        message.error("加载模板库基础数据失败");
      }
    };
    void fetchLibrary();
  }, []);

  const doSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-outpatient-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ query, templates }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("搜索完成");
      } else {
        message.error("搜索失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>门诊病历模板库</Title>
        {library && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="模板库基础数据">
            <div>
              <Text strong>分类：</Text><Text style={{ marginRight: 24 }}>{library.category}</Text>
              <Text strong>模板总数：</Text><Text>{library.totalTemplates}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="模板列表">
          <List
            dataSource={templates}
            renderItem={(item) => (
              <List.Item>
                <Tag color="blue">{item.id}</Tag>
                <Text style={{ marginLeft: 8 }}>{item.name}</Text>
                <Tag color="default" style={{ marginLeft: 16 }}>{item.dept}</Tag>
              </List.Item>
            )}
          />
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="搜索输入">
          <Input placeholder="输入搜索词" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doSearch}>
            搜索模板
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="搜索结果">
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
              <Statistic title="匹配数" value={report.count} />
              <div>
                <Text strong>首个模板：</Text>
                <Tag color="green" style={{ marginLeft: 8 }}>{report.firstTemplate}</Tag>
              </div>
            </div>
            <List
              dataSource={result.matched}
              renderItem={(item) => (
                <List.Item>
                  <Tag color="green">{item.id}</Tag>
                  <Text style={{ marginLeft: 8 }}>{item.name}</Text>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
