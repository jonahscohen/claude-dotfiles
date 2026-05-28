/** Shape of a single ast-grep match (the subset we surface). */
export interface AstGrepMatch {
    file: string;
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
    text: string;
    language?: string;
}
export interface ParseOptions {
    /** Max matches to collect before stopping. */
    maxResults: number;
    /** Per-match text-length cap. Text longer than this is truncated + suffixed with "...". */
    maxMatchTextChars: number;
    /** Project root for path-relativization. Optional - if absent, paths are returned as the CLI emitted them. */
    projectRoot?: string;
}
export interface ParseResult {
    matches: AstGrepMatch[];
    /** Lines the parser was given. */
    linesSeen: number;
    /** Lines that didn't JSON.parse (informational records, blank lines, etc.). */
    linesSkipped: number;
    /** True when matches.length === maxResults AND there were more matches in stream. */
    truncated: boolean;
}
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
export declare function parseAstGrepStream(raw: string, opts: ParseOptions): ParseResult;
//# sourceMappingURL=ast-grep-parser.d.ts.map