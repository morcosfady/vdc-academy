import { z } from "zod";

// zod 4 probes `new Function` to decide whether to compile fast object parsers. The site's CSP forbids eval, so the
// probe was reported as a CSP violation (Lighthouse "Issues were logged", Best Practices 96 on apply). jitless skips
// the probe; parsing these small forms is just as fast. Import z from here, never from "zod", so this runs first.
z.config({ jitless: true });

export { z };
