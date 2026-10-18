/**
 * 健澜科技 jlmedaios - 质控在线考试前端页（M503-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：在线考试表单（姓名/成绩）+ 考试报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Form, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExamReport {
  total: number;
  avgScore: number;
  passRate: number;
}

export default function EmrQcOnlineExamPage() {
  const [user, setUser] = useState("");
  const [score, setScore] = useState<number>(80);
  const [grade, setGrade] = useState<string>("");
  const [report, setReport] = useState<ExamReport | null>(null);
  const [loading, setLoading] = useState(false);

  const submitExam = async () => {
    if (!user.trim()) {
      message.warning("请输入姓名");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-online-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ user, score }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setGrade(data?.data?.grade ?? "");
        setReport(data?.data?.report ?? null);
        message.success(`提交成功，等级：${data?.data?.grade ?? ""}`);
        setUser("");
      } else {
        message.error("提交失败");
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
        <Title level={3} style={{ color: VI.deep }}>在线考试</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="考试提交">
          <Form layout="inline">
            <Form.Item label="姓名">
              <Input placeholder="姓名" value={user} onChange={(e) => setUser(e.target.value)} />
            </Form.Item>
            <Form.Item label="成绩">
              <Input
                type="number"
                placeholder="成绩（0-100）"
                value={score}
                onChange={(e) => setScore(Number(e.target.value) || 0)}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={submitExam}>
                提交考试
              </Button>
            </Form.Item>
          </Form>
          {grade && (
            <Text style={{ marginTop: 16, display: "block" }}>
              当前等级：
              <Tag color={grade === "优秀" ? "green" : grade === "良好" ? "blue" : grade === "及格" ? "orange" : "red"}>
                {grade}
              </Tag>
            </Text>
          )}
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="考试报告">
            <Statistic
              title="总人数"
              value={report.total}
              suffix="人"
              style={{ display: "inline-block", marginRight: 48 }}
            />
            <Statistic
              title="平均分"
              value={report.avgScore}
              precision={1}
              suffix="分"
              style={{ display: "inline-block", marginRight: 48 }}
            />
            <Statistic
              title="通过率"
              value={report.passRate}
              suffix="%"
              valueStyle={{ color: report.passRate >= 80 ? "#52c41a" : "#faad14" }}
              style={{ display: "inline-block" }}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
