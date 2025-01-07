import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
   { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
   { languageOptions: { globals: globals.browser } },
   ...tseslint.configs.recommended,
   pluginJs.configs.recommended,
   pluginReact.configs.flat.recommended,
   {
      settings: {
         react: {
            version: "detect"
         }
      },
      plugins: {
         "simple-import-sort": pluginSort
      },
      rules: {
         "no-undef": "off",
         "react/react-in-jsx-scope": "off",
         "@typescript-eslint/no-namespace": "off",
         "@typescript-eslint/no-explicit-any": "off",

         "no-var": "error",
         "prefer-const": "error",
         "comma-spacing": "error",
         "arrow-spacing": "error",
         "space-infix-ops": "error",
         "semi": ["error", "always"],
         "quotes": ["error", "double"],
         "no-trailing-spaces": "error",
         "eol-last": ["error", "never"],
         "comma-dangle": ["error", "never"],
         "no-mixed-spaces-and-tabs": ["error"],
         "spaced-comment": ["error", "always"],
         "simple-import-sort/imports": "error",
         "simple-import-sort/exports": "error",
         "jsx-quotes": ["error", "prefer-double"],
         "space-before-blocks": ["error", "always"],
         "object-curly-spacing": ["error", "always"],
         "indent": ["error", 3, { SwitchCase: 1 }],
         "keyword-spacing": ["error", { after: true }],
         "space-before-function-paren": ["error", "never"],
         "no-multiple-empty-lines": ["error", { max: 1 }],
         "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
         
         "react/jsx-uses-vars": "error",
         "react/jsx-uses-react": "error",
         "react/jsx-indent": ["error", 3],
         "react/jsx-indent-props": ["error", 3],
         "react/jsx-equals-spacing": ["error", "always"],
         "react/jsx-first-prop-new-line": [1, "multiline"],
         "react/jsx-max-props-per-line": ["error", { maximum: 1 }],
         "react/jsx-curly-spacing": ["error", { when: "always", children: true }],
         "react/jsx-closing-bracket-location": [
            "error",
            { nonEmpty: "line-aligned", selfClosing: "line-aligned" }
         ],
         "react/jsx-curly-newline": [
            "error",
            { multiline: "require", singleline: "forbid" }
         ]
      }
   }
];