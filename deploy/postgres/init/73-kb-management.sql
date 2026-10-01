-- ============================================================================
-- 健澜科技杠OS - 知识库管理与检索权限（M4-A）
-- 73-kb-management.sql
--
-- 新增 knowledge:read 只读检索权限，并补齐各角色在 iam.role_permissions 中的
-- 知识库授权种子（应用层另有 ROLE_PERMISSIONS 同步生效，保持两者一致）。
-- 权限语义：
--   knowledge:read   查看知识库与文档、执行 RAG 检索（通用能力）
--   knowledge:manage 新建/修改/删除知识库、摄入文档（管理员、医师）
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 新增只读权限码（幂等）
INSERT INTO iam.permissions(code, name, module, description)
VALUES ('knowledge:read', '知识检索只读', '知识中台', '查看知识库与文档、执行检索增强生成（RAG）检索')
ON CONFLICT (code) DO NOTHING;

-- 管理权限码（若缺失则补齐，正常已由 10-iam 种子提供）
INSERT INTO iam.permissions(code, name, module, description)
VALUES ('knowledge:manage', '知识库管理', '知识中台', '新建、修改、删除知识库，摄入与索引文档')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等，主键为 role_code + permission_code）
-- 管理员、医师：管理 + 只读
INSERT INTO iam.role_permissions(role_code, permission_code)
VALUES
  ('admin', 'knowledge:read'),
  ('admin', 'knowledge:manage'),
  ('doctor', 'knowledge:read'),
  ('doctor', 'knowledge:manage'),
  ('pharmacist', 'knowledge:read'),
  ('nurse', 'knowledge:read'),
  ('technician', 'knowledge:read'),
  ('researcher', 'knowledge:read')
ON CONFLICT (role_code, permission_code) DO NOTHING;
