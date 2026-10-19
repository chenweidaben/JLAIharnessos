/*
 * 健澜科技 jlmedaios - 手术工作项实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.or_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 手术工作项实体。
 *
 * <p>append-only: 手术工作项不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "or_work_item")
public class ORWorkItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_item_no")
    private String workItemNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    // @Sensitive 主刀医生 ID，脱敏存储
    @Column(name = "surgeon")
    private String surgeon;

    // @Sensitive 麻醉医师 ID，脱敏存储
    @Column(name = "anesthetist")
    private String anesthetist;

    @Column(name = "scheduled_start")
    private LocalDateTime scheduledStart;

    @Column(name = "actual_start")
    private LocalDateTime actualStart;

    @Column(name = "actual_end")
    private LocalDateTime actualEnd;

    @Column(name = "or_room")
    private String orRoom;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "surgery_type")
    private String surgeryType;
}
