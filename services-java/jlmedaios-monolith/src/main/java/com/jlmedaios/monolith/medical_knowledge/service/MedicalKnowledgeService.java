/*
 * 健澜科技 jlmedaios - 医学知识库 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge.service;

import com.jlmedaios.monolith.medical_knowledge.entity.KnowledgeNode;
import com.jlmedaios.monolith.medical_knowledge.entity.KnowledgeRelation;
import com.jlmedaios.monolith.medical_knowledge.repository.KnowledgeNodeRepository;
import com.jlmedaios.monolith.medical_knowledge.repository.KnowledgeRelationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 医学知识库 Service。
 *
 * <p>append-only: 知识关联不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalKnowledgeService {

    private final KnowledgeNodeRepository knowledgeNodeRepository;
    private final KnowledgeRelationRepository knowledgeRelationRepository;

    /**
     * 搜索知识节点（mock：按 title 模糊匹配）。
     *
     * @param keyword 关键词
     * @return 知识节点列表
     */
    public List<KnowledgeNode> search(String keyword) {
        return knowledgeNodeRepository.findAll().stream()
                .filter(n -> n.getTitle().contains(keyword))
                .toList();
    }

    /**
     * 关联节点。
     *
     * @param nodeId 节点 ID
     * @return 关联列表
     */
    public List<KnowledgeRelation> relatedNodes(String nodeId) {
        return knowledgeRelationRepository.findBySourceNodeId(nodeId);
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return 知识节点列表
     */
    public List<KnowledgeNode> byCategory(String category) {
        return knowledgeNodeRepository.findByCategory(category);
    }
}
