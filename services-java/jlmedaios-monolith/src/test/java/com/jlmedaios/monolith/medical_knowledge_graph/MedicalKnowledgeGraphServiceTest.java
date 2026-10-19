/*
 * 健澜科技 jlmedaios - 医学知识图谱 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_knowledge_graph;

import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeNode;
import com.jlmedaios.monolith.medical_knowledge_graph.entity.KnowledgeRelation;
import com.jlmedaios.monolith.medical_knowledge_graph.service.MedicalKnowledgeGraphService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医学知识图谱 Service 测试。
 */
@SpringBootTest
public class MedicalKnowledgeGraphServiceTest {

    @Autowired
    private MedicalKnowledgeGraphService medicalKnowledgeGraphService;

    @Test
    void testQueryNode() {
        KnowledgeNode node = medicalKnowledgeGraphService.queryNode("肺炎");
        // 可能为空（H2 内存库无预置数据）
    }

    @Test
    void testQueryRelations() {
        List<KnowledgeRelation> relations = medicalKnowledgeGraphService.queryRelations("肺炎");
        assertNotNull(relations);
    }

    @Test
    void testInferPath() {
        List<String> path = medicalKnowledgeGraphService.inferPath("咳嗽", "肺炎");
        assertNotNull(path);
        assertTrue(path.size() >= 2);
    }
}
