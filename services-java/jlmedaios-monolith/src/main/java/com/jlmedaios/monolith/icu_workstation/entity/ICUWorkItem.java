/*
 * 健澜科技 jlmedaios - ICU 床位工作项实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ICU 床位工作项实体。
 *
 * <p>ICU 床位工作项主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "icu_work_item")
public class ICUWorkItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_item_no")
    private String workItemNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "bed_no")
    private String bedNo;

    @Column(name = "admit_time")
    @Builder.Default
    private LocalDateTime admitTime = LocalDateTime.now();

    @Column(name = "discharge_time")
    private LocalDateTime dischargeTime;

    @Column(name = "sofa_score")
    private BigDecimal sofaScore;

    @Column(name = "gcs_score")
    private Integer gcsScore;

    @Column(name = "ventilator_mode")
    private String ventilatorMode;

    @Column(name = "vasopressor_use")
    @Builder.Default
    private Boolean vasopressorUse = false;

    @Column(name = "status")
    @Builder.Default
    private String status = "IN_ICU";
}
