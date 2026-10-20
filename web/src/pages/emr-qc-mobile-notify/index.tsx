/**
 * 健澜科技 jlmedaios - 质控移动端通知前端页（M526-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控移动端通知（通知人/通知类型/接收人列表/通知内容/发送数/发送状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MobileNotify {
  notifier: string;
  notifyType: string;
}

interface NotifyResult {
  sentCount: number;
  status: string;
}

interface NotifyReport {
  sentCount: number;
  status: string;
}

const DEFAULT_RECIPIENTS = ["张医生", "李医生", "王医生"];
const DEFAULT_MESSAGE = "您有新的病历缺陷待处理";

export default function EmrQcMobileNotifyPage() {
  const [notify, setNotify] = useState<MobileNotify | null>(null);
  const [result, setResult] = useState<NotifyResult | null>(null);
  const [report, setReport] = useState<NotifyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNotify = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-mobile-notify", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNotify(data?.data ?? null);
        }
      } catch {
        message.error("加载移动端通知基础数据失败");
      }
    };
    void fetchNotify();
  }, []);

  const doNotify = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-mobile-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recipients: DEFAULT_RECIPIENTS, message: DEFAULT_MESSAGE }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("通知完成");
      } else {
        message.error("通知失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控移动端通知</Title>
        {notify && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="通知基础数据">
            <div>
              <Text strong>通知人：</Text><Text style={{ marginRight: 24 }}>{notify.notifier}</Text>
              <Text strong>通知类型：</Text><Tag color={VI.accent}>{notify.notifyType}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="通知内容">
          <div style={{ marginBottom: 12 }}>
            <Text strong>接收人列表：</Text>
            <div style={{ marginTop: 8 }}>
              {DEFAULT_RECIPIENTS.map((r) => (
                <Tag key={r} color="blue" style={{ marginBottom: 4 }}>{r}</Tag>
              ))}
            </div>
          </div>
          <div>
            <Text strong>通知内容：</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>{DEFAULT_MESSAGE}</Text>
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doNotify}>
            移动端发送通知
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="通知结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="发送数" value={report.sentCount} />
              <div>
                <Text strong>发送状态：</Text>
                <Tag
                  color={report.status === "已发送" ? "green" : "default"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.status}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
