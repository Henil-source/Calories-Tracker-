import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.thalika.tracker",
  appName: "Thalika",
  webDir: "dist",
  android: { allowMixedContent: false },
};

export default config;
