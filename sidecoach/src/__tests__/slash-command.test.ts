import { parseSlashCommand, getAvailableCommands } from '../slash-command-router';

console.log('\nSlash Command Routing Test Suite\n');
console.log('='.repeat(80));

// Test 1: Parse research command
const test1 = parseSlashCommand('/sidecoach research Button');
console.log('\n[Test 1] Parse "/sidecoach research Button"');
console.log(`  isCommand: ${test1.isCommand}`);
console.log(`  command: ${test1.command}`);
console.log(`  flowIds count: ${test1.flowIds.length}`);
console.log(`  Result: ${test1.isCommand && test1.command === 'research' && test1.flowIds.length === 7 ? 'PASS' : 'FAIL'}`);

// Test 2: Parse implement command
const test2 = parseSlashCommand('/sidecoach implement Page');
console.log('\n[Test 2] Parse "/sidecoach implement Page"');
console.log(`  isCommand: ${test2.isCommand}`);
console.log(`  command: ${test2.command}`);
console.log(`  flowIds count: ${test2.flowIds.length}`);
console.log(`  Result: ${test2.isCommand && test2.command === 'implement' && test2.flowIds.length === 7 ? 'PASS' : 'FAIL'}`);

// Test 3: Parse review command
const test3 = parseSlashCommand('/review Button');
console.log('\n[Test 3] Parse "/review Button" (shorthand)');
console.log(`  isCommand: ${test3.isCommand}`);
console.log(`  command: ${test3.command}`);
console.log(`  flowIds count: ${test3.flowIds.length}`);
console.log(`  Result: ${test3.isCommand && test3.command === 'review' && test3.flowIds.length === 10 ? 'PASS' : 'FAIL'}`);

// Test 4: Parse clone command
const test4 = parseSlashCommand('/clone Modal');
console.log('\n[Test 4] Parse "/clone Modal"');
console.log(`  isCommand: ${test4.isCommand}`);
console.log(`  command: ${test4.command}`);
console.log(`  flowIds count: ${test4.flowIds.length}`);
console.log(`  Result: ${test4.isCommand && test4.command === 'clone' && test4.flowIds.length === 2 ? 'PASS' : 'FAIL'}`);

// Test 5: Parse constrain command
const test5 = parseSlashCommand('/constrain Modal from design');
console.log('\n[Test 5] Parse "/constrain Modal from design"');
console.log(`  isCommand: ${test5.isCommand}`);
console.log(`  command: ${test5.command}`);
console.log(`  target: ${test5.target}`);
console.log(`  Result: ${test5.isCommand && test5.command === 'constrain' && test5.flowIds.length === 2 ? 'PASS' : 'FAIL'}`);

// Test 6: Parse migrate command
const test6 = parseSlashCommand('/migrate');
console.log('\n[Test 6] Parse "/migrate"');
console.log(`  isCommand: ${test6.isCommand}`);
console.log(`  command: ${test6.command}`);
console.log(`  flowIds count: ${test6.flowIds.length}`);
console.log(`  Result: ${test6.isCommand && test6.command === 'migrate' && test6.flowIds.length === 2 ? 'PASS' : 'FAIL'}`);

// Test 7: Parse refactor command
const test7 = parseSlashCommand('/refactor');
console.log('\n[Test 7] Parse "/refactor"');
console.log(`  isCommand: ${test7.isCommand}`);
console.log(`  command: ${test7.command}`);
console.log(`  flowIds count: ${test7.flowIds.length}`);
console.log(`  Result: ${test7.isCommand && test7.command === 'refactor' && test7.flowIds.length === 2 ? 'PASS' : 'FAIL'}`);

// Test 8: Parse type command
const test8 = parseSlashCommand('/type');
console.log('\n[Test 8] Parse "/type"');
console.log(`  isCommand: ${test8.isCommand}`);
console.log(`  command: ${test8.command}`);
console.log(`  flowIds count: ${test8.flowIds.length}`);
console.log(`  Result: ${test8.isCommand && test8.command === 'type' && test8.flowIds.length === 1 ? 'PASS' : 'FAIL'}`);

// Test 9: Parse motion command
const test9 = parseSlashCommand('/motion');
console.log('\n[Test 9] Parse "/motion"');
console.log(`  isCommand: ${test9.isCommand}`);
console.log(`  command: ${test9.command}`);
console.log(`  flowIds count: ${test9.flowIds.length}`);
console.log(`  Result: ${test9.isCommand && test9.command === 'motion' && test9.flowIds.length === 1 ? 'PASS' : 'FAIL'}`);

// Test 10: Parse reference command
const test10 = parseSlashCommand('/reference');
console.log('\n[Test 10] Parse "/reference"');
console.log(`  isCommand: ${test10.isCommand}`);
console.log(`  command: ${test10.command}`);
console.log(`  flowIds count: ${test10.flowIds.length}`);
console.log(`  Result: ${test10.isCommand && test10.command === 'reference' && test10.flowIds.length === 1 ? 'PASS' : 'FAIL'}`);

// Test 11: Parse comprehensive command
const test11 = parseSlashCommand('/comprehensive');
console.log('\n[Test 11] Parse "/comprehensive"');
console.log(`  isCommand: ${test11.isCommand}`);
console.log(`  command: ${test11.command}`);
console.log(`  flowIds count: ${test11.flowIds.length}`);
console.log(`  Result: ${test11.isCommand && test11.command === 'comprehensive' && test11.flowIds.length === 1 ? 'PASS' : 'FAIL'}`);

// Test 12: Parse list command
const test12 = parseSlashCommand('/list');
console.log('\n[Test 12] Parse "/list"');
console.log(`  isCommand: ${test12.isCommand}`);
console.log(`  command: ${test12.command}`);
console.log(`  flowIds length: ${test12.flowIds.length}`);
console.log(`  Result: ${test12.isCommand && test12.command === 'list' ? 'PASS' : 'FAIL'}`);

// Test 13: Parse unknown command
const test13 = parseSlashCommand('/unknown');
console.log('\n[Test 13] Parse "/unknown"');
console.log(`  isCommand: ${test13.isCommand}`);
console.log(`  reason: ${test13.reason}`);
console.log(`  Result: ${!test13.isCommand ? 'PASS' : 'FAIL'}`);

// Test 14: Non-slash input
const test14 = parseSlashCommand('make a button');
console.log('\n[Test 14] Parse "make a button" (no slash)');
console.log(`  isCommand: ${test14.isCommand}`);
console.log(`  reason: ${test14.reason}`);
console.log(`  Result: ${!test14.isCommand ? 'PASS' : 'FAIL'}`);

// Test 15: Get available commands - verify all 11 present
const commands = getAvailableCommands();
console.log('\n[Test 15] Get available commands - verify all 11 commands present');
console.log(`  Commands found: ${Object.keys(commands).length}`);
const expectedCommands = ['research', 'implement', 'review', 'clone', 'constrain', 'migrate', 'refactor', 'type', 'motion', 'reference', 'comprehensive', 'list'];
const hasAllCommands = expectedCommands.every(
  cmd => commands[cmd as keyof typeof commands]
);
console.log(`  Expected: ${expectedCommands.join(', ')}`);
console.log(`  Result: ${hasAllCommands ? 'PASS' : 'FAIL'}`);

// Summary
console.log('\n' + '='.repeat(80));
const results = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10, test11, test12, !test13.isCommand, !test14.isCommand, hasAllCommands];
const passCount = results.filter(Boolean).length;
console.log(`\nResults: ${passCount} passed, ${15 - passCount} failed out of 15 tests`);
console.log(`Success rate: ${((passCount / 15) * 100).toFixed(1)}%\n`);
