import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, Plugin, PluginOption } from "vite";

const plugins: [Plugin | PluginOption] = [react()];

if (process.env.VITE_SSL === "1") {
  plugins.push(basicSsl());
}

export default defineConfig({
  plugins,
});
