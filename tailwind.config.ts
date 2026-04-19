/** @type {import('tailwindcss').Config} */
module.exports = {
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
}