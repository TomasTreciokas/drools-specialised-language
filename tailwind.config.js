module.exports = {
  content: ["./ng-src/**/*.component.html", "./views/**/*.html"],
  theme: {
    extend: {},
    fontFamily: {
      display: ["Open Sans", "sans-serif"],
      text: ["Open Sans", "sans-serif"],
    },
  },
  corePlugins: {
    preflight: false,
  },
  important: true,
  plugins: [],
  prefix: "tw-",
};
