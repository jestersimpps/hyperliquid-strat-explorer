import * as child_process from 'child_process';

export function playSound(type: 'startup' | 'breakout'): void {
    try {
        // On macOS, use afplay
        const sound = type === 'startup' ? 'Glass' : 'Ping';
        child_process.exec(`afplay /System/Library/Sounds/${sound}.aiff`);
    } catch (error) {
        console.error('Failed to play sound:', error);
    }
}
