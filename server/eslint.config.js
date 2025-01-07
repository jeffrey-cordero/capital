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
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
   }
};