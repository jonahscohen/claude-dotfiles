#!/usr/bin/env node

/**
 * Sidecoach Skill - /sidecoach command handler
 * Provides command-line interface to Sidecoach flows
 */

import { SidecoachCommand, SidecoachCommandConfig } from './sidecoach-command';

export interface SkillArgs {
  command?: string;
  args?: string[];
}

export async function sidecoachSkill(args: SkillArgs): Promise<void> {
  const commandHandler = new SidecoachCommand();

  // No command provided - show help
  if (!args.command) {
    const available = commandHandler.getAvailableCommands();
    console.log('\nSidecoach Design Intelligence Platform\n');
    console.log('Usage: /sidecoach <command> [args]\n');
    console.log('Available commands:\n');
    Object.entries(available).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(15)} - ${desc}`);
    });
    console.log('\nExample: /sidecoach craft <component-name>\n');
    return;
  }

  // Execute command
  const config: SidecoachCommandConfig = {
    command: args.command,
    args: args.args || []
  };

  try {
    const result = await commandHandler.execute(config);

    if (result.success) {
      console.log(`\n[OK] ${result.command} - SUCCESS\n`);
      console.log(`Flows executed: ${result.flowsExecuted.join(', ')}\n`);

      // Display results
      if (result.results && typeof result.results === 'object') {
        const r = result.results as Record<string, unknown>;
        if (r.message) {
          console.log(`Message: ${r.message}`);
        }
        if (r.guidance && Array.isArray(r.guidance)) {
          console.log('\nGuidance:');
          r.guidance.forEach((g: string) => console.log(`  * ${g}`));
        }
        if (r.artifacts && Array.isArray(r.artifacts)) {
          console.log(`\nArtifacts: ${r.artifacts.length} created`);
        }
      }
      console.log('');
    } else {
      console.log(`\n[ERROR] ${result.command} - FAILED\n`);
      if (result.error) {
        console.log(`Error: ${result.error}\n`);
      }
    }
  } catch (error) {
    console.error('\n[FATAL] Error:\n');
    console.error(error instanceof Error ? error.message : String(error));
    console.log('');
    process.exit(1);
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const skillArgs: SkillArgs = {
    command: args[0],
    args: args.slice(1)
  };

  sidecoachSkill(skillArgs).catch(error => {
    console.error('Fatal:', error);
    process.exit(1);
  });
}

export default sidecoachSkill;
