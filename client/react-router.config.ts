import type { Config } from "@react-router/dev/config";

export default { ssr: process.env.NODE_ENV === "production" } satisfies Config;