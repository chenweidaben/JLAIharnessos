import { createRegistryWithFirstBatch } from '../src/medical-tools/index';
import { CDSEngine } from '../src/knowledge/cds/CDSEngine';

// Create registry with all tools
const registry = createRegistryWithFirstBatch();

const tools = registry.getAll();
console.log('=== Medical Tools ===');
console.log('Total registered tools:', registry.size);
tools.forEach((t: any, i: number) => console.log(`  ${i+1}. ${t.name} [${t.category}]`));

// Count CDS rules
const engine = new CDSEngine();
const rules = engine.listRules();
console.log('\n=== CDS Rules ===');
console.log('Total CDS rules:', rules.length);

// Verify tool lookup by name
console.log('\n=== Tool Lookup Test ===');
console.log('query_patient found:', registry.has('query_patient'));
console.log('get_patient_detail found:', registry.has('get_patient_detail'));
console.log('create_order found:', registry.has('create_order'));
console.log('nonexistent_tool found:', registry.has('nonexistent_tool'));

// Verify CDS rule evaluation
console.log('\n=== CDS Engine Smoke Test ===');
const result = engine.evaluate({
  patientId: 'P001',
  labResults: { potassium: 6.8, glucose: 2.0, troponinI: 5.2 },
  currentMedications: ['warfarin'],
  allergies: [],
  pregnancyStatus: 'none',
});
console.log('CDS evaluation triggered rules:', result.triggeredRules.length);
console.log('Has disclaimer:', result.disclaimer !== undefined);
