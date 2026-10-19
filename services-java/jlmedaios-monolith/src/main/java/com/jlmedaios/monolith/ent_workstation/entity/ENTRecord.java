/*
 * 健澜科技 jlmedaios - 耳鼻喉检查记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ent_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 耳鼻喉检查记录实体。
 *
 * <p>append-only: 耳鼻喉检查记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "ent_record")
public class ENTRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_no")
    private String recordNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "department")
    private String department;

    @Column(name = "exam_type")
    private String examType;

    @Column(name = "findings", columnDefinition = "TEXT")
    private String findings;

    @Column(name = "diagnosis")
    private String diagnosis;

    @Column(name = "prescription")
    private String prescription;
}
