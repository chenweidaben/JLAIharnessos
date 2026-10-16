/**
 * 健澜科技 jlmedaios - 教学培训 V4 页（M254-C）
 *
 * 基地专业基地学员师资考核结业培训质量/博士点硕士点导师招生培养学位导学关系/I/II类学分继教项目培训班线上通过率学分核查/专培转岗全科助理全科专科医师亚专业/新员工新护士新医生新技师考核规范化导师制/带教师资教学能力教学方法教学比赛导师培训/教学查房病例讨论小讲课OSCE学生评教同行评教/制度档案评估教学医院临床学院教学绩效。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  residency: { base: number; specialty: number; trainee: number; faculty: number; exam: number; graduation: number };
  graduate: { phd: number; md: number; supervisor: number; admission: number; thesis: number };
  cme: { typeI: number; typeII: number; course: number; online: number; passRate: number; verification: number };
  postGrad: { specialty: number; transfer: number; general: number; assistant: number; subspecialty: number };
  onboarding: { newStaff: number; newNurse: number; newDoctor: number; newTech: number; exam: number; mentor: number };
  faculty: { development: number; method: number; competition: number; mentorTraining: number };
  quality: { rounds: number; caseDiscussion: number; lecture: number; osce: number; studentEval: number; peerEval: number };
  management: { policy: number; archive: number; assessment: number; teachingHospital: number; medicalSchool: number; kpi: number };
  suggestions: string[];
}

export default function TeachingTrainingV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/teaching-training-v4/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>教学培训 V4</Title>
        <Paragraph type="secondary">基地·专业基地·学员·师资·考核·结业 / 博士点·硕士点·导师·招生·培养·学位 / I/II 类学分·继教项目·线上·通过率 / 专培·转岗·全科·助理全科·亚专业 / 新员工·新护士·新医生·新技师·导师制 / 带教师资·教学能力·教学方法·比赛 / 教学查房·病例讨论·小讲课·OSCE·评教 / 制度·档案·评估·教学医院·临床学院</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="住培学员" value={data.residency.trainee} /></Card></Col>
              <Col span={6}><Card><Statistic title="研究生" value={data.graduate.md} /></Card></Col>
              <Col span={6}><Card><Statistic title="CME 通过率" value={`${data.cme.passRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="教学查房" value={data.quality.rounds} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>教学明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "graduation", name: "结业", value: data.residency.graduation },
                  { key: "phd", name: "博士", value: data.graduate.phd },
                  { key: "newStaff", name: "新员工", value: data.onboarding.newStaff },
                  { key: "studentEval", name: "学生评教", value: `${data.quality.studentEval}%` },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
