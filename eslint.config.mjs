import coreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [".worktrees/**", "node_modules/**"],
  },
  ...coreWebVitals,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Allow _-prefixed vars/args to indicate intentionally unused
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_"
      }],
    }
  },
  {
    rules: {
      // Apostrophes in UI text are valid — disabling pedantic HTML-entity requirement
      "react/no-unescaped-entities": "off",
      // setState-in-effect is a valid pattern for SSR hydration guards, navigation cleanup,
      // and DOM measurement (useLayoutEffect for positioning). Disable globally.
      "react-hooks/set-state-in-effect": "off",
    }
  }
];

export default eslintConfig;
