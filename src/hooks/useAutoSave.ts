import { useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface AutoSaveConfig {
  key: string;
  data: any;
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (data: any) => void;
}

export function useAutoSave({ key, data, enabled = true, debounceMs = 1000, onRestore }: AutoSaveConfig) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>("");

  // Save to localStorage
  const save = useCallback(() => {
    if (!enabled) return;
    
    try {
      const serialized = JSON.stringify(data);
      
      // Only save if data changed
      if (serialized !== lastSavedRef.current) {
        localStorage.setItem(`autosave_${key}`, serialized);
        localStorage.setItem(`autosave_${key}_timestamp`, Date.now().toString());
        lastSavedRef.current = serialized;
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [key, data, enabled]);

  // Debounced save on data change
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, save, debounceMs, enabled]);

  // Restore from localStorage
  const restore = useCallback(() => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      const timestamp = localStorage.getItem(`autosave_${key}_timestamp`);
      
      if (saved && timestamp) {
        const savedTime = parseInt(timestamp);
        const hoursSince = (Date.now() - savedTime) / (1000 * 60 * 60);
        
        // Only restore if saved within last 24 hours
        if (hoursSince < 24) {
          const parsed = JSON.parse(saved);
          return parsed;
        }
      }
    } catch (error) {
      console.error("Auto-restore failed:", error);
    }
    return null;
  }, [key]);

  // Clear saved data
  const clear = useCallback(() => {
    localStorage.removeItem(`autosave_${key}`);
    localStorage.removeItem(`autosave_${key}_timestamp`);
    lastSavedRef.current = "";
  }, [key]);

  // Check for unsaved data on mount
  const checkForUnsaved = useCallback(() => {
    const saved = restore();
    if (saved && onRestore) {
      const timestamp = localStorage.getItem(`autosave_${key}_timestamp`);
      const savedTime = timestamp ? new Date(parseInt(timestamp)) : null;
      
      return {
        hasUnsaved: true,
        data: saved,
        savedAt: savedTime,
      };
    }
    return { hasUnsaved: false, data: null, savedAt: null };
  }, [key, restore, onRestore]);

  // Show restore prompt
  const promptRestore = useCallback(() => {
    const { hasUnsaved, data: savedData, savedAt } = checkForUnsaved();
    
    if (hasUnsaved && savedData && onRestore) {
      toast({
        title: "Unsaved data found",
        description: `Would you like to restore your previous work from ${savedAt?.toLocaleString() || "earlier"}?`,
        action: (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onRestore(savedData);
                toast({ title: "Data restored" });
              }}
              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded"
            >
              Restore
            </button>
            <button
              onClick={clear}
              className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
            >
              Discard
            </button>
          </div>
        ),
        duration: 10000,
      });
    }
  }, [checkForUnsaved, onRestore, clear, toast]);

  return {
    save,
    restore,
    clear,
    checkForUnsaved,
    promptRestore,
  };
}

// Helper to get all auto-saved keys
export function getAutoSavedKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("autosave_") && !key.endsWith("_timestamp")) {
      keys.push(key.replace("autosave_", ""));
    }
  }
  return keys;
}

// Helper to clear all auto-saved data
export function clearAllAutoSaved(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("autosave_")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
