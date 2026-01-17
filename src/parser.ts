/**
 * Parser for Foam @import syntax
 * Supports: @import "path/to/file" {line_begin=N line_end=M}
 */

export interface ImportDirective {
  filePath: string;
  lineBegin?: number;
  lineEnd?: number;
  raw: string;
}

export interface ParseResult {
  directive: ImportDirective;
  startIndex: number;
  endIndex: number;
}

// Regex to match @import "file" {options}
// Captures: (1) file path, (2) options block (optional)
const IMPORT_REGEX = /@import\s+"([^"]+)"(?:\s+\{([^}]*)\})?/g;

/**
 * Parse options string like "line_begin=4 line_end=14"
 */
function parseOptions(optionsStr: string | undefined): { lineBegin?: number; lineEnd?: number } {
  if (!optionsStr) {
    return {};
  }

  const result: { lineBegin?: number; lineEnd?: number } = {};

  // Match line_begin=N
  const lineBeginMatch = optionsStr.match(/line_begin\s*=\s*(-?\d+)/);
  if (lineBeginMatch?.[1]) {
    result.lineBegin = parseInt(lineBeginMatch[1], 10);
  }

  // Match line_end=N
  const lineEndMatch = optionsStr.match(/line_end\s*=\s*(-?\d+)/);
  if (lineEndMatch?.[1]) {
    result.lineEnd = parseInt(lineEndMatch[1], 10);
  }

  return result;
}

/**
 * Parse all @import directives from text
 */
export function parseImportDirectives(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  IMPORT_REGEX.lastIndex = 0;

  while ((match = IMPORT_REGEX.exec(text)) !== null) {
    const filePath = match[1] ?? '';
    const optionsStr = match[2];
    const options = parseOptions(optionsStr);

    results.push({
      directive: {
        filePath,
        lineBegin: options.lineBegin,
        lineEnd: options.lineEnd,
        raw: match[0],
      },
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return results;
}

/**
 * Extract lines from content based on line_begin and line_end (Foam-compatible, 0-based)
 * - line_begin: 0-based index (first line is 0)
 * - line_end: 0-based, exclusive. Supports negative values (-1 = exclude last line)
 */
export function extractLines(content: string, lineBegin?: number, lineEnd?: number): string {
  const lines = content.split('\n');
  const totalLines = lines.length;

  // Default values (0-based, exclusive end)
  let start = 0;
  let end = totalLines;

  if (lineBegin !== undefined) {
    start = lineBegin;
    if (start < 0) start = 0;
  }

  if (lineEnd !== undefined) {
    if (lineEnd < 0) {
      // Negative index: count from end
      // -1 means exclude last 1 line, so end = totalLines - 1
      // -4 means exclude last 4 lines, so end = totalLines - 4
      end = totalLines + lineEnd;
    } else {
      // Positive index: 0-based, exclusive
      end = lineEnd;
    }
  }

  // Clamp values
  if (start < 0) start = 0;
  if (end > totalLines) end = totalLines;
  if (start >= end) return '';

  return lines.slice(start, end).join('\n');
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filePath.length - 1) {
    return '';
  }
  return filePath.substring(lastDot + 1).toLowerCase();
}

/**
 * Map file extension to language for syntax highlighting
 */
export function extensionToLanguage(ext: string): string {
  const languageMap: Record<string, string> = {
    // Common languages
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    scala: 'scala',
    swift: 'swift',
    cs: 'csharp',
    fs: 'fsharp',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',

    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    vue: 'vue',
    svelte: 'svelte',

    // Data/Config
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    ini: 'ini',

    // Shell scripting
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'fish',
    ps1: 'powershell',
    bat: 'batch',
    cmd: 'batch',

    // Other
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    md: 'markdown',
    markdown: 'markdown',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    lua: 'lua',
    r: 'r',
    php: 'php',
    pl: 'perl',
    ex: 'elixir',
    exs: 'elixir',
    erl: 'erlang',
    clj: 'clojure',
    hs: 'haskell',
    ml: 'ocaml',
    vim: 'vim',
    tf: 'hcl',
    hcl: 'hcl',
  };

  return languageMap[ext] || ext || 'text';
}
