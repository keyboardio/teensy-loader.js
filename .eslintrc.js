module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended"
  ],
  parser: "@babel/eslint-parser",
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: "module"
  },
  env: {
    es6: true,
    browser: true,
    node: true
  },
  rules: {
    "no-console": 0
  }
};
