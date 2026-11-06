/**
 * Sound files for builds where synthesized sound is not accepted (Playgama 3.3.2).
 * Imported only in the Playgama build (dynamic import in main.ts), so the Yandex build stays file-free.
 * Sources and licenses: CREDITS.md.
 */
import creak from '../audio/creak.mp3?url';
import deny from '../audio/deny.mp3?url';
import drop from '../audio/drop.mp3?url';
import fall from '../audio/fall.mp3?url';
import music from '../audio/music.mp3?url';
import pick from '../audio/pick.mp3?url';
import thaw from '../audio/thaw.mp3?url';
import triple from '../audio/triple.mp3?url';
import win from '../audio/win.mp3?url';

export const SOUND_FILES = { pick, drop, deny, triple, creak, fall, thaw, win, music };
export type SoundKey = keyof typeof SOUND_FILES;
