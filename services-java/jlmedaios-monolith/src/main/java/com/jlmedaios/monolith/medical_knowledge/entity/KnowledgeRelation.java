/*
 * 健澜科技 jlmedaios - 知识关联实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 知识关联实体。
 *
 * <p>append-only: 知识关联不可修改</p>
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

    @Column(name = "relation_id")
    private String relationId;

    @Column(name = "source_node_id")
    private String sourceNodeId;

    @Column(name = "target_node_id")
    private String targetNodeId;

    @Column(name = "relation_type")
    private String relationType;
}
