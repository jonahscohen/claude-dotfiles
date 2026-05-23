#!/usr/bin/env node
/**
 * Sidecoach Skill - /sidecoach command handler
 * Provides command-line interface to Sidecoach flows
 */
export interface SkillArgs {
    command?: string;
    args?: string[];
}
export declare function sidecoachSkill(args: SkillArgs): Promise<void>;
export default sidecoachSkill;
//# sourceMappingURL=sidecoach-skill.d.ts.map