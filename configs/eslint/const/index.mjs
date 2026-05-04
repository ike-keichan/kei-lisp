export const RULE_LEVEL = {
  ERROR: 'error',
  WARN: 'warn',
  OFF: 'off',
};

export const FILES = {
  // TODO: TS 移行中は ['src/**/*.js', 'src/**/*.ts'] に変更し、移行完了後は ['src/**/*.ts'] のみにする
  SRC: ['src/**/*.js'],
  CONFIG: ['*.js', '*.mjs'],
  TEST: ['tests/**/*.test.ts'],
};
