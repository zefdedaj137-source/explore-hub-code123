import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "build", "src/integrations/supabase/types.ts", "src/integrations/supabase/types-new.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // react-hooks v7 new rules — disabled for existing codebase compatibility.
      // These are experimental rules that flag common valid patterns (e.g. reading
      // localStorage → setState in an effect). Revisit when the codebase is refactored.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    // Disable react-refresh warnings for UI components (shadcn/ui)
    files: ["src/components/ui/**/*.{ts,tsx}", "src/contexts/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Supabase Edge Functions (Deno runtime)
    files: ["supabase/functions/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "no-undef": "off",
    },
  },
);
