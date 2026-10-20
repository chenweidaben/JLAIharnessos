/*
 * 健澜科技 jlmedaios - 诊疗记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.encounter.entity;

import com.jlmedaios.monolith.common.TenantEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 诊疗记录实体。
 *
 * <p>append-only: 诊疗记录一旦生成不可修改，只能追加 review 记录</p>
 * <p>P5 多租户：继承 TenantEntity，自动获得 tenantId 字段。</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "encounter_record", indexes = {
        @Index(name = "idx_encounter_patient", columnList = "patient_id"),
        @Index(name = "idx_encounter_visit", columnList = "visit_id"),
        @Index(name = "idx_encounter_dept", columnList = "dept_code"),
        @Index(name = "idx_encounter_tenant", columnList = "tenant_id")
})
public class EncounterRecord extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "visit_id")
    private Long visitId;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "chief_complaint")
    private String chiefComplaint;

    @Column(name = "diagnosis")
    private String diagnosis;

    @Column(name = "orders_snapshot", columnDefinition = "TEXT")
    private String ordersSnapshot;

    @Column(name = "charge_snapshot", columnDefinition = "TEXT")
    private String chargeSnapshot;

    @Column(name = "outcome")
    private String outcome;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
