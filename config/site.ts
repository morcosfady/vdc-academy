// The public origin + base path, for canonicals, the sitemap, robots and structured data. One env var to change for a
// custom domain (docs/CUSTOM-DOMAIN.md): NEXT_PUBLIC_SITE_URL, no trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://morcosfady.github.io/vdc-academy").replace(/\/$/, "");

// Routes that must never be indexed: private screens, tools, the demo. Excluded from the sitemap and disallowed in robots.
export const PRIVATE_ROUTES = ["/account/", "/admin/", "/auth/", "/apply/success/", "/login/", "/signup/", "/demo/", "/demo-api/", "/styleguide/", "/poster/", "/content-status/"];

export const site = {
  name: "VDC Academy",
  parent: "Bay BIM Designs",
  parentUrl: "https://baybimdesigns.com/",
  city: "Fort Worth, TX",
  coords: "32.7555° N, 97.3308° W",
  freshGradMaxDiscount: 40,
  // Header links: four or five only.
  nav: [
    { href: "/programs", label: "Programs" },
    { href: "/fresh-graduates", label: "Fresh Grads" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
  ],
  // Full menu adds the rest.
  menu: [
    { href: "/programs", label: "Programs" },
    { href: "/fresh-graduates", label: "Fresh Grads" },
    { href: "/pricing", label: "Pricing" },
    { href: "/learning-path", label: "Learning Path" },
    { href: "/for-companies", label: "For Companies" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ],
};
