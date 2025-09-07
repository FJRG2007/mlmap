import { Workspace } from "../types";

export function saveWorkspace(workspace: Workspace) {
    const cacheKey = `mlmap:workspace<${workspace.id}>`;
    localStorage.setItem(cacheKey, JSON.stringify(workspace));
};

export function loadWorkspace(workspaceId?: string): Workspace | null {
    let currentWorkspaceId = localStorage.getItem("mlmap:currentWorkspaceId");

    if (!currentWorkspaceId) {
        currentWorkspaceId = Date.now().toString();
        localStorage.setItem("mlmap:currentWorkspaceId", currentWorkspaceId);

        const defaultWorkspace = {
            id: currentWorkspaceId,
            name: "New Workspace",
            version: "1.0",
            layout: {}
        };

        localStorage.setItem(`mlmap:workspace<${currentWorkspaceId}>`, JSON.stringify(defaultWorkspace));

        return defaultWorkspace;
    }

    const cacheKey = `mlmap:workspace<${workspaceId || currentWorkspaceId}>`;
    const raw = localStorage.getItem(cacheKey);
    return raw ? JSON.parse(raw) as Workspace : null;
};

export function deleteWorkspace(workspaceId: string) {
    const cacheKey = `mlmap:workspace<${workspaceId}>`;
    localStorage.removeItem(cacheKey);
};

export function resetWorkspace(workspaceId: string) {
    const cacheKey = `mlmap:workspace<${workspaceId}>`;
    const currentData = JSON.parse(localStorage.getItem(cacheKey) || `{id:"${workspaceId}",name:"Reset Workspace",version:"1.0",layout:{}`);
    localStorage.setItem(cacheKey, JSON.stringify({
        id: workspaceId,
        name: currentData?.name,
        version: "1.0",
        layout: {}
    }));
};

export function loadAllWorkspaces(): Workspace[] {
    const workspaces: Workspace[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("mlmap:workspace<")) {
            const raw = localStorage.getItem(key);
            if (raw) workspaces.push(JSON.parse(raw) as Workspace);
        }
    }
    return workspaces;
};