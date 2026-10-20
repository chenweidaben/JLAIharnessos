/**
 * 健澜科技 jlmedaios - 病历质控培训考核前端页（M467-D，V14，EMR 深化四模块，M467 收官）
 *
 * 深海蓝VI：课程卡片列表+考核答题界面（单选按钮+提交）+ 成绩反馈。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, message, Radio, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface ExamResult {
  score: number;
  correctCount: number;
  pass: boolean;
}

export default function EmrTrainingPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ExamResult | null>(null);

  const questions: Question[] = [
    { id: "Q001", question: "主诉缺失属于哪类缺陷？", options: ["阻塞", "主要", "次要", "无"] },
    { id: "Q002", question: "入院记录应在多少小时内完成？", options: ["6h", "12h", "24h", "48h"] },
    { id: "Q003", question: "五级评审乙级病历合格率应达？", options: ["80%", "85%", "90%", "95%"] },
  ];

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const answerArray = questions.map((q) => answers[q.id] ?? -1);
      const resp = await fetch("/api/v1/emr-training/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ answers: answerArray }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        message.success("考核提交完成");
      } else {
        message.warning("提交失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("提交失败（后端 route 未就绪）");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控培训考核</Title>
        <Card title="课程列表" headStyle={{ background: VI.deep, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Tag color="blue">病历质控规范培训（3 题）</Tag>
        </Card>
        <Card title="答题区" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <List
            dataSource={questions}
            renderItem={(item: Question, idx: number) => (
              <List.Item>
                <Title level={5}>{idx + 1}. {item.question}</Title>
                <Radio.Group
                  onChange={(e) => setAnswers({ ...answers, [item.id]: e.target.value })}
                  value={answers[item.id]}
                >
                  {item.options.map((opt, i) => (
                    <Radio key={i} value={i} style={{ display: "block", marginBottom: 8 }}>
                      {opt}
                    </Radio>
                  ))}
                </Radio.Group>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent }} onClick={handleSubmit}>提交考核</Button>
        </Card>
        {result && (
          <Card title="考核结果" headStyle={{ background: result.pass ? "#52c41a" : "#ff4d4f", color: "#fff" }}>
            <Title level={4}>得分：{result.score}（{result.correctCount} 题正确）</Title>
            <Tag color={result.pass ? "green" : "red"}>{result.pass ? "及格" : "不及格"}</Tag>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
