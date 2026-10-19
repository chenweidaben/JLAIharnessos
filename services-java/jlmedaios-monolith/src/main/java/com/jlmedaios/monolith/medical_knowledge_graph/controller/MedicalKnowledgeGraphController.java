/*
 * 健澜科技 jlmedaios - 医学知识图谱 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge_graph.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeNode;
import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeRelation;
import com.jlmedaios.monolith.medical_knowledge_graph.service.MedicalKnowledgeGraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 医学知识图谱 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/kg")
public class MedicalKnowledgeGraphController {

    private final MedicalKnowledgeGraphService medicalKnowledgeGraphService;

    /**
     * 查询知识节点。
     *
     * @param nodeName 节点名称
     * @return Result<KnowledgeNode>
     */
    @GetMapping("/node/{nodeName}")
    public Result<KnowledgeNode> queryNode(@PathVariable String nodeName) {
        return Result.ok(medicalKnowledgeGraphService.queryNode(nodeName));
    }

    /**
     * 查询关联关系。
     *
     * @param nodeName 节点名称
     * @return Result<List<KnowledgeRelation>>
     */
    @GetMapping("/relations/{nodeName}")
    public Result<List<KnowledgeRelation>> queryRelations(@PathVariable String nodeName) {
        return Result.ok(medicalKnowledgeGraphService.queryRelations(nodeName));
    }

    /**
     * 推理路径。
     *
     * @param source 源节点
     * @param target 目标节点
     * @return Result<List<String>>
     */
    @GetMapping("/path/{source}/{target}")
    public Result<List<String>> inferPath(@PathVariable String source, @PathVariable String target) {
        return Result.ok(medicalKnowledgeGraphService.inferPath(source, target));
    }
}
