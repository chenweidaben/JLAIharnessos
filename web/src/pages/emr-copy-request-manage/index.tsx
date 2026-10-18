/**
 * 健澜科技 jlmedaios - 病历复印申请管理前端页（M534-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历复印申请管理（病历ID/申请人/申请ID/页数/用途/是否处理/费用）。
 * 命名空间与旧 emrCopyRequestV14 区分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CopyRequestManage {
  recordId: string;
  applicant: string;
}

interface ProcessResult {
  processed: boolean;
  fee: number;
}

interface ProcessReport {
  processed: boolean;
  fee: number;
}

export default function EmrCopyRequestManagePage() {
  const [req, setReq] = useState<CopyRequestManage | null>(null);
  const [requestId, setRequestId] = useState("COPY001");
  const [pages, setPages] = useState(10);
  const [purpose, setPurpose] = useState("医保报销");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [report, setReport] = useState<ProcessReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReq = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-copy-request-manage", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReq(data?.data ?? null);
        }
      } catch {
        message.error("加载复印申请基础数据失败");
      }
    };
    void fetchReq();
  }, []);

  const doProcess = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-copy-request-manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ requestId, pages, purpose }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("处理完成");
      } else {
        message.error("处理失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历复印申请管理</Title>
        {req && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{req.recordId}</Text>
              <Text strong>申请人：</Text><Text>{req.applicant}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="处理输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>申请ID：</Text>
              <Input value={requestId} onChange={(e) => setRequestId(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>页数：</Text>
              <Input
                type="number"
                value={pages}
                onChange={(e) => setPages(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>用途：</Text>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doProcess}>
            处理申请
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="处理结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否处理：</Text>
                <Tag color={report.processed ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.processed ? "已处理" : "未处理"}
                </Tag>
              </div>
              <Statistic title="费用(元)" value={report.fee} precision={1} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
