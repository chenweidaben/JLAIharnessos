/*
 * 健澜科技 jlmedaios - 临床路径记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_pathway.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 临床路径记录实体。
 *
 * <p>append-only: 临床路径入径记录不可修改，变异留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pathway_record")
public class PathwayRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "pathway_code")
    private String pathwayCode;

    @Column(name = "current_stage")
    @Builder.Default
    private Integer currentStage = 1;

    // ENROLLED 入径 / COMPLETED 完成 / DEVIATED 变异 / EXITED 退出
    @Column(name = "status")
    @Builder.Default
    private String status = "ENROLLED";

    @Column(name = "expected_days")
    private Integer expectedDays;

    @Column(name = "actual_days")
    private Integer actualDays;

    @Column(name = "deviation_note")
    private String deviationNote;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
