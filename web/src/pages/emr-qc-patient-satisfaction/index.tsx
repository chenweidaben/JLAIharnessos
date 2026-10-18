/**
 * 健澜科技 jlmedaios - 质控患者满意度调查前端页（M504-D，V14，EMR 深化四模块，M504 收官）
 *
 * 深海蓝VI：患者满意度调查表单+统计（份数/平均分/满意度%）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PatientSurvey {
  patient: string;
  score: number;
  comment: string;
}

interface Aggregate {
  total: number;
  avgScore: number;
  rate: number;
}

export default function EmrQcPatientSatisfactionPage() {
  const [surveys, setSurveys] = useState<PatientSurvey[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [patient, setPatient] = useState("");
  const [score, setScore] = useState<number>(90);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-patient-satisfaction", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setSurveys(data?.data?.surveys ?? []);
          setAggregate(data?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const submitSurvey = async () => {
    if (!patient.trim()) {
      message.warning("请输入患者姓名");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-patient-satisfaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ patient, score, comment }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSurveys(data?.data?.surveys ?? []);
        setAggregate(data?.data?.aggregate ?? null);
        setPatient("");
        setComment("");
        message.success("提交成功");
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
        <Title level={3} style={{ color: VI.deep }}>患者满意度调查</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="满意度统计">
            <Statistic
              title="总份数"
              value={aggregate.total}
              suffix="份"
              style={{ display: "inline-block", marginRight: 48 }}
            />
            <Statistic
              title="平均分"
              value={aggregate.avgScore}
              precision={1}
              suffix="分"
              style={{ display: "inline-block", marginRight: 48 }}
            />
            <Statistic
              title="满意度"
              value={aggregate.rate}
              suffix="%"
              valueStyle={{ color: aggregate.rate >= 80 ? "#52c41a" : "#faad14" }}
              style={{ display: "inline-block" }}
            />
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="提交调查">
          <Form layout="inline">
            <Form.Item label="患者姓名">
              <Input placeholder="患者姓名" value={patient} onChange={(e) => setPatient(e.target.value)} />
            </Form.Item>
            <Form.Item label="评分">
              <Input
                type="number"
                placeholder="评分（0-100）"
                value={score}
                onChange={(e) => setScore(Number(e.target.value) || 0)}
              />
            </Form.Item>
            <Form.Item label="评语">
              <TextArea rows={2} placeholder="评语" value={comment} onChange={(e) => setComment(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={submitSurvey}>
                提交
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="调查记录">
          <List
            dataSource={surveys}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 100 }}>{item.patient}</Text>
                <Tag color={item.score >= 90 ? "green" : "default"} style={{ width: 60 }}>{item.score}</Tag>
                <Text type="secondary">{item.comment}</Text>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
