/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: dorado sobre azul marino (color del fondo del logo)
        oro: "#E9A82E",
        "oro-dark": "#C8881A",
        // Paleta azul marino coordinada (base oscura -> tarjetas mas claras):
        carbon: "#010D26",        // fondo base (azul marino muy oscuro)
        "carbon-soft": "#0A1C3F", // superficies levemente elevadas
        "carbon-card": "#0F2750", // tarjetas
        borde: "#21426E",         // bordes azulados
        // Alias historico del marino (por si quedan usos viejos)
        marino: "#010D26",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
