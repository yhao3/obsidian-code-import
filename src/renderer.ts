import { MarkdownRenderer, App, Component } from 'obsidian';
import { ImportDirective, extractLines, getFileExtension, extensionToLanguage } from './parser';
import type { LineNumberBase } from './settings';

export interface RenderOptions {
  showFileName: boolean;
  wrapCode: boolean;
  lineNumberBase: LineNumberBase;
}

/**
 * Create an error element for display
 */
export function createErrorElement(message: string, directive: ImportDirective): HTMLElement {
  const container = activeDocument.createElement('div');
  container.className = 'code-import-error';

  const header = activeDocument.createElement('div');
  header.className = 'code-import-error-header';
  header.textContent = 'Import error';

  const details = activeDocument.createElement('div');
  details.className = 'code-import-error-details';
  details.textContent = message;

  const source = activeDocument.createElement('div');
  source.className = 'code-import-error-source';
  source.textContent = directive.raw;

  container.appendChild(header);
  container.appendChild(details);
  container.appendChild(source);

  return container;
}

/**
 * Create a loading element
 */
export function createLoadingElement(): HTMLElement {
  const container = activeDocument.createElement('div');
  container.className = 'code-import-loading';
  container.textContent = 'Loading...';
  return container;
}

/**
 * Render code content with syntax highlighting
 */
export async function renderCodeBlock(
  app: App,
  container: HTMLElement,
  content: string,
  directive: ImportDirective,
  options: RenderOptions,
  component: Component
): Promise<void> {
  const ext = getFileExtension(directive.filePath);
  const language = extensionToLanguage(ext);

  // Convert 1-based line numbers to 0-based for extractLines
  let internalBegin = directive.lineBegin;
  let internalEnd = directive.lineEnd;

  if (options.lineNumberBase === '1') {
    // Convert 1-based begin to 0-based: line 1 → index 0
    if (internalBegin !== undefined) {
      internalBegin = internalBegin - 1;
    }
    // 1-based inclusive end N == 0-based exclusive end N, so no adjustment needed
    // Negative values remain unchanged (they count from the end)
  }

  // Extract lines if specified
  const extractedContent = extractLines(content, internalBegin, internalEnd);

  // Create wrapper for visual styling
  const wrapper = activeDocument.createElement('div');
  wrapper.className = 'code-import-block';

  // Always add file header (visibility controlled by CSS via body class)
  const header = activeDocument.createElement('div');
  header.className = 'code-import-header';

  const fileName = activeDocument.createElement('span');
  fileName.className = 'code-import-filename';
  fileName.textContent = directive.filePath;

  header.appendChild(fileName);

  // Add line range info if specified
  if (directive.lineBegin !== undefined || directive.lineEnd !== undefined) {
    const lineInfo = activeDocument.createElement('span');
    lineInfo.className = 'code-import-line-info';

    const parts: string[] = [];
    if (directive.lineBegin !== undefined) {
      if (options.lineNumberBase === '1') {
        // Already 1-based, display as-is
        parts.push(`L${directive.lineBegin}`);
      } else {
        // Convert 0-based to 1-based for display
        parts.push(`L${directive.lineBegin + 1}`);
      }
    }
    if (directive.lineEnd !== undefined) {
      // Negative values show as-is (e.g., -1 means "exclude last")
      // Positive values: display as-is for both modes (0-based exclusive end == 1-based inclusive end)
      parts.push(`L${directive.lineEnd}`);
    }
    lineInfo.textContent = parts.join('-');

    header.appendChild(lineInfo);
  }

  wrapper.appendChild(header);

  // Use Obsidian's markdown renderer for code blocks directly
  // This leverages Prism.js for syntax highlighting
  const codeBlockMd = '```' + language + '\n' + extractedContent + '\n```';

  await MarkdownRenderer.render(
    app,
    codeBlockMd,
    wrapper,
    '',
    component
  );

  container.appendChild(wrapper);
}

/**
 * Find all text nodes in an element that might contain @import directives
 */
export function findTextNodesWithImport(element: HTMLElement): Text[] {
  const textNodes: Text[] = [];

  const walker = activeDocument.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip nodes inside code blocks or pre elements
        const parent = node.parentElement;
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'code' || tagName === 'pre') {
            return NodeFilter.FILTER_REJECT;
          }
          // Also check ancestors
          let ancestor = parent.parentElement;
          while (ancestor) {
            const ancestorTag = ancestor.tagName.toLowerCase();
            if (ancestorTag === 'code' || ancestorTag === 'pre') {
              return NodeFilter.FILTER_REJECT;
            }
            ancestor = ancestor.parentElement;
          }
        }

        // Check if text contains @import
        if (node.textContent && node.textContent.includes('@import')) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    }
  );

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }
  return textNodes;
}
