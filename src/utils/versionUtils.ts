import { PromptVersion } from '../stores/promptFinderStore';

export const versionUtils = {
  getVersionName(version: PromptVersion | undefined, allVersions: PromptVersion[]): string {
    // Handle undefined version
    if (!version) {
      return 'Unknown';
    }

    // Handle initial version
    if (version.id === 'initial') {
      return 'Initial';
    }

    // Handle first generation (children of initial)
    if (version.parentId === 'initial') {
      const rootVersions = allVersions.filter(v => v.parentId === 'initial');
      const index = rootVersions.findIndex(v => v.id === version.id);
      return `V${index + 1}`;
    }
    
    // Find parent version
    const parent = allVersions.find(v => v.id === version.parentId);
    if (!parent) {
      // Instead of warning, handle as first generation
      return `V${allVersions.length}`;
    }

    // Find siblings and determine index
    const siblings = allVersions.filter(v => v.parentId === version.parentId);
    const index = siblings.findIndex(v => v.id === version.id);
    
    // Get parent's version name (recursively)
    const parentVersionName = this.getVersionName(parent, allVersions);
    const parentVersion = parentVersionName.replace(/^V/, '');
    return `V${parentVersion}.${index + 1}`;
  },

  isInitialVersion(version: PromptVersion | undefined): boolean {
    if (!version) return false;
    return version.id === 'initial' || version.parentId === 'initial';
  },

  getSiblings(version: PromptVersion, allVersions: PromptVersion[]): PromptVersion[] {
    if (!version.parentId) return [];
    return allVersions.filter(v => v.parentId === version.parentId);
  },

  getParent(version: PromptVersion, allVersions: PromptVersion[]): PromptVersion | undefined {
    if (!version.parentId) return undefined;
    return allVersions.find(v => v.id === version.parentId);
  },

  getChildren(version: PromptVersion, allVersions: PromptVersion[]): PromptVersion[] {
    if (!version.id) return [];
    return allVersions.filter(v => v.parentId === version.id);
  },

  getGeneration(version: PromptVersion, allVersions: PromptVersion[]): number {
    if (!version || this.isInitialVersion(version)) return 0;
    
    let generation = 0;
    let currentVersion = version;
    
    while (currentVersion.parentId && currentVersion.parentId !== 'initial') {
      const parent = this.getParent(currentVersion, allVersions);
      if (!parent) break;
      generation++;
      currentVersion = parent;
    }
    
    return generation + 1;
  }
}; 