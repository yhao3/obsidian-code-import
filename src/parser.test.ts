import {
  parseImportDirectives,
  extractLines,
  getFileExtension,
  extensionToLanguage,
} from './parser';

describe('parseImportDirectives', () => {
  test('parses simple import', () => {
    const text = '@import "file.go"';
    const results = parseImportDirectives(text);

    expect(results).toHaveLength(1);
    expect(results[0].directive.filePath).toBe('file.go');
    expect(results[0].directive.lineBegin).toBeUndefined();
    expect(results[0].directive.lineEnd).toBeUndefined();
  });

  test('parses import with line_begin and line_end', () => {
    const text = '@import "file.go" {line_begin=4 line_end=14}';
    const results = parseImportDirectives(text);

    expect(results).toHaveLength(1);
    expect(results[0].directive.filePath).toBe('file.go');
    expect(results[0].directive.lineBegin).toBe(4);
    expect(results[0].directive.lineEnd).toBe(14);
  });

  test('parses import with only line_begin', () => {
    const text = '@import "test.py" {line_begin=10}';
    const results = parseImportDirectives(text);

    expect(results).toHaveLength(1);
    expect(results[0].directive.lineBegin).toBe(10);
    expect(results[0].directive.lineEnd).toBeUndefined();
  });

  test('parses import with negative line_end', () => {
    const text = '@import "test.md" {line_end=-4}';
    const results = parseImportDirectives(text);

    expect(results).toHaveLength(1);
    expect(results[0].directive.lineEnd).toBe(-4);
  });

  test('parses multiple imports', () => {
    const text = `
      @import "file1.go"
      @import "file2.py" {line_begin=5}
    `;
    const results = parseImportDirectives(text);

    expect(results).toHaveLength(2);
    expect(results[0].directive.filePath).toBe('file1.go');
    expect(results[1].directive.filePath).toBe('file2.py');
  });

  test('returns empty array for no imports', () => {
    const text = 'No imports here';
    const results = parseImportDirectives(text);

    expect(results).toHaveLength(0);
  });

  test('parses relative path with ../', () => {
    const text = '@import "../../other/file.go"';
    const results = parseImportDirectives(text);

    expect(results).toHaveLength(1);
    expect(results[0].directive.filePath).toBe('../../other/file.go');
  });
});

describe('extractLines', () => {
  const content = `line 0
line 1
line 2
line 3
line 4`;

  test('returns all lines when no range specified', () => {
    const result = extractLines(content);
    expect(result).toBe(content);
  });

  test('extracts from line_begin to end', () => {
    const result = extractLines(content, 2);
    expect(result).toBe('line 2\nline 3\nline 4');
  });

  test('extracts from start to line_end (exclusive)', () => {
    const result = extractLines(content, undefined, 3);
    expect(result).toBe('line 0\nline 1\nline 2');
  });

  test('extracts specific range', () => {
    const result = extractLines(content, 1, 4);
    expect(result).toBe('line 1\nline 2\nline 3');
  });

  test('handles negative line_end', () => {
    const result = extractLines(content, 0, -1);
    expect(result).toBe('line 0\nline 1\nline 2\nline 3');
  });

  test('handles negative line_end excluding multiple lines', () => {
    const result = extractLines(content, 0, -2);
    expect(result).toBe('line 0\nline 1\nline 2');
  });

  test('returns empty string when start >= end', () => {
    const result = extractLines(content, 5, 3);
    expect(result).toBe('');
  });
});

describe('getFileExtension', () => {
  test('returns extension for normal file', () => {
    expect(getFileExtension('file.go')).toBe('go');
    expect(getFileExtension('file.test.ts')).toBe('ts');
  });

  test('returns empty string for no extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
  });

  test('handles path with directories', () => {
    expect(getFileExtension('path/to/file.py')).toBe('py');
  });
});

describe('extensionToLanguage', () => {
  test('maps common extensions', () => {
    expect(extensionToLanguage('go')).toBe('go');
    expect(extensionToLanguage('py')).toBe('python');
    expect(extensionToLanguage('js')).toBe('javascript');
    expect(extensionToLanguage('ts')).toBe('typescript');
  });

  test('returns extension for unknown types', () => {
    expect(extensionToLanguage('xyz')).toBe('xyz');
  });

  test('returns text for empty extension', () => {
    expect(extensionToLanguage('')).toBe('text');
  });
});
