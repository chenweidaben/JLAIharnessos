/*
 * 健澜科技 jlmedaios - CDS 评估记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_deep.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * CDS 评估记录实体。
 *
 * <p>append-only: CDS 评估记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cds_evaluation")
public class CDSEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_no")
    private String evaluationNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "rule_code")
    private String ruleCode;

    @Column(name = "triggered_at")
    @Builder.Default
    private LocalDateTime triggeredAt = LocalDateTime.now();

    @Column(name = "action_taken")
    private String actionTaken;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;
}
