// Local dev server. On Netlify the same app runs via netlify/functions/api.js.
const app = require('./src/app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Wedding site running at http://localhost:${port}`);
});
