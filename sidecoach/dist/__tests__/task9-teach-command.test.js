"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const sidecoach_orchestrator_1 = require("../sidecoach-orchestrator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
console.log('\n[Task 9] /sidecoach teach Command (PRODUCT.md Setup)\n');
console.log('='.repeat(80));
const orchestrator = (0, sidecoach_orchestrator_1.createExecutionEngine)();
const testDir = '/tmp/sidecoach-teach-test';
// Create test directory
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}
orchestrator.process('/sidecoach teach', { projectPath: testDir }).then((result) => {
    console.log('\n[Test 1] /sidecoach teach creates PRODUCT.md');
    const productMdPath = path.join(testDir, 'PRODUCT.md');
    const fileExists = fs.existsSync(productMdPath);
    console.log(`  File created: ${fileExists ? 'YES' : 'NO'}`);
    if (fileExists) {
        const content = fs.readFileSync(productMdPath, 'utf-8');
        const hasRegister = content.includes('Register');
        const hasUsers = content.includes('Primary Users');
        const hasAntiRefs = content.includes('Anti-References');
        const hasPrinciples = content.includes('Strategic Principles');
        console.log(`  Has Register section: ${hasRegister ? 'YES' : 'NO'}`);
        console.log(`  Has Primary Users: ${hasUsers ? 'YES' : 'NO'}`);
        console.log(`  Has Anti-References: ${hasAntiRefs ? 'YES' : 'NO'}`);
        console.log(`  Has Strategic Principles: ${hasPrinciples ? 'YES' : 'NO'}`);
        const allSectionsPresent = hasRegister && hasUsers && hasAntiRefs && hasPrinciples;
        console.log(`\n  Result: ${allSectionsPresent ? 'PASS' : 'FAIL'}`);
    }
    else {
        console.log('\n  Result: FAIL');
    }
    // Test 2: Check result structure
    console.log('\n[Test 2] /sidecoach teach result structure');
    const hasGuidance = result.guidance && result.guidance.length > 0;
    const hasChecklist = result.checklist && result.checklist.length > 0;
    const hasArtifacts = result.artifacts && result.artifacts.length > 0;
    const resultSuccess = result.success === true;
    console.log(`  Success flag: ${resultSuccess ? 'YES' : 'NO'}`);
    console.log(`  Guidance items: ${result.guidance ? result.guidance.length : 0}`);
    console.log(`  Checklist items: ${result.checklist ? result.checklist.length : 0}`);
    console.log(`  Artifacts: ${result.artifacts ? result.artifacts.length : 0}`);
    const structureValid = hasGuidance && hasChecklist && hasArtifacts && resultSuccess;
    console.log(`\n  Result: ${structureValid ? 'PASS' : 'FAIL'}`);
    console.log('\n' + '='.repeat(80));
}).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=task9-teach-command.test.js.map