/*
 * 健澜科技 jlmedaios - 知识关联 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge.repository;

import com.jlmedaios.monolith.medical_knowledge.entity.KnowledgeRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 知识关联 Repository。
 */
@Repository
public interface KnowledgeRelationRepository extends JpaRepository<KnowledgeRelation, Long> {

    /**
     * 按源节点 ID 查询关联。
     *
     * @param sourceNodeId 源节点 ID
     * @return 关联列表
     */
    List<KnowledgeRelation> findBySourceNodeId(String sourceNodeId);
}
