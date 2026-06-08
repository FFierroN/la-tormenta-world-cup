/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: dorado sobre negro (decision tomada en sesiones previas)
        oro: "#E9A82E",
        "oro-dark": "#C8881A",
        carbon: "#0A0A0A",
        "carbon-soft": "#141414",
        "carbon-card": "#1B1B1B",
        borde: "#2A2A2A",
        // Azul marino del logo (identidad de marca)
        marino: "#172842",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
