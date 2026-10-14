-- M88-A: AI病历草稿
CREATE TABLE IF NOT EXISTS clinical.ai_note_drafts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  draft_type   text NOT NULL CHECK (draft_type IN ('progress_note','admission_summary','discharge_summary','consult_reply')),
  prompt_context text NOT NULL,
  generated_content text NOT NULL,
  model_version text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','accepted','rejected','modified')),
  reviewed_by  uuid REFERENCES iam.users(id),
  reviewed_at   timestamptz,
  doctor_edit   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_draft_visit ON clinical.ai_note_drafts(visit_id);
CREATE INDEX IF NOT EXISTS idx_ai_draft_status ON clinical.ai_note_drafts(status);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_note:generate', 'AI病历-生成', 'emr'),
  ('ai_note:review', 'AI病历-审核', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','ai_note:generate'), ('admin','ai_note:generate'),
  ('admin','ai_note:review')
ON CONFLICT DO NOTHING;
