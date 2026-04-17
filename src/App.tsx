import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { initI18n } from './i18n';
import { initDatabase } from './services/offlineDB';
import { loadModel } from './services/tflite';
import { setupNotifications } from './services/notifications';
import AppNavigator from './navigation/AppNavigator';
import { getColors } from './constants/colors';
import NetInfo from '@react-native-community/netinfo';
import { getUnsynced, markSynced } from './services/offlineDB';
import { syncHistory } from './services/api';

const App: React.FC = () => {
  const scheme = useColorScheme();
  const C = getColors(scheme);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        // Init i18n
        await initI18n();

        // Init SQLite
        await initDatabase();

        // Load TFLite model in background
        loadModel().catch((e) => console.warn('[App] Model load failed:', e));

        // Setup FCM notifications
        await setupNotifications();

        // Sync unsynced records when connection available
        unsubscribe = NetInfo.addEventListener(async (state) => {
          if (state.isConnected) {
            try {
              const unsynced = await getUnsynced();
              if (unsynced.length > 0) {
                const result = await syncHistory(unsynced);
                await Promise.all(result.synced.map((id) => markSynced(id)));
              }
            } catch {
              // Silent fail — will retry next time
            }
          }
        });

        setIsReady(true);
      } catch (err) {
        console.error('[App] Bootstrap failed:', err);
        setIsReady(true); // Still mount app even if something fails
      }
    };

    bootstrap();

    return () => {
      unsubscribe?.();
    };
  }, []);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.GRAY_BG,
        }}
      >
        <ActivityIndicator size="large" color={C.PRIMARY_GREEN} />
      </View>
    );
  }

  return <AppNavigator />;
};

export default App;
