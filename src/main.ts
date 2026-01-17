import { Plugin, TFile, normalizePath } from 'obsidian';
import { parseImportDirectives, ParseResult } from './parser';
import {
  renderCodeBlock,
  createErrorElement,
  findTextNodesWithImport
} from './renderer';
import {
  CodeImportSettings,
  DEFAULT_SETTINGS,
  CodeImportSettingTab
} from './settings';

export default class CodeImportPlugin extends Plugin {
  settings: CodeImportSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    // Apply body class for wrap setting
    this.updateBodyClasses();

    // Register settings tab
    this.addSettingTab(new CodeImportSettingTab(this.app, this));

    // Register markdown post processor
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      await this.processImportDirectives(el, ctx.sourcePath);
    });
  }

  onunload() {
    // Remove body classes on unload
    document.body.removeClass('code-import-show-filename');
    document.body.removeClass('code-import-wrap-enabled');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<CodeImportSettings>);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateBodyClasses();
  }

  updateBodyClasses() {
    document.body.toggleClass('code-import-show-filename', this.settings.showFileName);
    document.body.toggleClass('code-import-wrap-enabled', this.settings.wrapCode);
  }

  /**
   * Process @import directives in the rendered element
   */
  private async processImportDirectives(el: HTMLElement, sourcePath: string): Promise<void> {
    // Find all text nodes that might contain @import
    const textNodes = findTextNodesWithImport(el);

    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const parseResults = parseImportDirectives(text);

      if (parseResults.length === 0) {
        continue;
      }

      // Process directives in reverse order to maintain correct indices
      await this.replaceImportDirectives(textNode, parseResults, sourcePath);
    }
  }

  /**
   * Replace @import directives in a text node with rendered code blocks
   */
  private async replaceImportDirectives(
    textNode: Text,
    parseResults: ParseResult[],
    sourcePath: string
  ): Promise<void> {
    const text = textNode.textContent || '';
    const parent = textNode.parentElement;

    if (!parent) {
      return;
    }

    // Create a document fragment to hold the new content
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const result of parseResults) {
      // Add text before this directive
      if (result.startIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, result.startIndex);
        fragment.appendChild(document.createTextNode(beforeText));
      }

      // Create container for the code block
      const container = document.createElement('div');
      container.className = 'code-import-container';

      // Resolve the file path
      const resolvedPath = this.resolveFilePath(result.directive.filePath, sourcePath);

      // Try to read and render the file
      try {
        const content = await this.readFile(resolvedPath);

        if (content === null) {
          container.appendChild(
            createErrorElement(
              `File not found: ${result.directive.filePath}`,
              result.directive
            )
          );
        } else {
          await renderCodeBlock(
            this.app,
            container,
            content,
            result.directive,
            {
              showFileName: this.settings.showFileName,
              wrapCode: this.settings.wrapCode,
            },
            this
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        container.appendChild(
          createErrorElement(
            `Error reading file: ${errorMessage}`,
            result.directive
          )
        );
      }

      fragment.appendChild(container);
      lastIndex = result.endIndex;
    }

    // Add remaining text after the last directive
    if (lastIndex < text.length) {
      const afterText = text.substring(lastIndex);
      fragment.appendChild(document.createTextNode(afterText));
    }

    // Replace the original text node with our fragment
    parent.replaceChild(fragment, textNode);
  }

  /**
   * Resolve a file path relative to the source file
   */
  private resolveFilePath(filePath: string, sourcePath: string): string {
    // If it's already an absolute path (starts with /), use it directly
    if (filePath.startsWith('/')) {
      return normalizePath(filePath.substring(1));
    }

    // Get the directory of the source file
    const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));

    // Resolve relative path and handle ..
    let combinedPath: string;
    if (sourceDir) {
      combinedPath = `${sourceDir}/${filePath}`;
    } else {
      combinedPath = filePath;
    }

    // Manually resolve . and .. in the path
    const parts = combinedPath.split('/');
    const resolved: string[] = [];

    for (const part of parts) {
      if (part === '' || part === '.') {
        continue;
      } else if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    return normalizePath(resolved.join('/'));
  }

  /**
   * Read file content from vault
   */
  private async readFile(path: string): Promise<string | null> {
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!(file instanceof TFile)) {
      return null;
    }

    return await this.app.vault.cachedRead(file);
  }
}
