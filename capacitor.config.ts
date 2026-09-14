import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.carlosjimenez.deudacero',
  appName: 'Deuda Cero',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#059669',
    },
  },
}

export default config
