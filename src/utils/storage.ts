import { Workspace } from "../types";

export function saveWorkspace(workspace: Workspace) {
    localStorage.setItem(`mlmap:workspace<${workspace.id}>`, JSON.stringify(workspace));
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

    const raw = localStorage.getItem(`mlmap:workspace<${workspaceId || currentWorkspaceId}>`);
    return raw ? JSON.parse(raw) as Workspace : null;
};

export function deleteWorkspace(workspaceId: string) {
    localStorage.removeItem(`mlmap:workspace<${workspaceId}>`);
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