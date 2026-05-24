#!/usr/bin/env node

let generateBuildReport, renderBuildReportMarkdown;
try {
  ({ generateBuildReport, renderBuildReportMarkdown } = require('../dist/build-report-aggregator'));
} catch (err) {
  console.error('sidecoach-build-report: failed to load ../dist/build-report-aggregator. Run `npm run build` in sidecoach/ first.');
  console.error(err.message);
  process.exit(2);
}

function usage() {
  console.error('Usage: sidecoach-build-report [--from-stdin] [--since <iso>] [--composite <id>] [--output-file <path>] [--json] [--include-info]');
}

function parseArgs(argv) {
  const args = { fromStdin: false, since: null, composite: null, outputFile: null, json: false, includeInfo: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from-stdin') args.fromStdin = true;
    else if (a === '--json') args.json = true;
    else if (a === '--include-info') args.includeInfo = true;
    else if (a === '--since') args.since = argv[++i];
    else if (a === '--composite') args.composite = argv[++i];
    else if (a === '--output-file') args.outputFile = argv[++i];
    else if (a === '-h' || a === '--help') { usage(); process.exit(0); }
    else { console.error(`unknown arg: ${a}`); usage(); process.exit(1); }
  }
  return args;
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

(async () => {
  const args = parseArgs(process.argv.slice(2));

  if (!args.fromStdin && !args.since) {
    console.error('sidecoach-build-report: must specify --from-stdin OR --since');
    usage();
    process.exit(1);
  }

  let input;
  if (args.fromStdin) {
    const raw = await readStdin();
    try {
      input = JSON.parse(raw);
    } catch (err) {
      console.error(`invalid JSON on stdin: ${err.message}`);
      process.exit(1);
    }
  } else {
    // Memory-input mode - T7 wires this fully.
    input = { source: 'memory', memoryPaths: [], composite: args.composite || undefined };
  }

  let report;
  try {
    report = generateBuildReport(input, { includeInfo: args.includeInfo });
  } catch (err) {
    console.error(`aggregator error: ${err.message}`);
    process.exit(2);
  }

  const output = args.json ? JSON.stringify(report, null, 2) : renderBuildReportMarkdown(report);

  if (args.outputFile) {
    const fs = require('fs');
    fs.writeFileSync(args.outputFile, output, 'utf8');
  } else {
    process.stdout.write(output);
    if (!args.json) process.stdout.write('\n');
  }

  process.exit(0);
})();
