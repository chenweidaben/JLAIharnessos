/*
 * 健澜科技 jlmedaios - 公告实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_office.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 公告实体。
 *
 * <p>公告主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "announcement")
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "publish_date")
    @Builder.Default
    private LocalDate publishDate = LocalDate.now();

    @Column(name = "publisher")
    private String publisher;

    @Column(name = "priority")
    private String priority;

    @Column(name = "status")
    @Builder.Default
    private String status = "PUBLISHED";
}
