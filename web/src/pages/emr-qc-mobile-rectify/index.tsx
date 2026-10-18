/**
 * 健澜科技 jlmedaios - 质控移动端整改前端页（M526-D，V14，EMR 深化四模块，M526 收官）
 *
 * 深海蓝VI：质控移动端整改（缺陷ID/整改人/整改内容/是否解决/整改分/整改等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MobileRectify {
  defectId: string;
  rectifier: string;
}

interface RectifyResult {
  resolved: boolean;
  rectifyScore: number;
}

interface RectifyReport {
  resolved: boolean;
  rectifyScore: number;
  grade: string;
}

export default function EmrQcMobileRectifyPage() {
  const [rectify, setRectify] = useState<MobileRectify | null>(null);
  const [rectifyContent, setRectifyContent] = useState("已补充病程记录");
  const [isResolved, setIsResolved] = useState(true);
  const [result, setResult] = useState<RectifyResult | null>(null);
  const [report, setReport] = useState<RectifyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRectify = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-mobile-rectify", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRectify(data?.data ?? null);
        }
      } catch {
        message.error("加载移动端整改基础数据失败");
      }
    };
    void fetchRectify();
  }, []);

  const doRectify = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-mobile-rectify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ defectId: "D025", rectifyContent, isResolved }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("整改完成");
      } else {
        message.error("整改失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控移动端整改</Title>
        {rectify && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="整改基础数据">
            <div>
              <Text strong>缺陷ID：</Text><Text style={{ marginRight: 24 }}>{rectify.defectId}</Text>
              <Text strong>整改人：</Text><Text>{rectify.rectifier}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="整改操作">
          <div style={{ marginBottom: 16 }}>
            <Text strong>整改内容：</Text>
            <TextArea
              value={rectifyContent}
              onChange={(e) => setRectifyContent(e.target.value)}
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Checkbox checked={isResolved} onChange={(e) => setIsResolved(e.target.checked)}>
              已解决
            </Checkbox>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRectify}>
            移动端提交整改
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="整改结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否解决：</Text>
                <Tag color={report.resolved ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.resolved ? "已解决" : "未解决"}
                </Tag>
              </div>
              <Statistic title="整改分" value={report.rectifyScore} />
              <div>
                <Text strong>整改等级：</Text>
                <Tag
                  color={report.grade === "整改优秀" ? "green" : report.grade === "整改合格" ? "blue" : "orange"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.grade}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
