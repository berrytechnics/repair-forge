const path = require('path');
const fs = require('fs');

module.exports = (request, options) => {
  // Use default resolver first
  const defaultResolver = options.defaultResolver;
  
  // If it's a relative import ending in .js, check if it should map to .ts
  if (request.startsWith('../') || request.startsWith('./')) {
    if (request.endsWith('.js')) {
      // Get the importing file path - try multiple possible locations
      const importingFile = options.basedir || options.importingFile;
      const rootDir = options.rootDir || process.cwd();
      const srcPath = path.resolve(rootDir, 'src');
      const nodeModulesPath = path.resolve(rootDir, 'node_modules');
      
      // Determine if we're in a TypeScript source context (src directory)
      // AND NOT importing from node_modules
      let isInSrc = false;
      let isFromNodeModules = false;
      
      if (importingFile) {
        const normalizedImportingFile = path.normalize(importingFile);
        const normalizedSrcPath = path.normalize(srcPath);
        const normalizedNodeModulesPath = path.normalize(nodeModulesPath);
        
        isInSrc = normalizedImportingFile.includes(normalizedSrcPath);
        isFromNodeModules = normalizedImportingFile.includes(normalizedNodeModulesPath);
      }
      
      // Only try to map .js to .ts if we're NOT importing from node_modules
      // This handles both regular test files and globalTeardown/setup files
      // If importingFile is not available (globalTeardown case), we'll try the mapping
      // as long as the request doesn't explicitly reference node_modules
      if (!isFromNodeModules && !request.includes('node_modules')) {
        const tsRequest = request.replace(/\.js$/, '.ts');
        
        try {
          // First, try resolving with the default resolver using .ts extension
          const resolved = defaultResolver(tsRequest, options);
          if (fs.existsSync(resolved)) {
            return resolved;
          }
        } catch (e) {
          // Continue to manual resolution
        }
        
        // Manual resolution: resolve relative to importing file
        if (importingFile) {
          try {
            const importingDir = path.dirname(importingFile);
            const tsPath = path.resolve(importingDir, tsRequest);
            if (fs.existsSync(tsPath)) {
              return tsPath;
            }
          } catch (e) {
            // Continue to fallback
          }
        }
        
        // Fallback: try resolving from src directory (useful for globalTeardown/setup)
        // This handles cases where importingFile might not be available or manual resolution failed
        try {
          // For relative imports like ../config/connection.js, resolve from src
          let relativePath = tsRequest;
          if (tsRequest.startsWith('../')) {
            // Remove ../ prefixes to get relative path from src
            relativePath = tsRequest.replace(/^(\.\.\/)+/, '');
          } else if (tsRequest.startsWith('./')) {
            relativePath = tsRequest.replace(/^\.\//, '');
          }
          
          const tsPath = path.resolve(srcPath, relativePath);
          if (fs.existsSync(tsPath)) {
            return tsPath;
          }
        } catch (e) {
          // Continue to default resolver
        }
      }
    }
  }
  
  // Fall back to default resolver
  try {
    return defaultResolver(request, options);
  } catch (error) {
    // If default resolver fails and request ends with .js, try .ts
    // BUT only if it's not from node_modules
    if (request.endsWith('.js') && 
        (request.startsWith('../') || request.startsWith('./')) &&
        !request.includes('node_modules')) {
      const tsRequest = request.replace(/\.js$/, '.ts');
      try {
        return defaultResolver(tsRequest, options);
      } catch (e) {
        // Re-throw original error
        throw error;
      }
    }
    throw error;
  }
};

