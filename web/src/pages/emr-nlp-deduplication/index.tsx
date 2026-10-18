/**
 * 健澜科技 jlmedaios - NLP 病历去重前端页（M491-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历列表 Table + 去重结果（总数/去重后/重复数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MedicalRecord {
  id: string;
  content: string;
}

interface NlpDedupResult {
  uniqueRecords: MedicalRecord[];
}

interface NlpDedupReport {
  totalCount: number;
  uniqueCount: number;
  duplicateCount: number;
}

const sampleRecords: MedicalRecord[] = [
  { id: "R001", content: "感冒" },
  { id: "R002", content: "感冒" },
  { id: "R003", content: "发烧" },
  { id: "R004", content: "咳嗽" },
  { id: "R005", content: "发烧" },
];

const columns = [
  { title: "病历ID", dataIndex: "id", key: "id" },
  { title: "内容", dataIndex: "content", key: "content" },
];

export default function EmrNlpDeduplicationPage() {
  const [result, setResult] = useState<NlpDedupResult | null>(null);
  const [report, setReport] = useState<NlpDedupReport | null>(null);

  const deduplicate = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-deduplication", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ records: sampleRecords }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("去重完成");
      }
    } catch {
      message.error("去重失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历去重</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="原始病历列表">
          <Table columns={columns} dataSource={sampleRecords} rowKey="id" pagination={false} />
          <Button type="primary" onClick={deduplicate} style={{ background: VI.accent, marginTop: 16 }}>
            去重
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>去重结果：</Text>
            <Text style={{ marginLeft: 24 }}>总数：{report.totalCount}</Text>
            <Text style={{ marginLeft: 24 }}>去重后：<Tag color="green">{report.uniqueCount}</Tag></Text>
            <Text style={{ marginLeft: 24 }}>重复：<Tag color="red">{report.duplicateCount}</Tag></Text>
          </Card>
        )}
        {result && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="去重后病历" style={{ marginTop: 16 }}>
            <Table columns={columns} dataSource={result.uniqueRecords} rowKey="id" pagination={false} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
