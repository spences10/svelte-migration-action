import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['test/**/*', 'node_modules/**/*', 'dist/**/*'],
		environment: 'node',
		globals: true,
	},
});
