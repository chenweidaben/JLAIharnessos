/**
 * 健澜科技 jlmedaios - 质控整改验证前端页（M496-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：整改验证结果列表（问题/验证结果 Tag 绿通过/红不通过）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Select, Statistic, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface VerifyRecord {
  issue: string;
  result: string;
}

interface VerifyReport {
  verified: number;
  total: number;
  passRate: number;
}

export default function EmrQcRectifyVerifyPage() {
  const [records, setRecords] = useState<VerifyRecord[]>([
    { issue: "缺主诉", result: "通过" },
    { issue: "超时限", result: "不通过" },
    { issue: "用词不规范", result: "通过" },
  ]);
  const [newIssue, setNewIssue] = useState("");
  const [newResult, setNewResult] = useState("通过");
  const [report, setReport] = useState<VerifyReport | null>(null);

  const submit = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rectify-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ issue: newIssue, result: newResult }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setRecords((prev) => [...prev, data?.data?.record ?? { issue: newIssue, result: newResult }]);
        setReport(data?.data?.report ?? null);
        message.success("验证提交完成");
        setNewIssue("");
      }
    } catch {
      message.error("验证提交失败");
    }
  };

  const columns = [
    { title: "问题", dataIndex: "issue", key: "issue" },
    {
      title: "验证结果",
      dataIndex: "result",
      key: "result",
      render: (result: string) => (
        <Tag color={result === "通过" ? "green" : "red"}>{result}</Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控整改验证</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 300 }}
            placeholder="输入整改问题"
            value={newIssue}
            onChange={(e) => setNewIssue(e.target.value)}
          />
          <Select
            value={newResult}
            style={{ width: 120, marginLeft: 8 }}
            onChange={(v) => setNewResult(v)}
            options={[
              { value: "通过", label: "通过" },
              { value: "不通过", label: "不通过" },
            ]}
          />
          <Button type="primary" onClick={submit} style={{ background: VI.accent, marginLeft: 16 }}>
            提交验证
          </Button>
        </Card>
        {report && (
          <Card style={{ marginBottom: 16 }}>
            <Statistic title="已验证通过" value={report.verified} style={{ display: "inline-block", marginRight: 32 }} />
            <Statistic title="总验证数" value={report.total} style={{ display: "inline-block", marginRight: 32 }} />
            <Statistic title="通过率" value={report.passRate} suffix="%" style={{ display: "inline-block" }} />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="整改验证结果列表">
          <Table columns={columns} dataSource={records} rowKey="issue" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
