/*
 * 健澜科技 jlmedaios - 影像工作项实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 影像工作项实体。
 *
 * <p>append-only: 影像工作项不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "radiology_work_item")
public class RadiologyWorkItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_item_no")
    private String workItemNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "modality")
    private String modality;

    @Column(name = "body_part")
    private String bodyPart;

    @Column(name = "study_status")
    @Builder.Default
    private String studyStatus = "PENDING";

    // @Sensitive 放射科医师 ID，脱敏存储
    @Column(name = "radiologist")
    private String radiologist;

    @Column(name = "report_content", columnDefinition = "TEXT")
    private String reportContent;
}
