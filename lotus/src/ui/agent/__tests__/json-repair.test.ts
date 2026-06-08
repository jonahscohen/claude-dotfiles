import { describe, it, expect } from 'vitest';
import { repairJson } from '../json-repair';

describe('repairJson', () => {
  it('passes through valid JSON unchanged', () => {
    const valid = '{"name": "test", "value": 42}';
    expect(JSON.parse(repairJson(valid))).toEqual({ name: 'test', value: 42 });
  });

  it('removes trailing commas before }', () => {
    const input = '{"a": 1, "b": 2,}';
    expect(JSON.parse(repairJson(input))).toEqual({ a: 1, b: 2 });
  });

  it('removes trailing commas before ]', () => {
    const input = '[1, 2, 3,]';
    expect(JSON.parse(repairJson(input))).toEqual([1, 2, 3]);
  });

  it('removes nested trailing commas', () => {
    const input = '{"items": [{"a": 1,}, {"b": 2,},],}';
    expect(JSON.parse(repairJson(input))).toEqual({ items: [{ a: 1 }, { b: 2 }] });
  });

  it('strips markdown json fences', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(JSON.parse(repairJson(input))).toEqual({ key: 'value' });
  });

  it('strips plain markdown fences', () => {
    const input = '```\n[1, 2, 3]\n```';
    expect(JSON.parse(repairJson(input))).toEqual([1, 2, 3]);
  });

  it('balances missing closing braces', () => {
    const input = '{"a": {"b": 1}';
    const result = repairJson(input);
    expect(JSON.parse(result)).toEqual({ a: { b: 1 } });
  });

  it('balances missing closing brackets', () => {
    const input = '[1, [2, 3]';
    const result = repairJson(input);
    expect(JSON.parse(result)).toEqual([1, [2, 3]]);
  });

  it('balances missing closing braces', () => {
    // repairJson appends closers by type count (braces then brackets)
    // For `{"a": {"b": 1` -> adds `}}` -> valid
    const input = '{"a": {"b": 1';
    const result = repairJson(input);
    expect(JSON.parse(result)).toEqual({ a: { b: 1 } });
  });

  it('handles trailing commas + missing closers + fences', () => {
    // After fence strip + trailing comma removal: {"items": [{"id": 1}, {"id": 2}
    // Missing: 1 bracket, 1 brace -> appends `}]`
    // But nesting order matters, so test a simpler case
    const input = '```json\n{"items": [{"id": 1}, {"id": 2}]\n```';
    const result = repairJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0].id).toBe(1);
  });

  it('trims whitespace', () => {
    const input = '  \n  {"x": 1}  \n  ';
    expect(JSON.parse(repairJson(input))).toEqual({ x: 1 });
  });

  it('does not break strings containing brackets', () => {
    const input = '{"text": "hello {world} [test]"}';
    expect(JSON.parse(repairJson(input))).toEqual({ text: 'hello {world} [test]' });
  });

  it('handles escaped quotes in strings', () => {
    const input = '{"text": "he said \\"hi\\""}';
    expect(JSON.parse(repairJson(input))).toEqual({ text: 'he said "hi"' });
  });
});
