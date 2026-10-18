/**
 * 健澜科技 jlmedaios - 病历结构化字段查询前端页（M532-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历结构化字段查询（病历类型/科室/可用字段/请求字段/命中字段/缺失字段）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StructQuery {
  recordType: string;
  dept: string;
}

interface QueryResult {
  foundFields: string[];
  missingFields: string[];
}

interface QueryReport {
  foundCount: number;
  missingCount: number;
}

const DEFAULT_AVAILABLE = ["主诉", "现病史", "诊断", "用药", "手术记录"];
const DEFAULT_REQUESTED = ["主诉", "诊断", "费用结算"];

export default function EmrStructQueryPage() {
  const [query, setQuery] = useState<StructQuery | null>(null);
  const [requestedText, setRequestedText] = useState(DEFAULT_REQUESTED.join(","));
  const [result, setResult] = useState<QueryResult | null>(null);
  const [report, setReport] = useState<QueryReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuery = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-struct-query", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setQuery(data?.data ?? null);
        }
      } catch {
        message.error("加载字段查询基础数据失败");
      }
    };
    void fetchQuery();
  }, []);

  const doQuery = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-struct-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          recordType: "入院记录",
          availableFields: DEFAULT_AVAILABLE,
          requestedFields: requestedText.split(",").filter((s) => s !== ""),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("查询完成");
      } else {
        message.error("查询失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历结构化字段查询</Title>
        {query && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历类型：</Text><Text style={{ marginRight: 24 }}>{query.recordType}</Text>
              <Text strong>科室：</Text><Text>{query.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>可用字段：</Text>
            <pre style={{ background: VI.bg, padding: 8, marginTop: 8, fontSize: 12 }}>
              {DEFAULT_AVAILABLE.join("、")}
            </pre>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>请求字段（逗号分隔）：</Text>
            <Input
              value={requestedText}
              onChange={(e) => setRequestedText(e.target.value)}
              style={{ width: 400, marginLeft: 8 }}
            />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doQuery}>
            执行查询
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="查询结果">
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <Text strong>命中字段：</Text>
                <List
                  size="small"
                  dataSource={result.foundFields}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="green" style={{ marginBottom: 4 }}>{item}</Tag>
                    </List.Item>
                  )}
                />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <Text strong>缺失字段：</Text>
                <List
                  size="small"
                  dataSource={result.missingFields}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="red" style={{ marginBottom: 4 }}>{item}</Tag>
                    </List.Item>
                  )}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 32, marginTop: 16 }}>
              <Statistic title="命中考数" value={report.foundCount} />
              <Statistic title="缺失数" value={report.missingCount} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
