/**
 * Push Notification Service for Croex Voting Center
 * Enables real-time mobile and desktop notifications for poll creators
 * when new votes are cast, even while using other apps.
 */

export interface NotificationStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
}

const NOTIFICATIONS_ENABLED_KEY = 'mvc_push_notifications_enabled';

export function getNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!getNotificationSupport()) return 'denied';
  return Notification.permission;
}

export function isPushNotificationEnabled(): boolean {
  if (!getNotificationSupport()) return false;
  const stored = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return Notification.permission === 'granted' && stored === 'true';
}

/**
 * Requests notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!getNotificationSupport()) {
    console.warn('Notifications not supported on this browser/device');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
      
      // Send a confirmation test notification so creator sees it working instantly
      sendPushNotification({
        title: '🔔 Croex Voting Center Alerts Active!',
        body: 'اب جب بھی آپ کے پول پر نیا ووٹ لگے گا، آپ کے موبائل پر فوری نوٹیفکیشن موصول ہو گا!',
        icon: '/croex-logo-hd.png',
      });
      return true;
    } else {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
      return false;
    }
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Sends a system notification to the device status bar / lock screen
 */
export async function sendPushNotification(options: {
  title: string;
  body: string;
  icon?: string;
  data?: any;
}) {
  if (!getNotificationSupport() || Notification.permission !== 'granted') {
    return;
  }

  const iconUrl = options.icon || '/croex-logo-hd.png';

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && reg.showNotification) {
        await reg.showNotification(options.title, {
          body: options.body,
          icon: iconUrl,
          badge: '/croex-logo.png',
          tag: `croex_vote_${Date.now()}`,
          data: options.data,
          // @ts-ignore
          vibrate: [200, 100, 200],
        });
        return;
      }
    }
  } catch (err) {
    console.warn('ServiceWorker notification display:', err);
  }

  try {
    fallbackNotification(options.title, options.body, iconUrl, options.data);
  } catch (err) {
    console.warn('Notification trigger fallback:', err);
  }
}

function fallbackNotification(title: string, body: string, icon: string, data?: any) {
  try {
    const n = new Notification(title, {
      body,
      icon,
      badge: '/croex-logo.png',
      tag: `croex_vote_${Date.now()}`,
      data,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    console.warn('Native notification instantiation notice:', e);
  }
}
