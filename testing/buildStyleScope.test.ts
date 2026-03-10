import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'bun:test';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

const buildTargets = [
  {
    name: 'library',
    command: ['vite', 'build'],
    cssPath: join(projectRoot, 'dist', 'client', 'style.css'),
  },
  {
    name: 'standalone',
    command: ['vite', 'build', '--mode', 'standalone'],
    cssPath: join(projectRoot, 'dist', 'standalone', 'vowel-voice-widget.css'),
  },
] as const;

function runBuild(name: string, command: readonly string[]): void {
  const result = spawnSync('bunx', command, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status === 0) {
    return;
  }

  throw new Error(
    [
      `Failed to build ${name} output.`,
      `Command: bunx ${command.join(' ')}`,
      result.stdout?.trim(),
      result.stderr?.trim(),
    ]
      .filter(Boolean)
      .join('\n\n'),
  );
}

function readBuiltCss(cssPath: string): string {
  if (!existsSync(cssPath)) {
    throw new Error(`Expected built CSS at ${cssPath}`);
  }

  return readFileSync(cssPath, 'utf8');
}

function expectScopedCss(css: string): void {
  expect(css).toMatch(/\.vowel-ui\s*\{\s*--font-sans:/);
  expect(css).toMatch(/\.fixed\.vowel-ui\s*,\s*\.vowel-ui\s+\.fixed\s*\{\s*position:\s*fixed\s*;?\s*\}/);
  expect(css).not.toContain(':root');
  expect(css).not.toContain(':host');
  expect(css).not.toMatch(/(^|[},])\s*\.fixed\s*\{\s*position:\s*fixed\s*;?\s*\}/);
  expect(css).not.toMatch(/(^|[},])\s*\.container\s*\{\s*width:\s*100%\s*;?\s*\}/);
}

for (const target of buildTargets) {
  runBuild(target.name, target.command);
}

describe('built CSS scoping', () => {
  test('scopes library CSS to .vowel-ui', () => {
    const css = readBuiltCss(buildTargets[0].cssPath);

    expectScopedCss(css);
  });

  test('scopes standalone CSS to .vowel-ui', () => {
    const css = readBuiltCss(buildTargets[1].cssPath);

    expectScopedCss(css);
  });
});
