import { useEffect, useRef, useState } from 'react';

const IS_ANDROID_BUILD = import.meta.env.MODE === 'android';

export default function NativeAppBridge({ isOverlayOpen, onCloseOverlay, offlineLabel }) {
  const overlayOpenRef = useRef(isOverlayOpen);
  const closeOverlayRef = useRef(onCloseOverlay);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    overlayOpenRef.current = isOverlayOpen;
    closeOverlayRef.current = onCloseOverlay;
  }, [isOverlayOpen, onCloseOverlay]);

  useEffect(() => {
    if (!IS_ANDROID_BUILD) return undefined;

    let disposed = false;
    let themeObserver;
    const handles = [];

    const keepHandle = (handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }
      handles.push(handle);
    };

    async function connectNativeEvents() {
      const [coreModule, appModule, networkModule, splashModule] = await Promise.all([
        import('@capacitor/core'),
        import('@capacitor/app'),
        import('@capacitor/network'),
        import('@capacitor/splash-screen'),
      ]);
      const { Capacitor, SystemBars, SystemBarsStyle } = coreModule;
      const { App: CapacitorApp } = appModule;
      const { Network } = networkModule;
      const { SplashScreen } = splashModule;

      if (disposed || !Capacitor.isNativePlatform()) return;
      document.documentElement.classList.add('gs-native-app');

      const syncSystemBarStyle = () => {
        const isDark = document.documentElement.dataset.theme === 'dark';
        void SystemBars.setStyle({
          style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
        }).catch(() => {});
      };

      themeObserver = new MutationObserver(syncSystemBarStyle);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      syncSystemBarStyle();

      const status = await Network.getStatus();
      if (!disposed) setIsOffline(!status.connected);

      const networkHandle = await Network.addListener('networkStatusChange', (nextStatus) => {
        if (!disposed) setIsOffline(!nextStatus.connected);
      });
      keepHandle(networkHandle);

      if (Capacitor.getPlatform() === 'android') {
        const backHandle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          if (overlayOpenRef.current) {
            closeOverlayRef.current?.();
            return;
          }

          if (window.location.pathname !== '/' && canGoBack) {
            window.history.back();
            return;
          }

          void CapacitorApp.minimizeApp();
        });
        keepHandle(backHandle);
      }

      window.requestAnimationFrame(() => {
        if (!disposed) void SplashScreen.hide().catch(() => {});
      });
    }

    void connectNativeEvents().catch((error) => {
      console.warn('Native app integration could not be initialized.', error);
    });

    return () => {
      disposed = true;
      themeObserver?.disconnect();
      handles.forEach((handle) => void handle.remove());
      document.documentElement.classList.remove('gs-native-app');
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="gs-offline-notice" role="status" aria-live="polite">
      <span className="gs-offline-notice__dot" aria-hidden="true" />
      {offlineLabel}
    </div>
  );
}
