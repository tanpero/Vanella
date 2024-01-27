type KeyMap = {
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    key: string;
};

export default class ShortcutListener {
    private shortcuts: { [key: string]: () => void } = {};

    constructor() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    when(shortcut: string) {
        return {
            to: (Listener: () => void) => {
                const keyMap = this.parseShortcut(shortcut);
                const key = this.getKeyFromMap(keyMap);
                if (key) {
                    this.shortcuts[key] = Listener;
                } else {
                    console.error('Invalid key combination');
                }
            },
        };
    }

    private parseShortcut(shortcut: string): KeyMap {
        const keys = shortcut.split(' ').map((part) => part.toLowerCase());

        const keyMap: KeyMap = {
            key: keys.pop() || '',
        };

        keys.forEach((part) => {
            if (part === 'ctrl') {
                keyMap.ctrlKey = true;
            } else if (part === 'alt') {
                keyMap.altKey = true;
            } else if (part === 'shift') {
                keyMap.shiftKey = true;
            } else {
                console.error('Invalid key modifier:', part);
            }
        });

        return keyMap;
    }

    private getKeyFromMap(keyMap: KeyMap): string {
        if (!keyMap.key) return '';

        let key = '';
        if (keyMap.ctrlKey) key += 'Ctrl+';
        if (keyMap.altKey) key += 'Alt+';
        if (keyMap.shiftKey) key += 'Shift+';

        key += keyMap.key;
        return key;
    }

    private handleKeyDown(event: KeyboardEvent) {
        const key = this.getKeyFromEvent(event);
        if (key && this.shortcuts[key]) {
            event.preventDefault(); // Prevent default browser behavior for the shortcut
            this.shortcuts[key]();
        }
    }

    private getKeyFromEvent(event: KeyboardEvent): string {
        let key = '';
        if (event.ctrlKey) key += 'Ctrl+';
        if (event.altKey) key += 'Alt+';
        if (event.shiftKey) key += 'Shift+';

        key += event.key.toLowerCase();
        return key;
    }
}
