export interface ReferenceBundle {
    name: string;
    filePath: string;
    currentVersion: string;
    upstreamURL?: string;
}
export interface UpdateCheckResult {
    bundleName: string;
    currentVersion: string;
    availableVersion?: string;
    updateAvailable: boolean;
    lastChecked: string;
}
export interface UpdateResult {
    bundleName: string;
    previousVersion: string;
    newVersion: string;
    status: 'success' | 'failed' | 'no-update';
    mergedUserCaptures: number;
    timestamp: string;
}
export declare class ReferenceUpdateService {
    private bundlesDir;
    private userCapturesDir;
    private versionCacheFile;
    constructor(bundlesDir?: string, userCapturesDir?: string);
    /**
     * Check for updates across all reference bundles
     */
    checkForUpdates(): Promise<UpdateCheckResult[]>;
    /**
     * Check single bundle for updates
     */
    private checkBundleUpdate;
    /**
     * Update all reference bundles
     */
    updateAllBundles(): Promise<UpdateResult[]>;
    /**
     * Update single bundle
     */
    private updateBundle;
    /**
     * Load bundle from file
     */
    private loadBundle;
    /**
     * Save bundle to file
     */
    private saveBundle;
    /**
     * Load user-captured assets
     */
    private loadUserCaptures;
    /**
     * Validate bundle structure
     */
    private validateBundle;
    /**
     * Update DESIGN.md with new reference bundle versions
     */
    private updateDESIGNMD;
    /**
     * Get all reference bundles
     */
    private getReferenceBundles;
}
/**
 * CLI command: /sidecoach update-references
 * Usage: sidecoach update-references
 */
export declare function updateReferencesCommand(): Promise<void>;
//# sourceMappingURL=reference-update-service.d.ts.map