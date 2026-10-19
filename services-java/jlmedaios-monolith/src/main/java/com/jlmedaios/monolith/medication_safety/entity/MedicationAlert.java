/*
 * 健澜科技 jlmedaios - 用药安全预警实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medication_safety.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用药安全预警实体。
 *
 * <p>append-only: 用药安全预警不可修改；与 drug_interaction 模块互补，本模块侧重实时预警</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "medication_alert")
public class MedicationAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alert_code")
    private String alertCode;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "medication_name")
    private String medicationName;

    @Column(name = "alert_type")
    private String alertType;

    @Column(name = "severity")
    private String severity;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";
}
