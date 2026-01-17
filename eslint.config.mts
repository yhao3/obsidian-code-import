import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";
import jest from "eslint-plugin-jest";

export default tseslint.config(
	// Global ignores
	globalIgnores([
		"node_modules",
		"dist",
		"main.js",
		"*.config.js",
		"*.config.mjs",
		"version-bump.mjs",
		"versions.json",
	]),
	// Base config for all TS files
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	// Obsidian plugin rules
	...obsidianmd.configs.recommended,
	// Test files: use separate tsconfig, Jest plugin
	{
		files: ["**/*.test.ts"],
		languageOptions: {
			parserOptions: {
				projectService: false,
				project: "./tsconfig.test.json",
			},
			globals: {
				...globals.jest,
			},
		},
		plugins: {
			jest,
		},
		rules: {
			...jest.configs.recommended.rules,
		},
	},
);
