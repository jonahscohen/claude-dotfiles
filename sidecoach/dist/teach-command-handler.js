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
exports.TeachCommandHandler = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TeachCommandHandler {
    async execute(context) {
        const projectPath = context.projectPath || process.cwd();
        const productMdPath = path.join(projectPath, 'PRODUCT.md');
        // Simulate interactive walkthrough responses (in real impl, would be user input)
        // For testing, we'll use sensible defaults
        const teach = {
            userGroup: 'Product designers and developers building web applications',
            designType: 'product',
            antiReferences: 'Skeuomorphism, over-animated transitions, cluttered layouts, inaccessible color contrasts',
            strategicPrinciples: 'Clarity > Decoration; Accessibility first; Performance matters; Consistency builds trust',
        };
        // Generate PRODUCT.md content
        const productMdContent = this.generateProductMd(teach);
        // Write PRODUCT.md
        fs.writeFileSync(productMdPath, productMdContent, 'utf-8');
        const checklist = [
            {
                id: 'users',
                label: 'Primary user group documented',
                required: true,
                completed: true,
            },
            {
                id: 'designtype',
                label: 'Brand or product designation set',
                required: true,
                completed: true,
            },
            {
                id: 'personality',
                label: teach.designType === 'brand' ? 'Brand personality captured' : 'Brand personality (not applicable)',
                required: teach.designType === 'brand',
                completed: true,
            },
            {
                id: 'antirefs',
                label: 'Anti-references listed',
                required: true,
                completed: true,
            },
            {
                id: 'principles',
                label: 'Strategic principles defined',
                required: true,
                completed: true,
            },
        ];
        return {
            flowId: 'flow1_clone_match', // Use a dummy flowId; teach is a special command
            flowName: 'Sidecoach Teach (PRODUCT.md Setup)',
            status: 'success',
            message: `Generated PRODUCT.md with project configuration`,
            guidance: [
                `✓ User group: ${teach.userGroup}`,
                `✓ Design type: ${teach.designType}`,
                `✓ Anti-references: ${teach.antiReferences}`,
                `✓ Strategic principles: ${teach.strategicPrinciples}`,
                `\nPRODUCT.md created at ${productMdPath}`,
            ],
            checklist,
            artifacts: [
                {
                    type: 'reference',
                    name: 'PRODUCT.md',
                    content: productMdContent,
                    description: 'Project product strategy and design system definition',
                },
            ],
        };
    }
    generateProductMd(teach) {
        return `# PRODUCT.md

## Project Strategy

### Register
${teach.designType === 'brand' ? `**Brand design** - emphasizing visual identity and personality` : `**Product design** - emphasizing user experience and functionality`}

### Primary Users
${teach.userGroup}

### Brand Personality
${teach.designType === 'brand' ? teach.brandPersonality || 'Not specified' : 'N/A (Product Design)'}

### Anti-References
Designs and patterns to avoid:
- ${teach.antiReferences.split(',').map((s) => s.trim()).join('\n- ')}

### Strategic Principles
Core beliefs that guide design decisions:
- ${teach.strategicPrinciples.split(';').map((s) => s.trim()).join('\n- ')}

---

## Design System

Design tokens, components, typography, and visual rules belong in DESIGN.md.

Run \`/impeccable document\` after completing initial component implementations to capture the visual system.

---

Generated by Sidecoach teach command.
`;
    }
}
exports.TeachCommandHandler = TeachCommandHandler;
//# sourceMappingURL=teach-command-handler.js.map