/*
 * 健澜科技 jlmedaios - 会议实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_office.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 会议实体。
 *
 * <p>append-only: 会议记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "meeting")
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meeting_no")
    private String meetingNo;

    @Column(name = "title")
    private String title;

    @Column(name = "host")
    private String host;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "location")
    private String location;

    @Column(name = "attendees_json", columnDefinition = "TEXT")
    private String attendeesJSON;

    @Column(name = "minutes", columnDefinition = "TEXT")
    private String minutes;

    @Column(name = "status")
    @Builder.Default
    private String status = "SCHEDULED";
}
