import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#276359",
      },
      fontFamily: {
        sans: ["Rosemary"], 
        rosemary: ["Rosemary"],
      },
    }
    ,
  },
  plugins: [],
};

export default config;