/**
 * 健澜科技 jlmedaios - 病历书写规范检查前端页（M485-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文输入框 + 违规项列表红色 + 得分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface WritingStandardResult {
  content: string;
  issues: string[];
}

interface WritingStandardReport {
  issueCount: number;
  score: number;
  issues: string[];
}

export default function EmrWritingStandardCheckPage() {
  const [content, setContent] = useState("");
  const [, setResult] = useState<WritingStandardResult | null>(null);
  const [report, setReport] = useState<WritingStandardReport | null>(null);

  const check = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-writing-standard-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        setReport(data?.report ?? null);
        message.success("检查完成");
      }
    } catch {
      message.error("检查失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历书写规范检查</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <TextArea
            rows={6}
            placeholder="请输入病历正文..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={check} style={{ background: VI.accent }}>
            检查
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Statistic title="得分" value={report.score} suffix="分" />
            <Statistic title="违规项数" value={report.issueCount} style={{ marginTop: 12 }} />
            {report.issues.length > 0 && (
              <List
                style={{ marginTop: 16 }}
                header={<Tag color="red">违规项</Tag>}
                dataSource={report.issues}
                renderItem={(issue) => <List.Item><Tag color="red">{issue}</Tag></List.Item>}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
