-- M86-A: 日常病程记录（三级查房）
CREATE TABLE IF NOT EXISTS clinical.progress_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      uuid NOT NULL REFERENCES clinical.visits(id),
  note_type     text NOT NULL CHECK (note_type IN ('routine','round_resident','round_attending','round_director','consult','handover','critical')),
  note_date     timestamptz NOT NULL DEFAULT now(),
  content       text NOT NULL,
  attending_doctor uuid REFERENCES iam.users(id),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed')),
  signed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_progress_visit ON clinical.progress_notes(visit_id);
CREATE INDEX IF NOT EXISTS idx_progress_type ON clinical.progress_notes(note_type);

INSERT INTO iam.permissions(code, name, module) VALUES
  ('progress_note:write', '病程记录-书写', 'emr'),
  ('progress_note:sign', '病程记录-签名', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','progress_note:write'),
  ('admin','progress_note:write'),
  ('admin','progress_note:sign')
ON CONFLICT DO NOTHING;
