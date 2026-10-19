/*
 * 健澜科技 jlmedaios - 手术排台实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery_advanced.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 手术排台实体。
 *
 * <p>手术排台主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "surgery_schedule")
public class SurgerySchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schedule_no")
    private String scheduleNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "surgery_name")
    private String surgeryName;

    // @Sensitive 主刀医生工号，脱敏存储
    @Column(name = "surgeon")
    private String surgeon;

    // @Sensitive 麻醉医生工号，脱敏存储
    @Column(name = "anesthesiologist")
    private String anesthesiologist;

    @Column(name = "surgery_room")
    private String surgeryRoom;

    @Column(name = "scheduled_start")
    private LocalDateTime scheduledStart;

    @Column(name = "scheduled_end")
    private LocalDateTime scheduledEnd;

    @Column(name = "priority")
    private String priority;

    @Column(name = "status")
    @Builder.Default
    private String status = "SCHEDULED";
}
