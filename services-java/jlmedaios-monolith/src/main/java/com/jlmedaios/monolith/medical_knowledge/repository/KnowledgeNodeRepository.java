/*
 * 健澜科技 jlmedaios - 知识节点 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge.repository;

import com.jlmedaios.monolith.medical_knowledge.entity.KnowledgeNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 知识节点 Repository。
 */
@Repository
public interface KnowledgeNodeRepository extends JpaRepository<KnowledgeNode, Long> {

    /**
     * 按类别查询知识节点。
     *
     * @param category 类别
     * @return 知识节点列表
     */
    List<KnowledgeNode> findByCategory(String category);
}
