import { useEffect } from 'react';

export interface ShortcutHandlers {
  onSave?: () => void;
  onPrint?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onEsc?: () => void;
}

export const useOperationalShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check Ctrl or Command keys (Mac vs Windows compatibility)
      const isMeta = e.ctrlKey || e.metaKey;

      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (handlers.onSave) {
          console.log('[Shortcuts] Triggered Shift Save (Ctrl+S)');
          handlers.onSave();
        }
      }

      if (isMeta && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (handlers.onPrint) {
          console.log('[Shortcuts] Triggered Shift Print (Ctrl+P)');
          handlers.onPrint();
        }
      }

      if (e.key === 'ArrowUp') {
        // Arrow navigation only active inside target grid attributes
        const activeEl = document.activeElement;
        if (activeEl && activeEl.getAttribute('data-shortcut-nav') === 'grid') {
          e.preventDefault();
          if (handlers.onNavigateUp) handlers.onNavigateUp();
        }
      }

      if (e.key === 'ArrowDown') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.getAttribute('data-shortcut-nav') === 'grid') {
          e.preventDefault();
          if (handlers.onNavigateDown) handlers.onNavigateDown();
        }
      }

      if (e.key === 'Escape') {
        if (handlers.onEsc) {
          e.preventDefault();
          handlers.onEsc();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
};
