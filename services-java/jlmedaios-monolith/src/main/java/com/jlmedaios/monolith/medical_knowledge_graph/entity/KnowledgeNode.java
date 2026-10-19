/*
 * 健澜科技 jlmedaios - 知识节点实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge_graph.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 知识节点实体。
 *
 * <p>知识节点主数据；生产接 Neo4j，H2 下 mock</p>
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

    @Column(name = "node_code")
    private String nodeCode;

    @Column(name = "node_name")
    private String nodeName;

    @Column(name = "node_type")
    private String nodeType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "icd_code")
    private String icdCode;
}
