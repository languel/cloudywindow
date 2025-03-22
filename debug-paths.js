// Add this file to help debug path issues
console.log('== Path Debugging Information ==');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());

// Helper function to resolve paths
function resolveLocalPath(relativePath) {
  const path = require('path');
  const resolvedPath = path.resolve(__dirname, relativePath);
  console.log(`Resolving '${relativePath}' to: ${resolvedPath}`);
  return resolvedPath;
}

// Export the helper
module.exports = {
  resolveLocalPath
};

// Log common paths
console.log('Default HTML path:', resolveLocalPath('./default.html'));
console.log('== End Path Debug ==');
