/**
 * 健澜科技 jlmedaios - 移动护理床旁工作台（M16-A）
 * /m/bed/:visitId 分区：
 *  - 扫码核对给药（腕带+药品 → 五重核对 → 给药，高风险填双人核对）；
 *  - 体征采集（体温/脉搏/呼吸/血压/血氧/血糖）；
 *  - 护理任务（待办、执行、结果）；
 *  - 评估量表（Braden/Morse/Barthel/疼痛/营养，前端纯函数实时算分）；
 *  - 护理记录（快捷模板 + 语音录入入口，电子签名）。
 * 医疗安全：AI 仅辅助（只读标注），护士本人签名生效；给药五重核对不通过不执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  List,
} from 'antd';
import {
  ScanOutlined,
  HeartOutlined,
  CheckSquareOutlined,
  FormOutlined,
  EditOutlined,
} from '@ant-design/icons';

import { useMobileNursingStore } from '@/store/mobileNursingStore';
import { listNursingTasks } from '@/services/api/care';
import type { NursingTaskDto } from '@/types/care';
import type { ScanResult } from '@/types/mobileNursing';
import {
  nutritionRisk,
  painLevel,
  scoreBarthel,
  scoreBraden,
  scoreMorse,
} from '@/utils/mobileNursing';

/* ------------------------- 评估量表配置（纯函数同口径） ------------------------- */
interface QOption {
  label: string;
  value: number;
}
interface Question {
  key: string;
  label: string;
  options: QOption[];
}
const SCALE_QUESTIONS: Record<string, Question[]> = {
  braden: [
    { key: 'sensation', label: '感觉', options: [1, 2, 3, 4].map((v) => ({ label: String(v), value: v })) },
    { key: 'moisture', label: '潮湿', options: [1, 2, 3, 4].map((v) => ({ label: String(v), value: v })) },
    { key: 'activity', label: '活动', options: [1, 2, 3, 4].map((v) => ({ label: String(v), value: v })) },
    { key: 'mobility', label: '移动', options: [1, 2, 3, 4].map((v) => ({ label: String(v), value: v })) },
    { key: 'nutrition', label: '营养', options: [1, 2, 3, 4].map((v) => ({ label: String(v), value: v })) },
    { key: 'friction', label: '摩擦剪切', options: [1, 2, 3].map((v) => ({ label: String(v), value: v })) },
  ],
  morse: [
    { key: 'fallHistory', label: '跌倒史', options: [{ label: '无', value: 0 }, { label: '有', value: 25 }] },
    { key: 'multipleDiagnosis', label: '多诊断', options: [{ label: '无', value: 0 }, { label: '有', value: 15 }] },
    { key: 'ambulationAid', label: '行走辅助', options: [{ label: '无/卧床', value: 0 }, { label: '拐杖手杖', value: 15 }] },
    { key: 'ivTherapy', label: '静脉输液', options: [{ label: '无', value: 0 }, { label: '有', value: 20 }] },
    { key: 'gait', label: '步态', options: [{ label: '正常', value: 0 }, { label: '虚弱', value: 10 }, { label: '受损', value: 20 }] },
    { key: 'cognition', label: '认知', options: [{ label: '量力', value: 0 }, { label: '高估', value: 15 }] },
  ],
  barthel: [
    { key: 'feeding', label: '进食', options: [{ label: '依赖', value: 0 }, { label: '部分', value: 5 }, { label: '独立', value: 10 }] },
    { key: 'bathing', label: '洗澡', options: [{ label: '依赖', value: 0 }, { label: '独立', value: 5 }] },
    { key: 'grooming', label: '修饰', options: [{ label: '依赖', value: 0 }, { label: '独立', value: 5 }] },
    { key: 'dressing', label: '穿衣', options: [{ label: '依赖', value: 0 }, { label: '部分', value: 5 }, { label: '独立', value: 10 }] },
    { key: 'toileting', label: '如厕', options: [{ label: '依赖', value: 0 }, { label: '部分', value: 5 }, { label: '独立', value: 10 }] },
    { key: 'bowel', label: '排便', options: [{ label: '失禁', value: 0 }, { label: '偶尔', value: 5 }, { label: '自控', value: 10 }] },
    { key: 'bladder', label: '排尿', options: [{ label: '失禁', value: 0 }, { label: '偶尔', value: 5 }, { label: '自控', value: 10 }] },
    { key: 'transfer', label: '转移', options: [{ label: '依赖', value: 0 }, { label: '大量帮助', value: 5 }, { label: '小量帮助', value: 10 }, { label: '独立', value: 15 }] },
    { key: 'walking', label: '行走', options: [{ label: '依赖', value: 0 }, { label: '轮椅', value: 5 }, { label: '少量帮助', value: 10 }, { label: '独立', value: 15 }] },
    { key: 'stairs', label: '上下楼', options: [{ label: '依赖', value: 0 }, { label: '部分', value: 5 }, { label: '独立', value: 10 }] },
  ],
  nutrition: [
    { key: 'bmiLow', label: 'BMI<18.5', options: [{ label: '否', value: 0 }, { label: '是', value: 3 }] },
    { key: 'weightLoss', label: '近期体重下降', options: [{ label: '否', value: 0 }, { label: '是', value: 3 }] },
    { key: 'reducedIntake', label: '进食减少', options: [{ label: '否', value: 0 }, { label: '是', value: 2 }] },
    { key: 'severeStress', label: '疾病应激', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
    { key: 'ageGe70', label: '年龄≥70', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
  ],
};

const QUICK_TEMPLATES = ['巡视记录：患者神志清楚，生命体征平稳。', '协助翻身 q2h，皮肤完好。', '健康教育：用药与注意事项告知。'];

export default function BedSide() {
  const { visitId = '' } = useParams();
  const store = useMobileNursingStore();

  const [scanInput, setScanInput] = useState('');
  const [wrist, setWrist] = useState<ScanResult | null>(null);
  const [drug, setDrug] = useState<ScanResult | null>(null);
  const [dose, setDose] = useState<string>('');
  const [checkedBy, setCheckedBy] = useState<string>('');
  const [adminResult, setAdminResult] = useState<string | null>(null);

  const [vitals, setVitals] = useState<Record<string, number | null>>({});
  const [taskList, setTaskList] = useState<NursingTaskDto[]>([]);

  const [scale, setScale] = useState<string>('braden');
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [recordText, setRecordText] = useState('');
  const [signed, setSigned] = useState(false);

  // 床旁任务加载（复用在院护理任务）
  useEffect(() => {
    if (!visitId) return;
    listNursingTasks(visitId)
      .then((t) => setTaskList(t))
      .catch(() => undefined);
  }, [visitId]);

  /* ---------------- 扫码 ---------------- */
  const onScan = async () => {
    const code = scanInput.trim();
    if (!code) return;
    setAdminResult(null);
    try {
      const r = await store.scan(code);
      if (r.kind === 'wristband') setWrist(r);
      else if (r.kind === 'drug') setDrug(r);
      setScanInput('');
    } catch {
      /* 错误已写入 store.error，由布局 Alert 展示 */
    }
  };

  /* ---------------- 五重核对 + 给药 ---------------- */
  const highRisk = drug?.requiresDoubleCheck === true;
  const onVerify = async () => {
    if (!drug?.orderId) return;
    try {
      const r = await store.verifyMedication(drug.orderId, {
        scannedBedNo: wrist?.bedNo ?? undefined,
        scannedPatientName: wrist?.patientName ?? undefined,
        scannedDrugCode: drug.drugCode ?? undefined,
        dose: dose || undefined,
        checkedBy: highRisk ? checkedBy : null,
      });
      if (!r.allOk) {
        setAdminResult('五重核对未通过：' + r.mismatches.join('；'));
      }
    } catch {
      /* 409 等错误已入 store.error */
    }
  };

  const onAdminister = async () => {
    if (!drug?.orderId) return;
    try {
      await store.administer(drug.orderId, {
        scannedBedNo: wrist?.bedNo ?? undefined,
        scannedPatientName: wrist?.patientName ?? undefined,
        scannedDrugCode: drug.drugCode ?? undefined,
        dose: dose || undefined,
        checkedBy: highRisk ? checkedBy : null,
        idempotencyKey: `m16a-${drug.orderId}-${Date.now()}`,
      });
      setAdminResult('给药成功，已双人核对/签名（高风险药）。');
    } catch {
      /* 错误已入 store.error */
    }
  };

  /* ---------------- 体征 ---------------- */
  const onVitals = async () => {
    try {
      await store.captureVitals({ visitId, ...vitals });
      setAdminResult('体征已采集并保存。');
    } catch {
      /* 已入 error */
    }
  };

  /* ---------------- 任务执行 ---------------- */
  const onExecTask = async (taskId: string) => {
    try {
      await store.executeTask(taskId, '床旁执行完成');
      const t = await listNursingTasks(visitId);
      setTaskList(t);
    } catch {
      /* 已入 error */
    }
  };

  /* ---------------- 评估量表实时算分 ---------------- */
  const assessment = useMemo(() => {
    if (scale === 'pain') {
      const s = answers.painScore ?? 0;
      const r = painLevel(s);
      return { score: s, level: r.level, levelLabel: r.levelLabel };
    }
    if (scale === 'braden') return scoreBraden(answers as never);
    if (scale === 'morse') return scoreMorse(answers as never);
    if (scale === 'barthel') return scoreBarthel(answers as never);
    if (scale === 'nutrition') return nutritionRisk(answers as never);
    return null;
  }, [scale, answers]);

  const onSaveAssessment = async () => {
    if (!assessment) return;
    try {
      await store.saveAssessment({
        visitId,
        scale: scale as never,
        answers,
        score: assessment.score,
        level: assessment.level,
      });
      setAdminResult(`量表已保存（${assessment.levelLabel}，${assessment.score} 分）。`);
    } catch {
      /* 已入 error */
    }
  };

  /* ---------------- 护理记录 ---------------- */
  const onVoice = () => {
    setRecordText((t) => (t ? `${t}\n` : '') + '（语音录入）请在此补充语音转写内容…');
  };
  const onSaveRecord = async () => {
    if (!signed) return;
    try {
      await store.createRecord({ visitId, measures: recordText, aiAssisted: true });
      setAdminResult('护理记录已保存并本人签名。');
    } catch {
      /* 已入 error */
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="AI 辅助（只读）"
        description="系统根据风险标记给出护理提示，仅供参考；不自动生成医嘱/护理措施，须护士本人核对并签名生效。"
      />

      {/* 扫码 */}
      <Card size="small" title={<><ScanOutlined /> 床旁扫码</>}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            data-testid="m-scan-input"
            placeholder="扫腕带(IP…)或药品(D001)"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onPressEnter={onScan}
          />
          <Button data-testid="m-scan-btn" type="primary" onClick={onScan}>
            识别
          </Button>
        </Space.Compact>
        {wrist && (
          <div data-testid="m-wrist-result" style={{ marginTop: 8 }}>
            <Tag color="green">腕带</Tag> {wrist.bedNo}床 · {wrist.patientName}
          </div>
        )}
        {drug && (
          <div data-testid="m-drug-result" style={{ marginTop: 8 }}>
            <Tag color="blue">药品</Tag> {drug.drugName ?? drug.drugCode} {drug.dose ?? ''}
            {highRisk && <Tag color="red">高风险·双人核对</Tag>}
          </div>
        )}
      </Card>

      {/* 给药五重核对 */}
      <Card size="small" title={<><HeartOutlined /> 给药五重核对</>}>
        <Row gutter={8}>
          <Col span={12}>
            <Input placeholder="剂量(按医嘱)" value={dose} onChange={(e) => setDose(e.target.value)} data-testid="m-dose-input" />
          </Col>
          <Col span={12}>
            {highRisk && (
              <Input placeholder="双人核对护士" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} data-testid="m-checkby-input" />
            )}
          </Col>
        </Row>
        <Space style={{ marginTop: 8 }}>
          <Button data-testid="m-verify-btn" onClick={onVerify} disabled={!drug?.orderId}>
            五重核对
          </Button>
          <Button data-testid="m-administer-btn" type="primary" onClick={onAdminister} disabled={!drug?.orderId}>
            确认给药
          </Button>
        </Space>
        {store.fiveRights && !store.fiveRights.allOk && (
          <Alert data-testid="m-five-rights-alert" style={{ marginTop: 8 }} type="error" showIcon message={store.fiveRights.mismatches.join('；')} />
        )}
        {store.fiveRights?.allOk && (
          <Alert data-testid="m-five-rights-ok" style={{ marginTop: 8 }} type="success" showIcon message="五重核对全部通过" />
        )}
      </Card>

      {/* 体征 */}
      <Card size="small" title={<><HeartOutlined /> 体征采集</>}>
        <Row gutter={[8, 8]}>
          {[
            ['temperature', '体温℃'],
            ['pulse', '脉搏/分'],
            ['respiration', '呼吸/分'],
            ['systolic', '收缩压'],
            ['diastolic', '舒张压'],
            ['spo2', '血氧%'],
            ['bloodGlucose', '血糖mmol'],
          ].map(([k, label]) => (
            <Col span={12} key={k}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder={label}
                value={vitals[k] ?? null}
                onChange={(v) => setVitals((s) => ({ ...s, [k]: v }))}
                data-testid={`m-vital-${k}`}
              />
            </Col>
          ))}
        </Row>
        <Button data-testid="m-vitals-save" type="primary" block style={{ marginTop: 8 }} onClick={onVitals}>
          保存体征
        </Button>
      </Card>

      {/* 任务 */}
      <Card size="small" title={<><CheckSquareOutlined /> 护理任务</>}>
        <List
          size="small"
          dataSource={taskList.filter((t) => t.status === 'pending')}
          locale={{ emptyText: '暂无待办任务' }}
          renderItem={(t) => (
            <List.Item
              key={t.id}
              actions={[
                <Button
                  data-testid={`m-task-exec-${t.id}`}
                  size="small"
                  type="link"
                  onClick={() => void onExecTask(t.id)}
                >
                  执行
                </Button>,
              ]}
            >
              <List.Item.Meta title={t.content} description={t.taskNo} />
            </List.Item>
          )}
        />
      </Card>

      {/* 评估量表 */}
      <Card size="small" title={<><FormOutlined /> 评估量表</>}>
        <Select
          style={{ width: '100%' }}
          value={scale}
          data-testid="m-scale-select"
          onChange={(v) => {
            setScale(v);
            setAnswers({});
          }}
          options={[
            { value: 'braden', label: 'Braden 压疮' },
            { value: 'morse', label: 'Morse 跌倒' },
            { value: 'barthel', label: 'Barthel ADL' },
            { value: 'pain', label: '疼痛 NRS' },
            { value: 'nutrition', label: '营养 NRS2002' },
          ]}
        />
        <div style={{ marginTop: 8 }}>
          {scale === 'pain' ? (
            <InputNumber
              min={0}
              max={10}
              style={{ width: '100%' }}
              data-testid="m-pain-score"
              placeholder="疼痛评分 0-10"
              onChange={(v) => setAnswers({ painScore: v ?? 0 })}
            />
          ) : (
            (SCALE_QUESTIONS[scale] ?? []).map((q) => (
              <div key={q.key} style={{ marginBottom: 6 }}>
                <span style={{ marginRight: 8 }}>{q.label}</span>
                <Select
                  size="small"
                  style={{ width: 160 }}
                  value={answers[q.key]}
                  data-testid={`m-q-${q.key}`}
                  onChange={(v) => setAnswers((s) => ({ ...s, [q.key]: v }))}
                  options={q.options}
                />
              </div>
            ))
          )}
        </div>
        {assessment && (
          <Alert
            data-testid="m-assessment-result"
            style={{ marginTop: 8 }}
            type={assessment.level === 'high' ? 'warning' : 'info'}
            showIcon
            message={`${assessment.levelLabel}（${assessment.score} 分）`}
          />
        )}
        <Button data-testid="m-assessment-save" type="primary" block style={{ marginTop: 8 }} onClick={onSaveAssessment}>
          保存评估
        </Button>
      </Card>

      {/* 护理记录 */}
      <Card size="small" title={<><EditOutlined /> 护理记录</>}>
        <Space wrap>
          {QUICK_TEMPLATES.map((t) => (
            <Button key={t} size="small" onClick={() => setRecordText(t)} data-testid="m-template">
              模板
            </Button>
          ))}
          <Button size="small" onClick={onVoice} data-testid="m-voice-btn">
            语音录入
          </Button>
        </Space>
        <Input.TextArea
          rows={3}
          style={{ marginTop: 8 }}
          value={recordText}
          onChange={(e) => setRecordText(e.target.value)}
          data-testid="m-record-text"
        />
        <Checkbox checked={signed} onChange={(e) => setSigned(e.target.checked)} data-testid="m-sign-check">
          本人电子签名确认
        </Checkbox>
        <Button data-testid="m-record-save" type="primary" block disabled={!signed} onClick={onSaveRecord}>
          保存记录
        </Button>
      </Card>

      {adminResult && <Alert data-testid="m-action-result" type="success" showIcon message={adminResult} />}
    </Space>
  );
}
