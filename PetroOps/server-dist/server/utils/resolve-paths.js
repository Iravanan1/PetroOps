"use strict";
/**
 * resolve-paths.ts — PetroOps Production Dependency Resolver
 * ──────────────────────────────────────────────────────────
 * Dynamically injects the physical app.asar.unpacked/node_modules directory
 * into Node's module resolution algorithm process-wide by wrapping the internal
 * Module._nodeModulePaths method. This guarantees that all required sub-routes
 * (shift.routes.js, review.routes.js, etc.) resolve dependencies cleanly.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const module_1 = __importDefault(require("module"));
console.log('[Paths-Resolver] Spawning path resolution hooks...');
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
    try {
        const relativeResourcesPath = path_1.default.join(__dirname, '..', '..', '..');
        const resourcesPath = process.env.ELECTRON_RESOURCES_PATH || relativeResourcesPath;
        if (resourcesPath) {
            const appAsarUnpackedNodeModules = path_1.default.join(resourcesPath, 'app.asar.unpacked', 'node_modules');
            if (fs_1.default.existsSync(appAsarUnpackedNodeModules)) {
                console.log(`[Paths-Resolver] Injecting process-wide node_modules boundary: ${appAsarUnpackedNodeModules}`);
                // Monkey-patch Node's internal module search paths algorithm
                const originalNodeModulePaths = module_1.default._nodeModulePaths;
                if (typeof originalNodeModulePaths === 'function') {
                    module_1.default._nodeModulePaths = function (from) {
                        const paths = originalNodeModulePaths.call(this, from);
                        // Append the unpacked production node_modules as a fallback
                        if (!paths.includes(appAsarUnpackedNodeModules)) {
                            paths.push(appAsarUnpackedNodeModules);
                        }
                        return paths;
                    };
                    console.log('[Paths-Resolver] Module._nodeModulePaths patched successfully.');
                }
                else {
                    console.log('[Paths-Resolver] ERROR: Module._nodeModulePaths is not a function!');
                }
            }
            else {
                console.log('[Paths-Resolver] ERROR: Physical unpacked node_modules folder not found!');
            }
        }
    }
    catch (err) {
        console.error('[Paths-Resolver] Critical path injection failure:', err.message || err);
    }
}
