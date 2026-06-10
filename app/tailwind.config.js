/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: dorado sobre azul marino (color del fondo del logo)
        oro: "#E9A82E",
        "oro-dark": "#C8881A",
        // Paleta: fondo negro + cajitas azul marino muy oscuro:
        carbon: "#000000",        // fondo base (negro)
        "carbon-soft": "#020A18", // superficies internas (mas oscuras, para contraste)
        "carbon-card": "#010D26", // tarjetas / cajitas
        borde: "#0C1D38",         // bordes azulados (sutiles, definen las cajitas)
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
