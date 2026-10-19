/*
 * 健澜科技 jlmedaios - 康复进度记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 康复进度记录实体。
 *
 * <p>append-only: 康复进度记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "rehab_progress")
public class RehabProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no")
    private String orderNo;

    @Column(name = "session_date")
    @Builder.Default
    private LocalDate sessionDate = LocalDate.now();

    // @Sensitive 治疗师工号，脱敏存储
    @Column(name = "therapist")
    private String therapist;

    @Column(name = "progress_notes", columnDefinition = "TEXT")
    private String progressNotes;

    @Column(name = "goal_achievement")
    private String goalAchievement;
}
