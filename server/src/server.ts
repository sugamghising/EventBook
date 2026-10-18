import { app } from "./app.js";
import { config } from "./config/index.js";

// Vercel runs this as a serverless function and bridges a default export;
// listening is only for self-hosting (nothing listens in the Vercel sandbox).
export default app;

if (!process.env.VERCEL) {
    app.listen(config.PORT, () => {
        console.log(`API listening on port ${config.PORT}`);
    });
}
