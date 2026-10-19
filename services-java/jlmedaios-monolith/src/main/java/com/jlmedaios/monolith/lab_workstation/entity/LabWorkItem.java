/*
 * 健澜科技 jlmedaios - 检验工作项实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 检验工作项实体。
 *
 * <p>append-only: 检验工作项不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "lab_work_item")
public class LabWorkItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_item_no")
    private String workItemNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "test_item")
    private String testItem;

    @Column(name = "sample_status")
    @Builder.Default
    private String sampleStatus = "RECEIVED";

    // @Sensitive 检验技师 ID，脱敏存储
    @Column(name = "technician")
    private String technician;

    @Column(name = "result_values", columnDefinition = "TEXT")
    private String resultValues;

    @Column(name = "review_status")
    @Builder.Default
    private String reviewStatus = "UNREVIEWED";
}
