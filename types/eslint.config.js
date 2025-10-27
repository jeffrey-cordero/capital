import pluginJs from "@eslint/js";
import pluginImportNewlines from "eslint-plugin-import-newlines";
import pluginSort from "eslint-plugin-simple-import-sort";
import pluginSpellCheck from "eslint-plugin-spellcheck";
import tseslint from "typescript-eslint";

export default [
   { files: ["**/*.{js,mjs,cjs,ts}"] },
   { ignores: ["node_modules/**", "dist/**"] },
   ...tseslint.configs.recommended,
   pluginJs.configs.recommended,
   {
      plugins: {
         "import-newlines": pluginImportNewlines,
         "simple-import-sort": pluginSort,
         "spellcheck": pluginSpellCheck
      },
      rules: {
         "@typescript-eslint/no-require-imports": "off",
         "@typescript-eslint/no-explicit-any": "off",
         "@typescript-eslint/no-unused-vars": "off",
         "no-var": "error",
         "prefer-const": "error",
         "comma-spacing": "error",
         "arrow-spacing": "error",
         "space-infix-ops": "error",
         semi: ["error", "always"],
         "consistent-return": "error",
         quotes: ["error", "double"],
         "no-trailing-spaces": "error",
         "eol-last": ["error", "never"],
         "no-duplicate-imports": "error",
         "import-newlines/enforce": "error",
         "comma-dangle": ["error", "never"],
         "no-mixed-spaces-and-tabs": ["error"],
         "spaced-comment": ["error", "always"],
         "simple-import-sort/imports": "error",
         "simple-import-sort/exports": "error",
         indent: ["error", 3, { SwitchCase: 1 }],
         "space-before-blocks": ["error", "always"],
         "object-curly-spacing": ["error", "always"],
         "keyword-spacing": ["error", { after: true }],
         "no-multiple-empty-lines": ["error", { max: 1 }],
         "brace-style": ["error", "1tbs", { "allowSingleLine": false }],
         "space-before-function-paren": ["error", "never"],
         "no-console": ["error", { allow: ["error"] }]
      }
   }
];

