/**
 * resolve-paths.ts — PetroOps Production Dependency Resolver
 * ──────────────────────────────────────────────────────────
 * Dynamically injects the physical app.asar.unpacked/node_modules directory
 * into Node's module resolution algorithm process-wide by wrapping the internal
 * Module._nodeModulePaths method. This guarantees that all required sub-routes
 * (shift.routes.js, review.routes.js, etc.) resolve dependencies cleanly.
 */

import path from 'path';
import fs from 'fs';
import Module from 'module';

console.log('[Paths-Resolver] Spawning path resolution hooks...');

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  try {
    const relativeResourcesPath = path.join(__dirname, '..', '..', '..');
    const resourcesPath = process.env.ELECTRON_RESOURCES_PATH || relativeResourcesPath;
    
    if (resourcesPath) {
      const appAsarUnpackedNodeModules = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules');
      
      if (fs.existsSync(appAsarUnpackedNodeModules)) {
        console.log(`[Paths-Resolver] Injecting process-wide node_modules boundary: ${appAsarUnpackedNodeModules}`);
        
        // Monkey-patch Node's internal module search paths algorithm
        const originalNodeModulePaths = (Module as any)._nodeModulePaths;
        if (typeof originalNodeModulePaths === 'function') {
          (Module as any)._nodeModulePaths = function (from: string) {
            const paths = originalNodeModulePaths.call(this, from);
            // Append the unpacked production node_modules as a fallback
            if (!paths.includes(appAsarUnpackedNodeModules)) {
              paths.push(appAsarUnpackedNodeModules);
            }
            return paths;
          };
          console.log('[Paths-Resolver] Module._nodeModulePaths patched successfully.');
        } else {
          console.log('[Paths-Resolver] ERROR: Module._nodeModulePaths is not a function!');
        }
      } else {
        console.log('[Paths-Resolver] ERROR: Physical unpacked node_modules folder not found!');
      }
    }
  } catch (err: any) {
    console.error('[Paths-Resolver] Critical path injection failure:', err.message || err);
  }
}
