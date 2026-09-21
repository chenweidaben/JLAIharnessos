/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 放射科医师复核面板（契约 §5 底部闭环）：
 *  - 同意 / 修改 / 驳回（Radio.Group）+ 意见 TextArea + 签名（CA 签名框或演示签名）
 *  - 提交 POST /imaging/ai/jobs/:id/review；成功后禁用重复提交并展示审计留痕。
 * 权限：无 imaging:ai:review 权限时整体禁用并提示。
 */
import { CheckCircleOutlined, ClearOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Radio,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';

import type { RadarReviewReceipt, RadarReviewRequest, RadarVerdict } from '@/types/imagingAi';

const { Text } = Typography;

/* --------------------------- 轻量签名板（原生 canvas，无重型依赖） --------------------------- */
interface SignaturePadProps {
  onChange: (dataUrl: string) => void;
  onClear: () => void;
}

function SignaturePad({ onChange, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // jsdom 等无 2D 上下文环境下不绑定事件，保持降级
  const ctx = canvasRef.current?.getContext('2d') ?? null;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const context = c.getContext('2d');
    if (!context) return;
    context.lineWidth = 2;
    context.strokeStyle = '#1f1f1f';
    context.lineCap = 'round';
  }, []);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    drawing.current = true;
    const { x, y } = pos(e);
    context.beginPath();
    context.moveTo(x, y);
  };
  const move = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const { x, y } = pos(e);
    context.lineTo(x, y);
    context.stroke();
    setHasInk(true);
  };
  const end = () => {
    drawing.current = false;
    if (canvasRef.current && hasInk) onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clear = () => {
    const c = canvasRef.current;
    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange('');
    onClear();
  };

  return (
    <div data-testid="signature-pad">
      <canvas
        ref={canvasRef}
        width={420}
        height={120}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        style={{
          border: '1px dashed #d9d9d9',
          borderRadius: 6,
          background: '#fafafa',
          cursor: 'crosshair',
        }}
      />
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          请在上方手写签名（演示环境；生产对接 CA 证书签名）
        </Text>
        <Button size="small" icon={<ClearOutlined />} onClick={clear}>
          清除
        </Button>
      </div>
      {ctx === null && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          （当前环境不支持画布签名，将以演示签名提交）
        </Text>
      )}
    </div>
  );
}

/* ------------------------------- 复核面板 ------------------------------- */
interface ReviewPanelProps {
  jobId: string;
  /** 是否具备 imaging:ai:review 权限 */
  canReview: boolean;
  /** 提交中 */
  submitting: boolean;
  /** 已提交的审计留痕（提交成功后展示） */
  receipt: RadarReviewReceipt | null;
  /** 默认签名人姓名（取自登录用户） */
  defaultSignerName?: string;
  defaultSignerId?: string;
  onSubmit: (body: RadarReviewRequest) => Promise<RadarReviewReceipt>;
}

const VERDICT_META: Record<RadarVerdict, { label: string; color: string }> = {
  approve: { label: '同意', color: 'green' },
  modify: { label: '修改', color: 'orange' },
  reject: { label: '驳回', color: 'red' },
};

export default function ReviewPanel({
  jobId,
  canReview,
  submitting,
  receipt,
  defaultSignerName = '',
  defaultSignerId = '',
  onSubmit,
}: ReviewPanelProps) {
  const [verdict, setVerdict] = useState<RadarVerdict>('approve');
  const [comment, setComment] = useState('');
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [caSignature, setCaSignature] = useState('');
  const [localError, setLocalError] = useState('');

  const done = receipt !== null;

  const handleSubmit = async () => {
    setLocalError('');
    if (!signerName.trim()) {
      setLocalError('请填写签名医师姓名');
      return;
    }
    await onSubmit({
      verdict,
      comment: comment.trim() || undefined,
      signer_id: defaultSignerId || 'demo-doctor',
      signer_name: signerName.trim(),
      ca_signature: caSignature || undefined,
    });
  };

  return (
    <Card
      data-testid="review-panel"
      size="small"
      title={
        <span>
          <SafetyCertificateOutlined /> 放射科医师复核
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            job: {jobId}
          </Text>
        </span>
      }
    >
      {!canReview && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="当前账号无 imaging:ai:review 复核权限，仅可查看 AI 第二阅片结果。"
        />
      )}

      {done ? (
        /* 审计留痕：提交成功后展示，禁用重复提交 */
        <div data-testid="review-receipt">
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="复核已提交并写入审计留痕"
          />
          <Descriptions size="small" column={1} bordered style={{ marginTop: 12 }}>
            <Descriptions.Item label="审计号 audit_id">
              <Text code>{receipt.audit_id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="复核结论">
              <Tag color={VERDICT_META[receipt.verdict].color}>
                {VERDICT_META[receipt.verdict].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="签名医师 signer">{receipt.signer_id}</Descriptions.Item>
            <Descriptions.Item label="复核时间 reviewed_at">{receipt.reviewed_at}</Descriptions.Item>
          </Descriptions>
        </div>
      ) : canReview ? (
        <Form layout="vertical" disabled={submitting}>
          <Form.Item label="复核结论" required>
            <Radio.Group
              value={verdict}
              onChange={(e) => setVerdict(e.target.value as RadarVerdict)}
              data-testid="verdict-radio"
            >
              <Radio.Button value="approve">同意</Radio.Button>
              <Radio.Button value="modify">修改</Radio.Button>
              <Radio.Button value="reject">驳回</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="复核意见">
            <Input.TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="可填写对 AI 发现的修改说明 / 驳回理由（选填）"
            />
          </Form.Item>
          <Form.Item label="签名医师姓名" required>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="请输入签名医师姓名"
              data-testid="signer-name"
            />
          </Form.Item>
          <Form.Item label="手写签名">
            <SignaturePad onChange={setCaSignature} onClear={() => setCaSignature('')} />
          </Form.Item>
          {localError && (
            <Text type="danger" style={{ display: 'block', marginBottom: 8 }}>
              {localError}
            </Text>
          )}
          <Space>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => {
                void handleSubmit();
              }}
              data-testid="review-submit"
            >
              提交复核并签名
            </Button>
          </Space>
        </Form>
      ) : null}
    </Card>
  );
}
