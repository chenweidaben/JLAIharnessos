/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐明细前端页（M508-C，V14，EMR 深化四模块，-detail 避让）
 *
 * 深海蓝VI：AI 相似病历推荐（诊断输入+推荐列表+相似度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";
import { Input } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SimilarItem {
  title: string;
  similarity: number;
}

interface SimilarResult {
  records: SimilarItem[];
}

interface SimilarReport {
  count: number;
  avgSimilarity: number;
}

export default function EmrQcAiSimilarRecordDetailPage() {
  const [diagnosis, setDiagnosis] = useState("急性阑尾炎");
  const [result, setResult] = useState<SimilarResult | null>(null);
  const [report, setReport] = useState<SimilarReport | null>(null);
  const [loading, setLoading] = useState(false);

  const doRecommend = async () => {
    if (!diagnosis.trim()) {
      message.warning("请输入诊断");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-ai-similar-record-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("推荐完成");
      } else {
        message.error("推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>AI 相似病历推荐</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入诊断">
          <Input
            placeholder="输入诊断，如：急性阑尾炎、肺炎、骨折..."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            style={{ marginBottom: 16, maxWidth: 480 }}
          />
          <br />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRecommend}>
            推荐相似病历
          </Button>
        </Card>
        {result && report && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title={`推荐结果（共 ${report.count} 条）`}>
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
              <Statistic title="推荐数量" value={report.count} />
              <Statistic title="平均相似度" value={report.avgSimilarity} suffix="%" valueStyle={{ color: VI.accent }} />
            </div>
            <List
              dataSource={result.records}
              renderItem={(item) => (
                <List.Item>
                  <Text strong style={{ width: 360, color: VI.deep }}>{item.title}</Text>
                  <Tag color={item.similarity >= 90 ? "green" : item.similarity >= 80 ? "blue" : "default"} style={{ width: 80 }}>
                    {item.similarity}%
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
