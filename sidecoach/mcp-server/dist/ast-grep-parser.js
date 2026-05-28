"use strict";
// Parser for ast-grep CLI `--json=stream` output.
//
// The stream format is one JSON object per line, each describing a single
// match. We tolerate blank lines and lines that fail to parse (the CLI may
// emit informational records that don't conform to the match shape). Bounded
// by maxResults and per-match text cap so a runaway pattern can't fill the
// MCP response.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAstGrepStream = parseAstGrepStream;
const TRUNCATION_SUFFIX = '...[truncated]';
/**
 * Parse a chunk of ast-grep --json=stream output into structured matches.
 *
 * The CLI's JSON shape (verified against ast-grep 0.30+):
 * ```
 * {
 *   "text": "<matched code>",
 *   "range": {"start": {"line": 0, "column": 0}, "end": {"line": 1, "column": 5}},
 *   "file": "<path>",
 *   "language": "TypeScript",
 *   ...
 * }
 * ```
 * Lines are 0-indexed in the CLI; we convert to 1-indexed for human-readable output.
 */
function parseAstGrepStream(raw, opts) {
    const lines = raw.split(/\r?\n/);
    const matches = [];
    let linesSkipped = 0;
    let extraMatchesAfterCap = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
            linesSkipped += 1;
            continue;
        }
        let parsed;
        try {
            parsed = JSON.parse(trimmed);
        }
        catch {
            linesSkipped += 1;
            continue;
        }
        if (!parsed || typeof parsed !== 'object') {
            linesSkipped += 1;
            continue;
        }
        const obj = parsed;
        const range = obj.range;
        if (typeof obj.file !== 'string' ||
            typeof obj.text !== 'string' ||
            !range ||
            !range.start ||
            !range.end ||
            typeof range.start.line !== 'number' ||
            typeof range.end.line !== 'number') {
            linesSkipped += 1;
            continue;
        }
        if (matches.length >= opts.maxResults) {
            extraMatchesAfterCap = true;
            continue;
        }
        matches.push({
            file: relativizePath(obj.file, opts.projectRoot),
            startLine: Number(range.start.line) + 1,
            endLine: Number(range.end.line) + 1,
            startColumn: typeof range.start.column === 'number' ? Number(range.start.column) : 0,
            endColumn: typeof range.end.column === 'number' ? Number(range.end.column) : 0,
            text: capText(obj.text, opts.maxMatchTextChars),
            language: typeof obj.language === 'string' ? obj.language : undefined,
        });
    }
    return {
        matches,
        linesSeen: lines.length,
        linesSkipped,
        truncated: extraMatchesAfterCap,
    };
}
/**
 * Relativize an absolute path against the project root if it lives inside.
 * If outside (or no root provided), return as-is. This keeps output compact
 * without hiding the fact that ast-grep can emit absolute paths.
 */
function relativizePath(filePath, projectRoot) {
    if (!projectRoot)
        return filePath;
    if (!filePath.startsWith(projectRoot))
        return filePath;
    const rel = filePath.slice(projectRoot.length);
    return rel.startsWith('/') ? rel.slice(1) : rel;
}
function capText(text, max) {
    if (text.length <= max)
        return text;
    return text.slice(0, max - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
}
//# sourceMappingURL=ast-grep-parser.js.map