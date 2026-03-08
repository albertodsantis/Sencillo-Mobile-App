const fs = require("fs");
const path = require("path");

const projectRoot = fs.realpathSync(__dirname);

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": projectRoot,
          },
        },
      ],
    ],
  };
};
