-- jlmedaios M1-A 住院快照（psql）：行数 + 床位状态 + 在院/审计
\echo '==== 行数 ===='
SELECT 'campuses' AS t, COUNT(*) AS n FROM clinical.campuses
UNION ALL SELECT 'wards', COUNT(*) FROM clinical.wards
UNION ALL SELECT 'beds', COUNT(*) FROM clinical.beds
UNION ALL SELECT 'admissions', COUNT(*) FROM clinical.admissions
UNION ALL SELECT 'adt_events', COUNT(*) FROM clinical.adt_events
UNION ALL SELECT 'visits_total', COUNT(*) FROM clinical.visits
UNION ALL SELECT 'visits_inpatient_ongoing', COUNT(*) FROM clinical.visits
  WHERE visit_type='inpatient' AND status='ongoing'
UNION ALL SELECT 'visits_inpatient_discharged', COUNT(*) FROM clinical.visits
  WHERE visit_type='inpatient' AND status='discharged'
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit.audit_logs
ORDER BY t;
\echo '==== 床位四态（全院）===='
SELECT status, COUNT(*) FROM clinical.beds GROUP BY status ORDER BY status;
\echo '==== 各病区床位状态 ===='
SELECT w.code, b.status, COUNT(*)
FROM clinical.beds b JOIN clinical.wards w ON w.id=b.ward_id
GROUP BY w.code, b.status ORDER BY w.code, b.status;
\echo '==== admissions 状态 ===='
SELECT status, COUNT(*) FROM clinical.admissions GROUP BY status ORDER BY status;
