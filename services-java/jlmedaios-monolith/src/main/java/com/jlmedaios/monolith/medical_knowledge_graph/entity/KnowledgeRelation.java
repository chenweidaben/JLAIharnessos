/*
 * 健澜科技 jlmedaios - 知识关系实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge_graph.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 知识关系实体。
 *
 * <p>append-only: 知识关系不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "knowledge_relation")
public class KnowledgeRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "relation_code")
    private String relationCode;

    @Column(name = "source_node")
    private String sourceNode;

    @Column(name = "target_node")
    private String targetNode;

    @Column(name = "relation_type")
    private String relationType;

    @Column(name = "strength")
    private BigDecimal strength;
}
