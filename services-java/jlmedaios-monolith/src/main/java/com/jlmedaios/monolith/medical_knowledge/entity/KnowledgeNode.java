/*
 * 健澜科技 jlmedaios - 知识节点实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 知识节点实体。
 *
 * <p>知识节点主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "knowledge_node")
public class KnowledgeNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "node_id")
    private String nodeId;

    @Column(name = "title")
    private String title;

    @Column(name = "category")
    private String category;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "source")
    private String source;

    @Column(name = "update_date")
    @Builder.Default
    private LocalDate updateDate = LocalDate.now();
}
