module.exports = {
  env: { browser: true, es2022: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["import"],
  rules: {
    "no-unused-vars": "warn",
    "import/no-unused-modules": ["warn", { unusedExports: true }],
  },
};
