const { verbose, collectCoverage } = require("./jest.config.int");

module.exports = {
    projects: [
    '<rootDir>/jest.config.unit.js',
    '<rootDir>/jest.config.int.js',
    ],

  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
collectCoverageFrom: ["src/**/*Service.ts"],
verbose: true,
collectCoverage: true,

};
