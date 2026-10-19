/*
 * 健澜科技 jlmedaios - 病历质控记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_quality.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 病历质控记录实体。
 *
 * <p>append-only: 病历质控记录不可修改；对应电子病历五级评审，自动质控规则+人工抽检</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "mrqc_record")
public class MRQCRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_no")
    private String recordNo;

    @Column(name = "medical_record_no")
    private String medicalRecordNo;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "qc_type")
    private String qcType;

    @Column(name = "qc_items_json", columnDefinition = "TEXT")
    private String qcItemsJSON;

    @Column(name = "passed_count")
    private Integer passedCount;

    @Column(name = "failed_count")
    private Integer failedCount;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";
}
