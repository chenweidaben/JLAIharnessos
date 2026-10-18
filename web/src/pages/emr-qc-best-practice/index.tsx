/**
 * 健澜科技 jlmedaios - 质控最佳实践库前端页（M520-D，V14，EMR 深化四模块，M520 收官）
 *
 * 深海蓝VI：质控最佳实践库（分类/实践总数/搜索关键词/匹配列表/匹配数/首个实践）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BestPracticeLibrary {
  category: string;
  totalPractices: number;
}

interface BestPracticeMatch {
  id: string;
  title: string;
}

interface SearchResult {
  matched: BestPracticeMatch[];
  count: number;
}

interface PracticeReport {
  count: number;
  firstPractice: string;
}

const DEFAULT_PRACTICES = [
  { id: "P001", title: "智能质控系统实践", hospital: "浙一医院" },
  { id: "P002", title: "日间手术管理", hospital: "邵逸夫医院" },
  { id: "P003", title: "电子病历五级评审实践", hospital: "浙二医院" },
];

export default function EmrQcBestPracticePage() {
  const [library, setLibrary] = useState<BestPracticeLibrary | null>(null);
  const [query, setQuery] = useState("质控");
  const [practices] = useState(DEFAULT_PRACTICES);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [report, setReport] = useState<PracticeReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-best-practice", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLibrary(data?.data ?? null);
        }
      } catch {
        message.error("加载最佳实践库基础数据失败");
      }
    };
    void fetchLibrary();
  }, []);

  const doSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-best-practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ query, practices }),
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
        <Title level={3} style={{ color: VI.deep }}>质控最佳实践库</Title>
        {library && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="最佳实践库基础数据">
            <div>
              <Text strong>分类：</Text>
              <Tag color={VI.accent} style={{ marginRight: 24 }}>{library.category}</Tag>
              <Text strong>实践总数：</Text><Text>{library.totalPractices}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="实践列表">
          <List
            dataSource={practices}
            renderItem={(item) => (
              <List.Item>
                <Text>{item.id}</Text>
                <Text style={{ marginLeft: 16 }}>{item.title}</Text>
                <Tag color="blue" style={{ marginLeft: 16 }}>{item.hospital}</Tag>
              </List.Item>
            )}
          />
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="搜索">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 400 }} placeholder="输入搜索关键词" />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doSearch}>
            搜索实践
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="搜索结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>匹配数：</Text><Text style={{ marginLeft: 8 }}>{report.count}</Text>
              <Text strong style={{ marginLeft: 24 }}>首个实践：</Text>
              <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.firstPractice}</Tag>
            </div>
            {result.matched.length > 0 && (
              <List
                dataSource={result.matched}
                renderItem={(item) => (
                  <List.Item>
                    <Text>{item.id}</Text>
                    <Text style={{ marginLeft: 16 }}>{item.title}</Text>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
