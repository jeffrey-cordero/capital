const pluginSort = require("eslint-plugin-simple-import-sort");

module.exports = {
   plugins: {
      "simple-import-sort": pluginSort
   },
   rules: {
      "no-var": "error",
      "prefer-const": "error",
      "comma-spacing": "error",
      "arrow-spacing": "error",
      "space-infix-ops": "error",
      "semi": ["error", "always"],
      "consistent-return": "error",
      "quotes": ["error", "double"],
      "no-trailing-spaces": "error",
      "eol-last": ["error", "never"],
      "no-duplicate-imports": "error",
      "comma-dangle": ["error", "never"],
      "no-mixed-spaces-and-tabs": ["error"],
      "spaced-comment": ["error", "always"],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "indent": ["error", 3, { SwitchCase: 1 }],
      "space-before-blocks": ["error", "always"],
      "object-curly-spacing": ["error", "always"],
      "keyword-spacing": ["error", { after: true }],
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "space-before-function-paren": ["error", "never"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
   }
};