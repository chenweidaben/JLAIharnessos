/**
 * 健澜科技 jlmedaios - 病历 NLP 术语标准化前端页（M531-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历NLP术语标准化（术语域/数据源/原始术语/别名映射/标准术语/是否缩写）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpTermStandardize {
  termDomain: string;
  source: string;
}

interface NlpResult {
  standardTerm: string;
  isAbbreviated: boolean;
}

interface NlpReport {
  standardTerm: string;
  isAbbreviated: boolean;
}

const DEFAULT_ALIASES: Record<string, string> = {
  APC: "阿司匹林",
  BTC: "维生素C",
  ACEI: "血管紧张素转换酶抑制剂",
};

export default function EmrNlpTermStandardizePage() {
  const [nlp, setNlp] = useState<NlpTermStandardize | null>(null);
  const [rawTerm, setRawTerm] = useState("APC");
  const [result, setResult] = useState<NlpResult | null>(null);
  const [report, setReport] = useState<NlpReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNlp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-nlp-term-standardize", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNlp(data?.data ?? null);
        }
      } catch {
        message.error("加载术语标准化基础数据失败");
      }
    };
    void fetchNlp();
  }, []);

  const doStandardize = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-term-standardize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ rawTerm, aliases: DEFAULT_ALIASES }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("标准化完成");
      } else {
        message.error("标准化失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历NLP术语标准化</Title>
        {nlp && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>术语域：</Text><Text style={{ marginRight: 24 }}>{nlp.termDomain}</Text>
              <Text strong>数据源：</Text><Text>{nlp.source}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>原始术语：</Text>
            <Input
              value={rawTerm}
              onChange={(e) => setRawTerm(e.target.value)}
              style={{ width: 240, marginLeft: 8 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>别名映射：</Text>
            <pre style={{ background: VI.bg, padding: 8, marginTop: 8, fontSize: 12 }}>
              {JSON.stringify(DEFAULT_ALIASES, null, 2)}
            </pre>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doStandardize}>
            执行标准化
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="标准化结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>标准术语：</Text>
                <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.standardTerm}</Tag>
              </div>
              <div>
                <Text strong>是否缩写：</Text>
                <Tag color={report.isAbbreviated ? "orange" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isAbbreviated ? "缩写转全称" : "无缩写"}
                </Tag>
              </div>
              <Statistic title="缩写状态" value={report.isAbbreviated ? "是" : "否"} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
