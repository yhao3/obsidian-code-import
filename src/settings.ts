import { App, PluginSettingTab, Setting } from 'obsidian';
import type CodeImportPlugin from './main';

export interface CodeImportSettings {
  showFileName: boolean;
  wrapCode: boolean;
}

export const DEFAULT_SETTINGS: CodeImportSettings = {
  showFileName: true,
  wrapCode: false,
};

export class CodeImportSettingTab extends PluginSettingTab {
  plugin: CodeImportPlugin;

  constructor(app: App, plugin: CodeImportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Show file name')
      .setDesc('Display the file name above imported code blocks')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFileName)
          .onChange(async (value) => {
            this.plugin.settings.showFileName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Wrap code')
      .setDesc('Wrap long lines instead of horizontal scrolling')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.wrapCode)
          .onChange(async (value) => {
            this.plugin.settings.wrapCode = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
