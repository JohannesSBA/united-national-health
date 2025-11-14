import next from "eslint-config-next";
import prettierRecommended from "eslint-plugin-prettier/recommended";

const eslintConfig = [
  ...next,
  {
    ...prettierRecommended,
    name: "custom:prettier",
    rules: {
      ...prettierRecommended.rules,
      "prettier/prettier": [
        "error",
        {
          trailingComma: "all",
          semi: true,
          tabWidth: 2,
          singleQuote: false,
          printWidth: 80,
          endOfLine: "auto",
          arrowParens: "always",
        },
        {
          usePrettierrc: false,
        },
      ],
    },
  },
  {
    name: "custom:ignores",
    ignores: [
      "generated/**",
      "**/.turbo/**",
      "**/*.d.ts",
      "next.config.ts",
      "jest.config.ts",
      "webpack.config.ts",
    ],
  },
];

export default eslintConfig;
