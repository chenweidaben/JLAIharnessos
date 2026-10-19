/*
 * 健澜科技 jlmedaios - 医学知识库 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_knowledge.entity.KnowledgeNode;
import com.jlmedaios.monolith.medical_knowledge.entity.KnowledgeRelation;
import com.jlmedaios.monolith.medical_knowledge.service.MedicalKnowledgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 医学知识库 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/knowledge")
public class MedicalKnowledgeController {

    private final MedicalKnowledgeService medicalKnowledgeService;

    /**
     * 搜索知识节点。
     *
     * @param keyword 关键词
     * @return Result<List<KnowledgeNode>>
     */
    @GetMapping("/search")
    public Result<List<KnowledgeNode>> search(@RequestParam String keyword) {
        return Result.ok(medicalKnowledgeService.search(keyword));
    }

    /**
     * 关联节点。
     *
     * @param nodeId 节点 ID
     * @return Result<List<KnowledgeRelation>>
     */
    @GetMapping("/{nodeId}/related")
    public Result<List<KnowledgeRelation>> relatedNodes(@PathVariable String nodeId) {
        return Result.ok(medicalKnowledgeService.relatedNodes(nodeId));
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return Result<List<KnowledgeNode>>
     */
    @GetMapping("/category/{category}")
    public Result<List<KnowledgeNode>> byCategory(@PathVariable String category) {
        return Result.ok(medicalKnowledgeService.byCategory(category));
    }
}
