/**
 * 健澜科技 jlmedaios - 病历书写时限管控前端页（M527-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历书写时限管控（病历类型/时限小时/已用小时/是否按时/超时小时）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, InputNumber, Layout, Select, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface WritingTimeLimit {
  recordType: string;
  deadlineHours: number;
}

interface TimeLimitResult {
  onTime: boolean;
  overdueHours: number;
}

interface TimeLimitReport {
  onTime: boolean;
  overdueHours: number;
}

const RECORD_TYPES = ["入院记录", "首次病程记录", "手术记录", "出院小结"];

export default function EmrWritingTimeLimitPage() {
  const [limit, setLimit] = useState<WritingTimeLimit | null>(null);
  const [recordType, setRecordType] = useState("入院记录");
  const [elapsedHours, setElapsedHours] = useState(18);
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [result, setResult] = useState<TimeLimitResult | null>(null);
  const [report, setReport] = useState<TimeLimitReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLimit = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-writing-time-limit", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLimit(data?.data ?? null);
        }
      } catch {
        message.error("加载时限管控基础数据失败");
      }
    };
    void fetchLimit();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-writing-time-limit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordType, elapsedHours, deadlineHours }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("时限检查完成");
      } else {
        message.error("时限检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历书写时限管控</Title>
        {limit && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历类型：</Text><Text style={{ marginRight: 24 }}>{limit.recordType}</Text>
              <Text strong>时限：</Text><Text>{limit.deadlineHours} 小时</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="时限检查">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <Text strong>病历类型：</Text>
              <Select
                value={recordType}
                onChange={setRecordType}
                options={RECORD_TYPES.map((t) => ({ value: t, label: t }))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>已用小时：</Text>
              <InputNumber value={elapsedHours} onChange={(v) => setElapsedHours(Number(v ?? 0))} min={0} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>时限小时：</Text>
              <InputNumber value={deadlineHours} onChange={(v) => setDeadlineHours(Number(v ?? 0))} min={0} style={{ marginLeft: 8 }} />
            </div>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
              开始检查
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否按时：</Text>
                <Tag color={report.onTime ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.onTime ? "按时" : "超时"}
                </Tag>
              </div>
              <Statistic title="超时小时" value={report.overdueHours} suffix="小时" />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
