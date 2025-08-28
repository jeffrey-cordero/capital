import pluginJs from "@eslint/js";
import pluginImports from "eslint-plugin-import-newlines";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginSort from "eslint-plugin-simple-import-sort";
import pluginSpellCheck from "eslint-plugin-spellcheck";
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
         "import-newlines": pluginImports,
         "simple-import-sort": pluginSort,
         "react-hooks": pluginReactHooks,
         spellcheck: pluginSpellCheck
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
         "jsx-quotes": ["error", "prefer-double"],
         indent: ["error", 3, {
            SwitchCase: 1,
            ignoredNodes: [
               "JSXElement",
               "JSXElement > *",
               "JSXAttribute",
               "JSXIdentifier",
               "JSXNamespacedName",
               "JSXMemberExpression",
               "JSXSpreadAttribute",
               "JSXExpressionContainer",
               "JSXOpeningElement",
               "JSXClosingElement",
               "JSXFragment",
               "JSXOpeningFragment",
               "JSXClosingFragment",
               "JSXText",
               "JSXEmptyExpression",
               "JSXSpreadChild"
            ]
         }],
         "space-before-blocks": ["error", "always"],
         "object-curly-spacing": ["error", "always"],
         "keyword-spacing": ["error", { after: true }],
         "no-multiple-empty-lines": ["error", { max: 1 }],
         "space-before-function-paren": ["error", "never"],
         "no-console": ["warn", { allow: ["warn", "error"] }],
         "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

         "react-hooks/rules-of-hooks": "error",
         "react-hooks/exhaustive-deps": "error",
         "react/jsx-uses-vars": "error",
         "react/jsx-sort-props": "error",
         "react/jsx-uses-react": "error",
         "react/jsx-indent": ["error", 3],
         "react/jsx-newline": ["error", { "prevent": true }],
         "react/jsx-indent-props": ["error", 3],
         "react/jsx-no-useless-fragment": "error",
         "react/jsx-boolean-value": ["error", "always"],
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