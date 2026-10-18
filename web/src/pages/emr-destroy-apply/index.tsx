/**
 * 健澜科技 jlmedaios - 病历销毁登记（避让版）前端页（M541-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历销毁登记（病历ID/销毁日期/审批人/销毁原因/是否登记/销毁编号）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DestroyApply {
  recordId: string;
  destroyDate: string;
}

interface ApplyResult {
  registered: boolean;
  destroyNo: string;
}

interface ApplyReport {
  registered: boolean;
  destroyNo: string;
}

export default function EmrDestroyApplyPage() {
  const [base, setBase] = useState<DestroyApply | null>(null);
  const [recordId, setRecordId] = useState("REC802");
  const [approver, setApprover] = useState("医务处长");
  const [reason, setReason] = useState("超期保管");
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [report, setReport] = useState<ApplyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-destroy-apply", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载销毁登记基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRegister = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-destroy-apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId, approver, reason }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("登记完成");
      } else {
        message.error("登记失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历销毁登记</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>销毁日期：</Text><Tag color="orange">{base.destroyDate}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="登记输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>审批人：</Text>
              <Input value={approver} onChange={(e) => setApprover(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>销毁原因：</Text>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRegister}>
            执行登记
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="登记结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Text strong>是否登记：</Text>
              <Tag color={report.registered ? "green" : "red"} style={{ fontSize: 16 }}>
                {report.registered ? "已登记" : "未登记"}
              </Tag>
              <Text strong>销毁编号：</Text>
              <Tag color="blue" style={{ fontSize: 16 }}>{report.destroyNo}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
