export interface TechStackItem {
  name: string;
  category: "framework" | "ui" | "state" | "backend" | "database" | "auth" | "analytics" | "hosting" | "build" | "other";
  version?: string;
  confidence: number;
}

export interface TechStackResult {
  stack: TechStackItem[];
  summary: string;
}

const DETECTORS: { name: string; category: TechStackItem["category"]; patterns: (RegExp | string)[]; confidence: number }[] = [
  // Frameworks
  { name: "Next.js", category: "framework", patterns: [/_next\//, /next\//, /__next/, /NextResponse/, /next\/image/], confidence: 95 },
  { name: "React", category: "framework", patterns: [/react-dom/, /useState|useEffect|createElement/, /from ['"]react['"]/], confidence: 90 },
  { name: "Vue.js", category: "framework", patterns: [/vue\.js/, /v-if|v-for|v-bind/, /createApp/, /__vue__/], confidence: 90 },
  { name: "Svelte", category: "framework", patterns: [/svelte/, /\$:/, /on:click/], confidence: 90 },
  { name: "Angular", category: "framework", patterns: [/angular/, /ng-/, /@Component/, /NgModule/], confidence: 90 },
  { name: "Nuxt", category: "framework", patterns: [/nuxt/, /__nuxt/, /useNuxtApp/], confidence: 95 },
  { name: "Remix", category: "framework", patterns: [/@remix-run/, /useLoaderData/, /useActionData/], confidence: 95 },
  { name: "Astro", category: "framework", patterns: [/astro/, /Astro\./, /client:load/], confidence: 90 },
  { name: "SvelteKit", category: "framework", patterns: [/sveltekit/, /@sveltejs\/kit/], confidence: 95 },

  // UI Libraries
  { name: "Tailwind CSS", category: "ui", patterns: [/tailwindcss/, /class="[^"]*(?:flex|grid|bg-|text-|p-|m-)/], confidence: 85 },
  { name: "shadcn/ui", category: "ui", patterns: [/@radix-ui/, /components\/ui/, /cn\(/], confidence: 80 },
  { name: "Material UI", category: "ui", patterns: [/@mui\//, /MuiButton/, /makeStyles/], confidence: 90 },
  { name: "Chakra UI", category: "ui", patterns: [/@chakra-ui/, /ChakraProvider/], confidence: 90 },
  { name: "Framer Motion", category: "ui", patterns: [/framer-motion/, /motion\.div/], confidence: 95 },
  { name: "Bootstrap", category: "ui", patterns: [/bootstrap/, /class="[^"]*(?:container|row|col-)/], confidence: 80 },
  { name: "Ant Design", category: "ui", patterns: [/antd/, /ant-design/], confidence: 90 },

  // State Management
  { name: "Zustand", category: "state", patterns: [/zustand/, /create\(\s*\(\s*set/], confidence: 85 },
  { name: "Redux", category: "state", patterns: [/redux/, /createStore|configureStore|useSelector/], confidence: 90 },
  { name: "Jotai", category: "state", patterns: [/jotai/, /useAtom/], confidence: 90 },
  { name: "TanStack Query", category: "state", patterns: [/@tanstack\/query/, /useQuery|useMutation/], confidence: 85 },

  // Backend / API
  { name: "Prisma", category: "backend", patterns: [/prisma/, /PrismaClient/, /@prisma\/client/], confidence: 95 },
  { name: "Drizzle", category: "backend", patterns: [/drizzle-orm/, /drizzle/], confidence: 90 },
  { name: "tRPC", category: "backend", patterns: [/trpc/, /createTRPCRouter/], confidence: 95 },
  { name: "GraphQL", category: "backend", patterns: [/graphql/, /useQuery.*gql/, /ApolloProvider/], confidence: 85 },
  { name: "Express", category: "backend", patterns: [/express/, /app\.get|app\.post|app\.use/], confidence: 80 },

  // Database
  { name: "Supabase", category: "database", patterns: [/supabase/, /createClient.*supabase/], confidence: 90 },
  { name: "Firebase", category: "database", patterns: [/firebase/, /firestore|getFirestore/], confidence: 90 },
  { name: "MongoDB", category: "database", patterns: [/mongodb|mongoose/, /MongoClient/], confidence: 90 },
  { name: "PostgreSQL", category: "database", patterns: [/postgres|pg/, /Pool\(|Client\(/], confidence: 80 },
  { name: "Turso/libSQL", category: "database", patterns: [/@libsql/, /turso/], confidence: 95 },
  { name: "PlanetScale", category: "database", patterns: [/planetscale/, /@planetscale/], confidence: 95 },

  // Auth
  { name: "NextAuth/Auth.js", category: "auth", patterns: [/next-auth/, /NextAuth/, /auth\.js/], confidence: 95 },
  { name: "Clerk", category: "auth", patterns: [/@clerk/, /ClerkProvider/, /useUser.*clerk/], confidence: 95 },
  { name: "Supabase Auth", category: "auth", patterns: [/supabase.*auth/, /signInWith/], confidence: 80 },
  { name: "Firebase Auth", category: "auth", patterns: [/firebase\/auth/, /getAuth/], confidence: 85 },
  { name: "Lucia", category: "auth", patterns: [/lucia/, /lucia-auth/], confidence: 90 },

  // Analytics
  { name: "Google Analytics", category: "analytics", patterns: [/gtag|GA_MEASUREMENT|google-analytics|G-[A-Z0-9]+/], confidence: 90 },
  { name: "Vercel Analytics", category: "analytics", patterns: [/@vercel\/analytics/], confidence: 95 },
  { name: "PostHog", category: "analytics", patterns: [/posthog/, /PostHogProvider/], confidence: 90 },
  { name: "Plausible", category: "analytics", patterns: [/plausible/], confidence: 90 },
  { name: "Mixpanel", category: "analytics", patterns: [/mixpanel/], confidence: 90 },

  // Hosting
  { name: "Vercel", category: "hosting", patterns: [/vercel/, /x-vercel/], confidence: 70 },
  { name: "Netlify", category: "hosting", patterns: [/netlify/], confidence: 70 },
  { name: "Cloudflare", category: "hosting", patterns: [/cloudflare/, /cf-ray/], confidence: 70 },

  // Build Tools
  { name: "Vite", category: "build", patterns: [/vite/, /@vitejs/], confidence: 90 },
  { name: "Turbopack", category: "build", patterns: [/turbopack/], confidence: 90 },
  { name: "Webpack", category: "build", patterns: [/webpack/, /__webpack_require__/], confidence: 80 },
];

export function detectTechStack(files: { name: string; content: string }[], platform?: string): TechStackResult {
  const found = new Map<string, TechStackItem>();
  const allContent = files.map((f) => f.content).join("\n");

  for (const detector of DETECTORS) {
    for (const pattern of detector.patterns) {
      const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
      if (regex.test(allContent)) {
        const existing = found.get(detector.name);
        if (!existing || existing.confidence < detector.confidence) {
          found.set(detector.name, {
            name: detector.name,
            category: detector.category,
            confidence: detector.confidence,
          });
        }
        break;
      }
    }
  }

  if (platform && !found.has(platform)) {
    const platformMap: Record<string, TechStackItem["category"]> = {
      vercel: "hosting",
      netlify: "hosting",
      cloudflare: "hosting",
      railway: "hosting",
    };
    found.set(platform, {
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      category: platformMap[platform] || "hosting",
      confidence: 100,
    });
  }

  // Extract versions from package.json if available
  const pkgFile = files.find((f) => f.name === "package.json" || f.name.endsWith("/package.json"));
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, item] of found) {
        const depName = name.toLowerCase().replace(/\s/g, "-");
        const version = allDeps[depName] || allDeps[`@${depName}`];
        if (version) {
          item.version = String(version).replace(/[\^~>=]/g, "");
        }
      }
    } catch {}
  }

  const stack = Array.from(found.values()).sort((a, b) => b.confidence - a.confidence);

  const frameworks = stack.filter((s) => s.category === "framework").map((s) => s.name);
  const ui = stack.filter((s) => s.category === "ui").map((s) => s.name);
  const summary = [
    frameworks.length > 0 ? frameworks.join(" + ") : "Unknown framework",
    ui.length > 0 ? `with ${ui.join(", ")}` : "",
    platform ? `on ${platform}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { stack, summary };
}
