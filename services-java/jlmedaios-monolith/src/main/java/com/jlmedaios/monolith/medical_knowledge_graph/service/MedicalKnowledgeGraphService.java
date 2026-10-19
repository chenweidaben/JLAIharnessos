/*
 * 健澜科技 jlmedaios - 医学知识图谱 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge_graph.service;

import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeNode;
import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeRelation;
import com.jlmedaios.monolith.medical_knowledge_graph.repository.KnowledgeNodeRepository;
import com.jlmedaios.monolith.medical_knowledge_graph.repository.KnowledgeRelationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 医学知识图谱 Service。
 *
 * <p>知识节点主数据；生产接 Neo4j，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalKnowledgeGraphService {

    private final KnowledgeNodeRepository knowledgeNodeRepository;
    private final KnowledgeRelationRepository knowledgeRelationRepository;

    /**
     * 查询知识节点。
     *
     * @param nodeName 节点名称
     * @return 知识节点
     */
    public KnowledgeNode queryNode(String nodeName) {
        List<KnowledgeNode> nodes = knowledgeNodeRepository.findByNodeName(nodeName);
        return nodes.isEmpty() ? null : nodes.get(0);
    }

    /**
     * 查询关联关系。
     *
     * @param nodeName 节点名称
     * @return 知识关系列表
     */
    public List<KnowledgeRelation> queryRelations(String nodeName) {
        List<KnowledgeRelation> sourceRels = knowledgeRelationRepository.findBySourceNode(nodeName);
        List<KnowledgeRelation> targetRels = knowledgeRelationRepository.findByTargetNode(nodeName);
        sourceRels.addAll(targetRels);
        return sourceRels;
    }

    /**
     * 推理路径（mock 返回中间节点列表）。
     *
     * @param source 源节点
     * @param target 目标节点
     * @return 中间节点列表
     */
    public List<String> inferPath(String source, String target) {
        return List.of(source, "肺部感染", target);
    }
}
