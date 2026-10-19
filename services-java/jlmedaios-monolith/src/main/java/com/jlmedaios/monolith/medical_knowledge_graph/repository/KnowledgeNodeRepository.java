/*
 * 健澜科技 jlmedaios - 知识节点 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge_graph.repository;

import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 知识节点 Repository。
 */
@Repository
public interface KnowledgeNodeRepository extends JpaRepository<KnowledgeNode, Long> {

    /**
     * 按节点名称查询知识节点。
     *
     * @param nodeName 节点名称
     * @return 知识节点列表
     */
    List<KnowledgeNode> findByNodeName(String nodeName);

    /**
     * 按节点类型查询知识节点。
     *
     * @param nodeType 节点类型
     * @return 知识节点列表
     */
    List<KnowledgeNode> findByNodeType(String nodeType);
}
