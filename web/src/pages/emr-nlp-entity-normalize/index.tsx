/**
 * 健澜科技 jlmedaios - 病历 NLP 实体归一化前端页（M531-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历NLP实体归一化（实体类型/数据源/原始实体/字典映射/归一化编码/是否匹配）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpEntityNormalize {
  entityType: string;
  source: string;
}

interface NlpResult {
  normalizedCode: string;
  matched: boolean;
}

interface NlpReport {
  matched: boolean;
  normalizedCode: string;
}

const DEFAULT_DICT: Record<string, string> = {
  冠心病: "I25.1",
  高血压: "I10",
  糖尿病: "E11.9",
};

export default function EmrNlpEntityNormalizePage() {
  const [nlp, setNlp] = useState<NlpEntityNormalize | null>(null);
  const [rawEntity, setRawEntity] = useState("冠心病");
  const [result, setResult] = useState<NlpResult | null>(null);
  const [report, setReport] = useState<NlpReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNlp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-nlp-entity-normalize", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNlp(data?.data ?? null);
        }
      } catch {
        message.error("加载实体归一化基础数据失败");
      }
    };
    void fetchNlp();
  }, []);

  const doNormalize = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-entity-normalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ rawEntity, dictionary: DEFAULT_DICT }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("归一化完成");
      } else {
        message.error("归一化失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历NLP实体归一化</Title>
        {nlp && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>实体类型：</Text><Text style={{ marginRight: 24 }}>{nlp.entityType}</Text>
              <Text strong>数据源：</Text><Text>{nlp.source}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>原始实体：</Text>
            <Input
              value={rawEntity}
              onChange={(e) => setRawEntity(e.target.value)}
              style={{ width: 240, marginLeft: 8 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>字典映射：</Text>
            <pre style={{ background: VI.bg, padding: 8, marginTop: 8, fontSize: 12 }}>
              {JSON.stringify(DEFAULT_DICT, null, 2)}
            </pre>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doNormalize}>
            执行归一化
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="归一化结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>归一化编码：</Text>
                <Tag color={report.matched ? "green" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.normalizedCode}
                </Tag>
              </div>
              <div>
                <Text strong>是否匹配：</Text>
                <Tag color={report.matched ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.matched ? "已匹配" : "未匹配"}
                </Tag>
              </div>
              <Statistic title="匹配状态" value={report.matched ? "命中" : "未命中"} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
