import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';

import type { Message } from './types';

type VideoValue = {
  /** The message currently holding the player, if any. */
  activeId: string | null;
  play: (message: Message) => void;
  player: VideoPlayer;
};

const VideoContext = createContext<VideoValue | null>(null);

/**
 * One player for the whole screen. Tapping another video moves the same
 * instance rather than mounting a second one — video is tap-to-play only and
 * is never autoplayed.
 */
export function VideoProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
  });

  const play = useCallback(
    (message: Message) => {
      if (!message.mediaUrl) return;
      setActiveId(message.id);
      void player.replaceAsync({ uri: message.mediaUrl }).then(() => player.play());
    },
    [player],
  );

  const value = useMemo(() => ({ activeId, play, player }), [activeId, play, player]);

  return <VideoContext value={value}>{children}</VideoContext>;
}

export function useVideo(): VideoValue {
  const value = use(VideoContext);
  if (!value) throw new Error('useVideo must be used inside VideoProvider');
  return value;
}
