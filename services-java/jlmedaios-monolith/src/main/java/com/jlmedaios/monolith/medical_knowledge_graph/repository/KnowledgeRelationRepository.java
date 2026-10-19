/*
 * 健澜科技 jlmedaios - 知识关系 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge_graph.repository;

import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 知识关系 Repository。
 */
@Repository
public interface KnowledgeRelationRepository extends JpaRepository<KnowledgeRelation, Long> {

    /**
     * 按源节点查询知识关系。
     *
     * @param sourceNode 源节点
     * @return 知识关系列表
     */
    List<KnowledgeRelation> findBySourceNode(String sourceNode);

    /**
     * 按目标节点查询知识关系。
     *
     * @param targetNode 目标节点
     * @return 知识关系列表
     */
    List<KnowledgeRelation> findByTargetNode(String targetNode);
}
