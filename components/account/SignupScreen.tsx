"use client";

import { RegisterFlow } from "./signup/RegisterFlow";

// /signup: the v9 registration (role first, then account, details, review). See components/account/signup/.
export function SignupScreen() {
  return <RegisterFlow mode="signup" />;
}
