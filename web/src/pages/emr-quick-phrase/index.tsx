/**
 * 健澜科技 jlmedaios - 病历常见用语快捷输入前端页（M539-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历常见用语快捷输入（分类/医生ID/搜索词/用语列表/匹配数/首条用语）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QuickPhrase {
  category: string;
  doctorId: string;
}

interface PhraseItem {
  id: string;
  text: string;
}

interface SearchResult {
  matchedCount: number;
  firstPhrase: string;
}

interface SearchReport {
  matchedCount: number;
  firstPhrase: string;
}

export default function EmrQuickPhrasePage() {
  const [base, setBase] = useState<QuickPhrase | null>(null);
  const [query, setQuery] = useState("胸闷");
  const [phrases] = useState<PhraseItem[]>([
    { id: "P1", text: "胸闷3天" },
    { id: "P2", text: "胸痛1周" },
    { id: "P3", text: "胸闷伴气短" },
  ]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [report, setReport] = useState<SearchReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-quick-phrase", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载快捷用语基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-quick-phrase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ query, phrases }),
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
        <Title level={3} style={{ color: VI.deep }}>病历常见用语快捷输入</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>分类：</Text><Tag color="blue" style={{ marginRight: 16 }}>{base.category}</Tag>
              <Text strong>医生ID：</Text><Text>{base.doctorId}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="搜索输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>搜索词：</Text>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
          </div>
          <List
            size="small"
            dataSource={phrases}
            style={{ marginBottom: 16 }}
            renderItem={(item) => (
              <List.Item>
                <Tag color="default" style={{ marginRight: 8 }}>{item.id}</Tag>
                <Text>{item.text}</Text>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSearch}>
            执行搜索
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="搜索结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="匹配数" value={report.matchedCount} />
              <div>
                <Text strong>首条用语：</Text>
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 16 }}>{report.firstPhrase}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
