/*
 * 健澜科技 jlmedaios - 医学知识库 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge;

import com.jlmedaios.monolith.medical_knowledge.entity.KnowledgeNode;
import com.jlmedaios.monolith.medical_knowledge.service.MedicalKnowledgeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医学知识库 Service 测试。
 */
@SpringBootTest
public class MedicalKnowledgeServiceTest {

    @Autowired
    private MedicalKnowledgeService medicalKnowledgeService;

    @Test
    void testSearchEmpty() {
        List<KnowledgeNode> nodes = medicalKnowledgeService.search("肺炎");
        assertNotNull(nodes);
    }

    @Test
    void testByCategory() {
        List<KnowledgeNode> nodes = medicalKnowledgeService.byCategory("疾病");
        assertNotNull(nodes);
    }

    @Test
    void testRelatedNodesEmpty() {
        List<?> relations = medicalKnowledgeService.relatedNodes("NODE-001");
        assertNotNull(relations);
    }
}
