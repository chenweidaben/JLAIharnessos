/**
 * 健澜科技 jlmedaios - 质控专家在线评审前端页（M502-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：专家在线评审表单（病历号/评分/评语）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Form, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrQcExpertOnlineReviewPage() {
  const [expert, setExpert] = useState("");
  const [recordId, setRecordId] = useState("");
  const [score, setScore] = useState<number>(80);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submitReview = async () => {
    if (!recordId.trim()) {
      message.warning("请输入病历号");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-expert-online-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ expert, recordId, score, comment }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const report = data?.data?.report;
        message.success(`提交成功，当前平均分 ${report?.avgScore ?? 0}`);
        setRecordId("");
        setComment("");
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
        <Title level={3} style={{ color: VI.deep }}>专家在线评审</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评审表单">
          <Form layout="vertical">
            <Form.Item label="专家姓名">
              <Input placeholder="专家姓名" value={expert} onChange={(e) => setExpert(e.target.value)} />
            </Form.Item>
            <Form.Item label="病历号">
              <Input placeholder="病历号" value={recordId} onChange={(e) => setRecordId(e.target.value)} />
            </Form.Item>
            <Form.Item label="评分">
              <Input
                type="number"
                placeholder="评分（0-100）"
                value={score}
                onChange={(e) => setScore(Number(e.target.value) || 0)}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前评分：
                <Tag color={score >= 90 ? "green" : score >= 80 ? "orange" : "red"}>{score} 分</Tag>
              </Text>
            </Form.Item>
            <Form.Item label="评语">
              <TextArea
                rows={4}
                placeholder="请输入评审评语"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={submitReview}>
                提交评审
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}
