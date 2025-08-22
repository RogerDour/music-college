module.exports = {
  testEnvironment: "node",
  testTimeout: 25000,
  passWithNoTests: true,
  forceExit: true,          // <- ensure Jest exits even if something lingers
  detectOpenHandles: false  // <- optional; set true if you want to debug handles
};
