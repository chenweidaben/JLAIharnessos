/**
 * 健澜科技 jlmedaios - 质控缺陷案例库前端页（M520-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控缺陷案例库（分类/案例总数/搜索关键词/匹配列表/匹配数/首个案例）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DefectCaseLibrary {
  category: string;
  totalCases: number;
}

interface DefectCaseMatch {
  id: string;
  title: string;
}

interface SearchResult {
  matched: DefectCaseMatch[];
  count: number;
}

interface LibraryReport {
  count: number;
  firstCase: string;
}

const DEFAULT_CASES = [
  { id: "C001", title: "病程记录不及时", category: "时限类" },
  { id: "C002", title: "手术记录缺失", category: "完整性类" },
  { id: "C003", title: "出院小结不完整", category: "完整性类" },
];

export default function EmrQcDefectCaseLibraryPage() {
  const [library, setLibrary] = useState<DefectCaseLibrary | null>(null);
  const [query, setQuery] = useState("病程");
  const [cases] = useState(DEFAULT_CASES);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [report, setReport] = useState<LibraryReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-defect-case-library", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLibrary(data?.data ?? null);
        }
      } catch {
        message.error("加载案例库基础数据失败");
      }
    };
    void fetchLibrary();
  }, []);

  const doSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-defect-case-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ query, cases }),
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
        <Title level={3} style={{ color: VI.deep }}>质控缺陷案例库</Title>
        {library && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="案例库基础数据">
            <div>
              <Text strong>分类：</Text>
              <Tag color={VI.accent} style={{ marginRight: 24 }}>{library.category}</Tag>
              <Text strong>案例总数：</Text><Text>{library.totalCases}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="案例列表">
          <List
            dataSource={cases}
            renderItem={(item) => (
              <List.Item>
                <Text>{item.id}</Text>
                <Text style={{ marginLeft: 16 }}>{item.title}</Text>
                <Tag color="blue" style={{ marginLeft: 16 }}>{item.category}</Tag>
              </List.Item>
            )}
          />
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="搜索">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 400 }} placeholder="输入搜索关键词" />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doSearch}>
            搜索案例
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="搜索结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>匹配数：</Text><Text style={{ marginLeft: 8 }}>{report.count}</Text>
              <Text strong style={{ marginLeft: 24 }}>首个案例：</Text>
              <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.firstCase}</Tag>
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
