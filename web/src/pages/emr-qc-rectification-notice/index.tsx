/**
 * 健澜科技 jlmedaios - 质控整改通知单自动生成前端页（M518-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控整改通知单自动生成（单号/科室/问题描述/缺陷统计/整改期限/优先级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RectificationNotice {
  noticeId: string;
  dept: string;
  issue: string;
}

interface RectificationResult {
  defectCount: number;
  score: number;
  deadlineDays: number;
}

interface RectificationSummary {
  priority: string;
}

export default function EmrQcRectificationNoticePage() {
  const [notice, setNotice] = useState<RectificationNotice | null>(null);
  const [noticeId, setNoticeId] = useState("GZ20261019001");
  const [dept, setDept] = useState("普外科");
  const [issue, setIssue] = useState("病程记录不及时");
  const [block, setBlock] = useState(2);
  const [major, setMajor] = useState(4);
  const [minor, setMinor] = useState(6);
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [result, setResult] = useState<RectificationResult | null>(null);
  const [summary, setSummary] = useState<RectificationSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-rectification-notice", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNotice(data?.data ?? null);
        }
      } catch {
        message.error("加载通知单基础数据失败");
      }
    };
    void fetchNotice();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rectification-notice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          noticeId,
          dept,
          issue,
          defects: { block, major, minor },
          deadlineDays,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setSummary(data?.data?.summary ?? null);
        message.success("通知单生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控整改通知单自动生成</Title>
        {notice && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="通知单基础数据">
            <div>
              <Text strong>单号：</Text><Text style={{ marginRight: 24 }}>{notice.noticeId}</Text>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{notice.dept}</Text>
              <Text strong>问题描述：</Text><Text>{notice.issue}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计输入">
          <Row gutter={16}>
            <Col span={6}>
              <Text>单号</Text>
              <Input value={noticeId} onChange={(e) => setNoticeId(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={4}>
              <Text>科室</Text>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <Text>问题描述</Text>
              <Input value={issue} onChange={(e) => setIssue(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={2}>
              <Text>阻断</Text>
              <InputNumber value={block} onChange={(v) => setBlock(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={2}>
              <Text>major</Text>
              <InputNumber value={major} onChange={(v) => setMajor(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={2}>
              <Text>minor</Text>
              <InputNumber value={minor} onChange={(v) => setMinor(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Text>整改期限（天）</Text>
              <InputNumber value={deadlineDays} onChange={(v) => setDeadlineDays(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doGenerate}>
            生成通知单
          </Button>
        </Card>
        {result && summary && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="通知单结果">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="总缺陷数" value={result.defectCount} />
              </Col>
              <Col span={6}>
                <Statistic title="评分" value={result.score} suffix="/ 100" />
              </Col>
              <Col span={6}>
                <Statistic title="整改期限（天）" value={result.deadlineDays} />
              </Col>
              <Col span={6}>
                <Text strong>优先级：</Text>
                <Tag
                  color={summary.priority === "紧急" ? "red" : summary.priority === "重要" ? "orange" : "blue"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {summary.priority}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
