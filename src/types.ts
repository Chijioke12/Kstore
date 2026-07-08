export interface AppItem {
  id: string;
  name: string;
  developer: string;
  category: string;
  icon: string; // Lucide icon name or image URL
  description: string;
  rating: number;
  reviewsCount: number;
  size: string;
  version: string;
  isPreinstalled?: boolean;
  download_url?: string;
  manifest_url?: string;
  type?: string;
}

export type KaiScreen = 'home' | 'launcher' | 'store_home' | 'store_category' | 'store_detail' | 'store_search' | 'app_running';

export interface AppState {
  installedAppIds: string[];
  downloadingAppId: string | null;
  downloadProgress: number;
}

export type KeyCode =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter' // Center D-pad Select
  | 'SoftLeft' // LSK
  | 'SoftRight' // RSK
  | 'Back' // Back / Clear
  | 'Call' // Send key
  | 'End' // End / Power key
  | 'Key1' | 'Key2' | 'Key3' | 'Key4' | 'Key5' | 'Key6' | 'Key7' | 'Key8' | 'Key9' | 'Key0'
  | 'KeyStar' | 'KeyHash';
