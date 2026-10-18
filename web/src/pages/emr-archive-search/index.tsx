/**
 * 健澜科技 jlmedaios - 病历归档检索前端页（M533-D，V14，EMR 深化四模块，M533 收官）
 *
 * 深海蓝VI：病历归档检索（科室/年份/搜索词/病历列表/匹配数/首条匹配）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveSearch {
  dept: string;
  year: number;
}

interface ArchiveRecord {
  id: string;
  patientName: string;
  dept: string;
}

interface SearchResult {
  matchedCount: number;
  firstMatch: string;
}

interface SearchReport {
  matchedCount: number;
  firstMatch: string;
}

const DEFAULT_RECORDS: ArchiveRecord[] = [
  { id: "R1", patientName: "张三", dept: "心内科" },
  { id: "R2", patientName: "李四", dept: "心内科" },
  { id: "R3", patientName: "张五", dept: "呼吸科" },
];

export default function EmrArchiveSearchPage() {
  const [search, setSearch] = useState<ArchiveSearch | null>(null);
  const [query, setQuery] = useState("张");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [report, setReport] = useState<SearchReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSearch = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-archive-search", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setSearch(data?.data ?? null);
        }
      } catch {
        message.error("加载归档检索基础数据失败");
      }
    };
    void fetchSearch();
  }, []);

  const doSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-archive-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ query, records: DEFAULT_RECORDS }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检索完成");
      } else {
        message.error("检索失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历归档检索</Title>
        {search && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{search.dept}</Text>
              <Text strong>年份：</Text><Text>{search.year}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检索输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>搜索词：</Text>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>病历列表：</Text>
            <List
              size="small"
              dataSource={DEFAULT_RECORDS}
              style={{ marginTop: 8 }}
              renderItem={(item) => (
                <List.Item>
                  <Text style={{ fontSize: 12 }}>
                    {item.id} - {item.patientName}（{item.dept}）
                  </Text>
                </List.Item>
              )}
            />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSearch}>
            执行检索
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检索结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="匹配数" value={report.matchedCount} />
              <div>
                <Text strong>首条匹配：</Text>
                <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.firstMatch}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
