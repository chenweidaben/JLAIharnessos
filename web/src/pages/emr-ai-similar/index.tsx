/**
 * 健澜科技 jlmedaios - AI 病历相似病历推荐前端页（M486-D，M486 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：当前病历输入 + 相似病历列表 Table（病历号/诊断/相似度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Statistic, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiSimilarCase {
  id: string;
  diagnosis: string;
  similarity: number;
}

interface AiSimilarResult {
  currentDiagnosis: string;
  similarCases: AiSimilarCase[];
}

interface AiSimilarReport {
  similarCount: number;
}

const columns = [
  { title: "病历号", dataIndex: "id", key: "id" },
  { title: "诊断", dataIndex: "diagnosis", key: "diagnosis" },
  { title: "相似度", dataIndex: "similarity", key: "similarity", render: (v: number) => `${v}%` },
];

export default function EmrAiSimilarPage() {
  const [diagnosis, setDiagnosis] = useState("糖尿病");
  const [result, setResult] = useState<AiSimilarResult | null>(null);
  const [report, setReport] = useState<AiSimilarReport | null>(null);

  const find = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          currentDiagnosis: diagnosis,
          allCases: [
            { id: "EMR001", diagnosis: "糖尿病" },
            { id: "EMR002", diagnosis: "糖尿病" },
            { id: "EMR003", diagnosis: "高血压" },
          ],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        setReport(data?.report ?? null);
        message.success("查找完成");
      }
    } catch {
      message.error("查找失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 相似病历推荐</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <Input placeholder="当前诊断" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ marginBottom: 16 }} />
          <Button type="primary" onClick={find} style={{ background: VI.accent }}>
            查找相似病历
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Statistic title="相似病历数" value={report.similarCount} />
          </Card>
        )}
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Table columns={columns} dataSource={result.similarCases} rowKey="id" pagination={false} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
