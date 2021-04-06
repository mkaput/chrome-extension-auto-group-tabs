module.exports = {
  clearMocks: true,
  coverageProvider: "v8",
  transform: {
    "^.+\\.[jt]sx?$": "esbuild-jest",
  },
};
