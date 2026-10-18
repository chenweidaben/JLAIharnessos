/**
 * 健澜科技 jlmedaios - 模板医生个人偏好前端页（M524-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：模板医生个人偏好（医生姓名/科室/常用模板列表/默认模板/常用模板数/默认提示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DoctorPref {
  doctorName: string;
  dept: string;
}

interface PrefResult {
  favoriteCount: number;
  hasDefault: boolean;
}

interface PrefReport {
  favoriteCount: number;
  defaultHint: string;
}

const DEFAULT_FREQUENT = ["入院记录模板", "出院小结模板"];
const DEFAULT_TEMPLATE = "入院记录模板";

export default function EmrTemplateDoctorPrefPage() {
  const [pref, setPref] = useState<DoctorPref | null>(null);
  const [result, setResult] = useState<PrefResult | null>(null);
  const [report, setReport] = useState<PrefReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPref = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-doctor-pref", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPref(data?.data ?? null);
        }
      } catch {
        message.error("加载医生偏好基础数据失败");
      }
    };
    void fetchPref();
  }, []);

  const doGetPref = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-doctor-pref", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ doctorName: "张医生", frequentTemplates: DEFAULT_FREQUENT, defaultTemplate: DEFAULT_TEMPLATE }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("获取偏好完成");
      } else {
        message.error("获取偏好失败");
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
        <Title level={3} style={{ color: VI.deep }}>模板医生个人偏好</Title>
        {pref && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="医生偏好基础数据">
            <div>
              <Text strong>医生姓名：</Text><Text style={{ marginRight: 24 }}>{pref.doctorName}</Text>
              <Text strong>科室：</Text><Text>{pref.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="偏好输入">
          <div style={{ marginBottom: 12 }}>
            <Text strong>常用模板列表：</Text>
            <div style={{ marginTop: 8 }}>
              {DEFAULT_FREQUENT.map((t) => (
                <Tag key={t} color="blue" style={{ marginBottom: 4 }}>{t}</Tag>
              ))}
            </div>
          </div>
          <div>
            <Text strong>默认模板：</Text>
            <Tag color={VI.accent} style={{ marginLeft: 8 }}>{DEFAULT_TEMPLATE}</Tag>
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doGetPref}>
            获取医生偏好
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="偏好结果">
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
              <Statistic title="常用模板数" value={report.favoriteCount} />
              <div>
                <Text strong>默认提示：</Text>
                <Tag
                  color={result.hasDefault ? "green" : "orange"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.defaultHint}
                </Tag>
              </div>
            </div>
            <Text strong>常用模板列表：</Text>
            <List
              size="small"
              dataSource={DEFAULT_FREQUENT}
              renderItem={(item) => (
                <List.Item>
                  <Tag color={VI.accent}>{item}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
