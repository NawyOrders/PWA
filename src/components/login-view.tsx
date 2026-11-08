"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Eye,
  LogIn,
  MessageCircle,
  MessageSquareText,
  Phone,
  Send,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { seedProfile, useApp } from "@/components/providers";
import { BackLink, Breadcrumbs, buttonStyles } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { LoadingIndicator } from "@/components/loading-indicator";
import { OtpCodeDialog } from "@/components/otp-code-dialog";
import {
  ApiError,
  apiErrorFieldTarget,
  apiErrorMessageKey,
  authTransport,
  completeProfile as completeProfileRequest,
  isUsablePhone,
  normalizeEgyptianPhone,
  requestOtp,
  retryBackoffSeconds,
  splitFullName,
  verifyOtp,
  type AuthFieldTarget,
  type CustomerSessionPayload,
  type OtpChallenge,
  type OtpChannel,
  type OtpPurpose,
} from "@/lib/api";
import {
  RESEND_COOLDOWN_SECONDS,
  codeSecondsLeft,
  formatCountdown,
  resendCooldownSeconds,
} from "@/lib/otp-clock";
import { DEMO_MAX_ATTEMPTS, OTP_LENGTH, generateOtpCode } from "@/lib/otp";
import { localCustomer, rememberLocalCustomer } from "@/lib/local-customers";

/**
 * The contract's own code lifetime. Used only when a response carries neither a
 * readable `expiresAtUtc` nor `expiresInSeconds`, because a code with no window
 * cannot be counted down — and a screen that says "expired" the moment a code
 * arrives is worse than a slightly generous timer.
 */
const DEFAULT_CHALLENGE_SECONDS = 300;

/**
 * Where the customer is headed, asked up front because it changes what the form
 * needs: `Login` wants only a phone number, `Registration` wants a name too.
 * The values are the documented `purpose` strings.
 */
const OTP_PURPOSES: { value: OtpPurpose; label: string; icon: typeof LogIn }[] = [
  { value: "Login", label: "تسجيل الدخول", icon: LogIn },
  { value: "Registration", label: "حساب جديد", icon: UserPlus },
];

/**
 * `channel` is one of the documented inputs on `/auth/otp/request`, so the
 * customer picks it instead of the app always asking for SMS. The values are
 * the strings the contract shows; the API's own error messages name the same
 * two channels.
 */
const OTP_CHANNELS: { value: OtpChannel; label: string; icon: typeof MessageCircle }[] = [
  { value: "sms", label: "رسالة SMS", icon: MessageSquareText },
  { value: "whatsapp", label: "واتساب", icon: MessageCircle },
];

/**
 * `devOtpCode` from the API is a testing aid, so it is never surfaced from a
 * production bundle unless the deploy explicitly opts in. Read at call time so
 * a test can put the app in either mode.
 */
function apiDevCodeVisible(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEV_OTP === "true";
}

/**
 * Where a code came from decides whether the popup may show it.
 *
 * `demo` is the local code the app invents when no backend is configured. It
 * already ships inside the client bundle, so putting it on screen leaks nothing
 * — and the old single gate hid it in a production build, which left the
 * deployed app asking a customer for a code they could never see or copy.
 *
 * `api` is the backend's `devOtpCode`. That one is a real test-environment
 * shortcut, so it stays gated exactly as before.
 */
type CodeOrigin = "demo" | "api";

/** The account is refused outright; only a human at the brand can fix that. */
const ACCOUNT_REFUSED_CODES = new Set([
  "Customer.Blocked",
  "Customer.Inactive",
  "Auth.InactiveAccount",
]);

/** The challenge is spent, so the next step is a brand new code. */
const NEW_CODE_REQUIRED_CODES = new Set([
  "Customer.OtpExpired",
  "Customer.OtpAlreadyUsed",
  "Customer.OtpMaxAttemptsExceeded",
  "Customer.ChallengeNotFound",
]);

export function LoginView({ next = "/profile", mode = "Login" }: { next?: string; mode?: OtpPurpose }) {
  const router = useRouter();
  const { login, updateProfile, adoptLocalAccount, toast, t, loggedIn, ready, profile } = useApp();
  const transport = authTransport();
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [purpose, setPurpose] = useState<OtpPurpose>(mode);
  const [channel, setChannel] = useState<OtpChannel>("sms");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  /** Seconds the current code stays verifiable. Reaching zero kills Verify. */
  const [codeSeconds, setCodeSeconds] = useState(0);
  /** Seconds until another code may be asked for — cooldown or `Retry-After`. */
  const [backoffSeconds, setBackoffSeconds] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldTarget, string>>>({});
  const [accountRefused, setAccountRefused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  /**
   * The demo code and how many wrong tries it has left. Both stay in memory:
   * writing them to storage would leave a usable credential behind after the
   * tab closes, and would let a second tab answer the first one's challenge.
   */
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  /**
   * The latest issued challenge, readable synchronously. A response is only
   * allowed to sign the customer in if it answered *this* challenge, which is
   * what keeps a slow first request from verifying a code the customer has
   * already replaced.
   */
  const challengeRef = useRef<OtpChallenge | null>(null);
  /** `submitting` is for the button; this is for the double-submit that happens before a re-render. */
  const submittingRef = useRef(false);
  const requestingRef = useRef(false);
  /**
   * The challenge whose code the backend already accepted. A code is spent the
   * moment it works, so a second send of the same one can only earn
   * `409 Customer.OtpAlreadyUsed` — or a rate limit — on top of a login that
   * already succeeded while the redirect was still catching up.
   */
  const spentChallengeIdRef = useRef<string | null>(null);

  // Navigation happens only after auth has committed, so the route guard
  // cannot bounce a freshly signed-in customer back to /login.
  useEffect(() => {
    if (ready && loggedIn) router.replace(next);
  }, [loggedIn, next, ready, router]);

  /*
   * Both countdowns tick on the same beat but end on their own schedule: the
   * code dies when its lifetime runs out, the resend link comes back when the
   * cooldown (or the server's `Retry-After`) does.
   */
  useEffect(() => {
    if (codeSeconds <= 0 && backoffSeconds <= 0) return;
    const timer = setTimeout(() => {
      if (codeSeconds > 0) setCodeSeconds((value) => Math.max(0, value - 1));
      if (backoffSeconds > 0) setBackoffSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [codeSeconds, backoffSeconds]);

  /*
   * A code retires with the countdown the popup already shows. Keeping the
   * number readable after it expired would let someone reopen the dialog and
   * copy a dead code, so the screen drops it exactly when the timer said it
   * would — and puts the challenge away, because the next verify could only
   * fail against it.
   */
  useEffect(() => {
    if (codeSeconds > 0 || !sent) return;
    setChallenge(null);
    challengeRef.current = null;
    setDemoCode(null);
    setAttemptsLeft(0);
    setShownCode(null);
    setCodeOpen(false);
    setSent(false);
    setError(t("انتهت صلاحية الكود، اطلب كود جديد"));
  }, [codeSeconds, sent, t]);

  const code = otp.join("");
  const canSubmit = sent && code.length === OTP_LENGTH && codeSeconds > 0;
  const codeTimer = formatCountdown(codeSeconds);
  const backoffTimer = formatCountdown(backoffSeconds);
  const channelLabel = channel === "whatsapp" ? t("واتساب") : t("رسالة SMS");
  const isRegistration = purpose === "Registration";
  const nameError = fieldErrors.name ?? "";
  const phoneError = fieldErrors.phone ?? "";
  const channelError = fieldErrors.channel ?? "";
  // A rejected code belongs to the six boxes; anything else the server said
  // about this step falls back to the same line, because there is nowhere else
  // to put it. One value, so the paragraph and the boxes cannot disagree.
  const codeError = fieldErrors.code ?? error;

  const showFieldError = useCallback((target: AuthFieldTarget | null, message: string) => {
    if (target && target !== "none") {
      setFieldErrors((current) => ({ ...current, [target]: message }));
      return;
    }
    setError(message);
  }, []);

  const clearError = useCallback(() => {
    setError("");
    setFieldErrors({});
    setAccountRefused(false);
  }, []);

  /**
   * Opens the six boxes for typing, and focuses them unless the copyable popup
   * is about to cover the card — focus stays inside the dialog instead of being
   * pulled to an input sitting behind the overlay.
   */
  const startChallenge = useCallback((focusOtp: boolean, lifetimeSeconds: number) => {
    setSent(true);
    setCodeSeconds(lifetimeSeconds);
    setBackoffSeconds(resendCooldownSeconds(lifetimeSeconds));
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
    setFieldErrors({});
    setAccountRefused(false);
    if (focusOtp) setTimeout(() => inputs.current[0]?.focus(), 120);
  }, []);

  const showCode = useCallback(
    (issued: string | null, lifetimeSeconds: number, origin: CodeOrigin) => {
      const visible = issued && (origin === "demo" || apiDevCodeVisible()) ? issued : null;
      setShownCode(visible);
      setCodeOpen(Boolean(visible));
      startChallenge(!visible, lifetimeSeconds);
      return visible;
    },
    [startChallenge],
  );

  /**
   * Puts the challenge away and returns to the phone step.
   *
   * Boxes go back to disabled rather than staying open with a dead code in
   * them: every caller of this has just been told, in the message above the
   * button, that a new code is the only way forward.
   */
  const retireChallenge = useCallback((cooldownSeconds = 0) => {
    challengeRef.current = null;
    setChallenge(null);
    setDemoCode(null);
    setAttemptsLeft(0);
    setShownCode(null);
    setCodeOpen(false);
    setSent(false);
    setCodeSeconds(0);
    setBackoffSeconds(cooldownSeconds);
    setOtp(Array(OTP_LENGTH).fill(""));
  }, []);

  const sendCode = useCallback(async () => {
    if (requestingRef.current) return;
    // A refused account is not something a second code can fix. The guard comes
    // before anything is cleared so the support message cannot be erased by the
    // very button that would have sent another request.
    if (accountRefused) return;
    const normalized = normalizeEgyptianPhone(phone);
    if (!isUsablePhone(normalized)) {
      setFieldErrors((current) => ({ ...current, phone: t("اكتب رقم موبايل صحيح الأول") }));
      toast(t("اكتب رقم موبايل صحيح الأول"), "info");
      return;
    }
    // `Registration` is what names the new profile. Asking after the SMS has
    // been sent means the customer has to come back here anyway, so the field
    // is checked on the way out.
    if (isRegistration && !fullName.trim()) {
      setFieldErrors((current) => ({ ...current, name: t("اكتب اسمك بالكامل") }));
      return;
    }
    clearError();

    if (transport === "demo") {
      // The app is the SMS gateway here, so it mints the code — randomly, the
      // way a real one arrives, and never a number one customer can reuse
      // against another.
      const issued = generateOtpCode();
      if (!issued) {
        // No cryptographic source is not a reason to fall back to a guessable
        // code. It is a reason to stop and say so.
        const message = t("متصفحك مش بيقدر يولّد كود آمن، جرب متصفح تاني");
        setError(message);
        toast(message, "info");
        return;
      }
      challengeRef.current = null;
      setChallenge(null);
      setDemoCode(issued);
      setAttemptsLeft(DEMO_MAX_ATTEMPTS);
      showCode(issued, RESEND_COOLDOWN_SECONDS, "demo");
      toast(t("تم إرسال كود التحقق على موبايلك — كود التجربة {code}", { code: issued }), "info");
      return;
    }

    requestingRef.current = true;
    setRequesting(true);
    try {
      const result = await requestOtp({
        phoneNumber: normalized,
        channel,
        purpose,
      });
      challengeRef.current = result;
      setChallenge(result);
      // The code's own lifetime drives both clocks: the boxes stay open for as
      // long as it is verifiable, and the resend link waits the shorter of that
      // and the local cooldown.
      showCode(result.devOtpCode, codeSecondsLeft(result) || DEFAULT_CHALLENGE_SECONDS, "api");
      toast(t("تم إرسال كود التحقق عن طريق {channel}", { channel: channelLabel }), "info");
    } catch (cause) {
      const message = t(apiErrorMessageKey(cause));
      showFieldError(apiErrorFieldTarget(cause), message);
      toast(message, "info");
      const cooldown = retryBackoffSeconds(cause, RESEND_COOLDOWN_SECONDS);
      if (cooldown !== null) {
        // The contract says a 429 carries `Retry-After`. Show that number as a
        // live countdown instead of leaving the customer with a send button
        // that silently refuses to do anything.
        retireChallenge(Math.max(1, cooldown));
      } else if (cause instanceof ApiError && cause.kind !== "offline" && cause.kind !== "timeout") {
        // Nothing came back that can be answered with a code, so the challenge
        // this attempt was meant to replace is gone.
        retireChallenge(0);
      }
    } finally {
      requestingRef.current = false;
      setRequesting(false);
    }
  }, [
    accountRefused,
    channel,
    channelLabel,
    clearError,
    fullName,
    isRegistration,
    phone,
    retireChallenge,
    showCode,
    showFieldError,
    t,
    toast,
    transport,
    purpose,
  ]);

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setError("");
    setFieldErrors((current) => ({ ...current, code: undefined }));
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    event.preventDefault();
    setError("");
    setFieldErrors({});
    const filled = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => text[index] ?? "");
    setOtp(filled);
    inputs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  /**
   * Step 2, in one place, because three things can start it: the form's submit
   * button, the browser's implicit submission on the last box, and the effect
   * that fires when the sixth digit lands. `submittingRef` is what makes the
   * three of them one request.
   */
  const verify = useCallback(async () => {
    if (submittingRef.current) return;
    if (!sent) {
      setError(t("اطلب كود التحقق الأول"));
      return;
    }
    const trimmed = code.trim();
    if (trimmed.length !== OTP_LENGTH) {
      setError(t("اكتب كود التحقق كامل"));
      return;
    }
    if (codeSeconds <= 0) {
      setError(t("انتهت صلاحية الكود، اطلب كود جديد"));
      return;
    }
    const typedName = fullName.trim();

    if (transport === "demo") {
      if (!demoCode) {
        // Nothing to compare against: the countdown ran out, or this screen has
        // not issued a code at all.
        setError(t("انتهت صلاحية الكود، اطلب كود جديد"));
        return;
      }
      if (trimmed !== demoCode) {
        const left = attemptsLeft - 1;
        setOtp(Array(OTP_LENGTH).fill(""));
        inputs.current[0]?.focus();
        if (left > 0) {
          setAttemptsLeft(left);
          setFieldErrors({ code: t("الكود غير صحيح، جرب تاني — فاضل {n} محاولات", { n: left }) });
          toast(t("الكود غير صحيح، جرب تاني"), "info");
        } else {
          // Six digits are a million guesses and a script makes those guesses
          // cheap, so the last wrong try burns the code and puts the same waiting
          // window on the send button a rate-limited backend would.
          retireChallenge(RESEND_COOLDOWN_SECONDS);
          const message = t("عدد محاولات زايد، استنى شوية وجرب تاني");
          setError(message);
          toast(message, "info");
        }
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      clearError();
      submittingRef.current = true;
      setSubmitting(true);
      // The credential has done its job; keep no copy of it around.
      setDemoCode(null);
      setAttemptsLeft(0);
      setOtp(Array(OTP_LENGTH).fill(""));
      // There is no backend to register against, but the customer is still the
      // person they just typed: the name and the mobile they signed in with land
      // on the account, so a new customer never inherits the seeded demo
      // identity on every screen.
      const signedInPhone = normalizeEgyptianPhone(phone);
      // The local customer table is this mode's backend row. Remembering the
      // typed name here is what makes the next login — after a logout reset the
      // visible profile, or after a reload — answer with the same name the
      // customer registered, instead of the neutral seed identity.
      if (typedName) rememberLocalCustomer(signedInPhone, typedName);
      const name = typedName || localCustomer(signedInPhone)?.fullName || "";
      if (name) {
        updateProfile({ name, phone: signedInPhone });
      } else if (profile.phone === signedInPhone) {
        // Same device, same phone, name edited on the account screen: keep it.
        updateProfile({ phone: signedInPhone });
      } else {
        // A different phone with no name anywhere is a new local customer: the
        // previous person's name and photo must not travel with the slot.
        updateProfile({ ...seedProfile, phone: signedInPhone });
      }
      // The same proof, the same slot: what this number saved — favorites,
      // orders, points — comes back with the name, and a number that saved
      // nothing starts empty instead of wearing the seeded demo history.
      adoptLocalAccount(signedInPhone);
      login();
      return;
    }

    const active = challengeRef.current;
    // No live challenge, or a challenge whose code was already accepted: either
    // way the only way forward is a new code, and the boxes must not spend the
    // old one a second time.
    if (!active || spentChallengeIdRef.current === active.challengeId) {
      setError(t("انتهت صلاحية الكود، اطلب كود جديد"));
      return;
    }

    clearError();
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const payload = await verifyOtp({
        challengeId: active.challengeId,
        code: trimmed,
        fullName: typedName,
      });
      // A newer challenge means this answer is history: the customer asked for
      // another code while this request was open, and signing in on the strength
      // of the old one would be a guess about which phone got which SMS.
      if (challengeRef.current?.challengeId !== active.challengeId) return;
      // Spent, and cleared before anything else reads the boxes.
      spentChallengeIdRef.current = active.challengeId;
      setOtp(Array(OTP_LENGTH).fill(""));
      // A first-time customer is named by what they just typed. If the backend
      // answered without a name — because it kept an existing account's empty
      // one — the typed name is still the truth about this customer, so the
      // account screen must not fall back to the demo identity.
      let session: CustomerSessionPayload =
        payload.fullName || !typedName ? payload : { ...payload, fullName: typedName };

      // The API's own status says this account still needs a first and last
      // name, and its order endpoints refuse an incomplete profile. The sign-in
      // screen already collected a name, so finish the profile now instead of
      // leaving the account half-created. A failure here must not cost the
      // session: the account screen can complete it later.
      if (payload.nextStep === "CompleteProfile" && typedName) {
        try {
          const { firstName, lastName } = splitFullName(typedName);
          const completed = await completeProfileRequest({
            accessToken: payload.accessToken,
            firstName,
            lastName,
            email: payload.email,
          });
          session = {
            ...session,
            customerId: completed.profile.customerId || session.customerId,
            phoneNumber: completed.profile.phoneNumber ?? session.phoneNumber,
            fullName: completed.profile.fullName ?? session.fullName,
            email: completed.profile.email ?? session.email,
            accessToken: completed.session.accessToken,
            tokenType: completed.session.tokenType,
            expiresIn: completed.session.expiresIn,
            expiresAtUtc: completed.session.expiresAtUtc,
            isPhoneVerified: completed.profile.isPhoneVerified,
            isEmailVerified: completed.profile.isEmailVerified,
            profileCompleted: completed.profile.profileCompleted,
            nextStep: completed.profile.nextStep,
          };
        } catch {
          // Keep the session the verify already granted.
        }
      }

      login(session);
    } catch (cause) {
      if (challengeRef.current?.challengeId !== active.challengeId) return;
      const message = t(apiErrorMessageKey(cause));
      const failed = cause instanceof ApiError ? cause : null;
      const domainCode = failed?.code ?? null;
      showFieldError(apiErrorFieldTarget(cause), message);
      toast(message, "info");
      // A wrong code leaves the challenge standing — the contract allows five
      // of them — so only the boxes are cleared.
      setOtp(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();

      if (domainCode && NEW_CODE_REQUIRED_CODES.has(domainCode)) {
        retireChallenge(0);
      } else if (domainCode === "Customer.NotFoundByPhone") {
        // `Login` on a phone with no account. The guide's answer is to
        // register, and the phone they just proved they hold is prefilled.
        retireChallenge(0);
        setPurpose("Registration");
        setFieldErrors({ name: t("اكتب اسمك بالكامل") });
      } else if (domainCode && ACCOUNT_REFUSED_CODES.has(domainCode)) {
        // Nothing a retry can fix: the account itself is stopped. The message
        // names support, and the screen stops offering another attempt.
        retireChallenge(0);
        setAccountRefused(true);
      } else {
        const cooldown = retryBackoffSeconds(cause, RESEND_COOLDOWN_SECONDS);
        if (cooldown !== null) retireChallenge(Math.max(1, cooldown));
      }
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [
    adoptLocalAccount,
    attemptsLeft,
    clearError,
    code,
    codeSeconds,
    demoCode,
    fullName,
    login,
    phone,
    profile,
    retireChallenge,
    sent,
    showFieldError,
    t,
    toast,
    transport,
    updateProfile,
  ]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void verify();
  };

  /* Six digits are the whole form: the last one submits it. The guard in
     `verify` is what stops this firing twice for one code. */
  useEffect(() => {
    if (!sent || requesting || code.length !== OTP_LENGTH || codeSeconds <= 0) return;
    if (submittingRef.current) return;
    void verify();
  }, [verify, code, sent, codeSeconds, requesting]);

  const card = (
    <div className="motion-pop flex min-h-[calc(100dvh-186px)] flex-col rounded-card bg-white px-4 pb-8 pt-9 shadow-soft lg:min-h-0 lg:rounded-[30px] lg:p-8">
      <div className="flex justify-end" dir="ltr">
        <span className="grid size-14 place-items-center rounded-[18px] bg-brand-soft text-brand lg:size-14">
          <Phone className="size-5 lg:size-6" />
        </span>
      </div>

      <h2 className="mt-3 text-[20px] font-extrabold lg:text-[28px]">
        {isRegistration ? t("أنشئ حساب جديد") : t("تسجيل الدخول")}
      </h2>
      <p className="mt-2 max-w-md text-[11px] leading-6 text-muted lg:text-sm lg:leading-7">
        {isRegistration
          ? t("ادخل رقم موبايلك واسمك، وهنبعتلك كود تحقق عن طريق {channel} عشان تعمل حساب وتكمل طلبك.", {
              channel: channelLabel,
            })
          : t("ادخل رقم موبايلك، وهنبعتلك كود تحقق عن طريق {channel} عشان تسجل دخولك وتكمل طلبك.", {
              channel: channelLabel,
            })}
      </p>

      <form onSubmit={onSubmit} noValidate>
        {/* One account, two doors: the guide keeps login and registration on the
            same flow, and the only thing that changes is whether a name is
            needed and what the backend does with an unknown phone number. */}
        <div className="mt-5">
          <span className="text-xs font-extrabold" id="otp-purpose-label">
            {t("عندك حساب عندنا؟")}
          </span>
          <div role="radiogroup" aria-labelledby="otp-purpose-label" className="mt-2 grid grid-cols-2 gap-2">
            {OTP_PURPOSES.map((option) => {
              const Icon = option.icon;
              const active = purpose === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-xs font-extrabold transition ${
                    active
                      ? "border-brand bg-brand-soft/35 text-brand"
                      : "border-line bg-white text-muted hover:border-brand/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="otp-purpose"
                    value={option.value}
                    checked={active}
                    onChange={() => {
                      setPurpose(option.value);
                      setFieldErrors((current) => ({ ...current, channel: undefined }));
                    }}
                    className="sr-only"
                  />
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {t(option.label)}
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="phone" className="text-xs font-extrabold">
            {t("رقم الموبايل")}
          </label>
          <div className="mt-2 flex h-14 items-center rounded-xl border border-line bg-white px-1.5 transition focus-within:border-brand/45">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setFieldErrors((current) => ({ ...current, phone: undefined }));
                // A different number is a different account, so a refusal that
                // ended the previous one does not speak for this one.
                setAccountRefused(false);
              }}
              placeholder={t("ادخل رقم موبايلك")}
              aria-describedby={phoneError ? "phone-error" : "phone-hint"}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none"
            />
            <span className="mx-1 flex shrink-0 items-center gap-1.5 border-e border-line pe-3 text-xs font-bold">
              {t("مصر")}
              <span className="text-muted" dir="ltr">
                +20
              </span>
            </span>
            <button
              type="button"
              onClick={sendCode}
              disabled={requesting || backoffSeconds > 0 || accountRefused}
              aria-busy={requesting}
              className={buttonStyles({ variant: "brand", size: "xs", className: "ms-1.5" })}
            >
              {requesting ? (
                <LoadingIndicator className="size-4" label={t("جارٍ إرسال الكود")} />
              ) : (
                <>
                  <Send className="size-3.5" />
                  {t("إرسال")}
                </>
              )}
            </button>
          </div>
          {phoneError ? (
            <p id="phone-error" role="alert" className="motion-fade mt-1.5 text-end text-[11px] font-semibold text-brand">
              {phoneError}
            </p>
          ) : (
            <p id="phone-hint" className="mt-2 text-end text-[10px] text-muted">
              {t("استخدم رقم موبايل مصري لاستلام كود التحقق")}
            </p>
          )}
        </div>

        {/* `channel` is a documented input on the OTP request, so the customer
           chooses where the code goes instead of the app always asking for SMS. */}
        <div className="mt-5">
          <span className="text-xs font-extrabold" id="otp-channel-label">
            {t("طريقة استلام الكود")}
          </span>
          <div
            role="radiogroup"
            aria-labelledby="otp-channel-label"
            aria-describedby={channelError ? "otp-channel-error" : undefined}
            className="mt-2 grid grid-cols-2 gap-2"
          >
            {OTP_CHANNELS.map((option) => {
              const Icon = option.icon;
              const active = channel === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-xs font-extrabold transition ${
                    active
                      ? "border-brand bg-brand-soft/35 text-brand"
                      : "border-line bg-white text-muted hover:border-brand/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="otp-channel"
                    value={option.value}
                    checked={active}
                    onChange={() => {
                      setChannel(option.value);
                      setFieldErrors((current) => ({ ...current, channel: undefined }));
                    }}
                    className="sr-only"
                  />
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {t(option.label)}
                </label>
              );
            })}
          </div>
          {channelError ? (
            <p id="otp-channel-error" role="alert" className="motion-fade mt-1.5 text-end text-[11px] font-semibold text-brand">
              {channelError}
            </p>
          ) : null}
        </div>

        {/* The name is what registers a first-time customer — with the API it goes
            in the verify body, without it the account is built from it locally,
            so the field is offered in both modes. */}
        <div className="mt-5">
          <div className="flex items-baseline gap-1.5">
            <label htmlFor="full-name" className="text-xs font-extrabold">
              {t("الاسم بالكامل")}
            </label>
            <span className="text-[10px] font-bold text-muted">
              {isRegistration ? t("مطلوب لتسجيل حساب جديد") : t("اختياري")}
            </span>
          </div>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value.slice(0, 200));
              setFieldErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder={isRegistration ? t("اكتب اسمك بالكامل") : t("اتركه فاضي لو مسجل قبلي")}
            aria-describedby={nameError ? "full-name-error" : undefined}
            className="mt-2 h-14 w-full rounded-xl border border-line bg-white px-4 text-sm font-semibold outline-none transition placeholder:text-muted focus:border-brand/45"
          />
          {nameError ? (
            <p id="full-name-error" role="alert" className="motion-fade mt-1.5 text-end text-[11px] font-semibold text-brand">
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <span className="text-xs font-extrabold" id="otp-code-label">
            {t("كود التحقق")}
          </span>
          <div
            role="group"
            aria-labelledby="otp-code-label"
            className="mt-2.5 flex items-center justify-center gap-1 lg:gap-2"
            dir="ltr"
          >
            {otp.map((digit, index) => (
              <div key={index} className="flex items-center gap-1.5 lg:gap-2">
                <input
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event)}
                  onPaste={onPaste}
                  disabled={!sent}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  aria-label={t("خانة الكود {n}", { n: index + 1 })}
                  aria-describedby={codeError ? "otp-code-error" : undefined}
                  className={`h-[42px] w-[42px] rounded-xl border-2 text-center text-lg font-extrabold outline-none transition disabled:cursor-not-allowed disabled:bg-cream-100 disabled:text-muted lg:h-14 lg:w-12 lg:text-xl ${
                    digit
                      ? "border-brand/60 bg-brand-soft/25 text-brand"
                      : index === 0
                        ? "border-brand bg-white"
                        : "border-line bg-white"
                  } focus:border-brand focus:ring-4 focus:ring-brand/5`}
                />
                {index === 2 ? <span className="mx-0.5 h-7 w-px bg-line lg:mx-1" /> : null}
              </div>
            ))}
          </div>
          <p className="mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-end text-[10px] text-muted">
            {sent && shownCode ? (
              <span className="select-all" dir="ltr">
                {t("استخدم كود التجربة {code} لإكمال تسجيل الدخول.", { code: shownCode })}
              </span>
            ) : (
              t("اكتب الكود اللي وصل في {channel}", { channel: channelLabel })
            )}
            {sent && shownCode && !codeOpen ? (
              <button
                type="button"
                onClick={() => setCodeOpen(true)}
                className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-dark"
              >
                <Eye className="size-3" />
                {t("إظهار الكود")}
              </button>
            ) : null}
          </p>
          {codeError ? (
            <p id="otp-code-error" role="alert" className="motion-fade mt-1.5 text-end text-[11px] font-semibold text-brand">
              {codeError}
            </p>
          ) : null}
          {accountRefused ? (
            <p className="mt-1.5 text-end text-[11px] font-semibold">
              <Link href="/help" className="font-bold text-brand hover:text-brand-dark">
                {t("تواصل مع خدمة العملاء")}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted">
          <span>{t("موصلش الكود؟")}</span>
          {backoffSeconds > 0 ? (
            <span>
              {sent ? t("إعادة الإرسال بعد") : t("معاودة الطلب بعد")}{" "}
              <span className="font-bold text-ink" dir="ltr">
                {backoffTimer}
              </span>
            </span>
          ) : !sent ? (
            <span className="font-bold text-ink">{t("اطلب الكود من زر إرسال")}</span>
          ) : (
            <button
              type="button"
              onClick={sendCode}
              disabled={requesting || accountRefused}
              className="font-bold text-brand hover:text-brand-dark disabled:text-muted"
            >
              {t("إعادة إرسال الكود")}
            </button>
          )}
        </div>

        {sent && codeSeconds > 0 ? (
          <p className="mt-2 text-end text-[10px] text-muted">
            {t("الكود صالح لمدة")}{" "}
            <span className="font-bold text-ink" dir="ltr">
              {codeTimer}
            </span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          aria-busy={submitting}
          className={buttonStyles({
            variant: "brand",
            size: "lg",
            block: true,
            className: "mt-5",
          })}
        >
          {submitting ? (
            <LoadingIndicator className="size-6" label={t("جارٍ تسجيل الدخول")} />
          ) : (
            <>
              {canSubmit ? <Check className="size-4" /> : null}
              {isRegistration ? t("تأكيد الكود وإنشاء الحساب") : t("تأكيد الكود والمتابعة")}
              <ArrowLeft className="size-4 ltr:rotate-180" />
            </>
          )}
        </button>
      </form>

      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-4 lg:mt-7">
        <div className="flex-1">
          <p className="text-[11px] font-extrabold">{t("طلبك محفوظ، ولسه فاضل تأكيده")}</p>
          <p className="mt-1 text-[10px] leading-5 text-muted">
            {t("بعد تسجيل الدخول هتأكد بيانات التوصيل وتختار طريقة الدفع.")}
          </p>
        </div>
        <ShieldCheck className="size-6 shrink-0 text-brand" strokeWidth={1.6} />
      </div>

      <p className="mt-4 hidden text-center text-[10px] text-muted lg:block">
        {sent ? t("تم إرسال الكود — ") : ""}
        {t("بالدخول أنت موافق على")}{" "}
        <Link href="/settings" className="font-bold text-brand">
          {t("الشروط والأحكام")}
        </Link>
      </p>
    </div>
  );

  return (
    <div className="pb-10">
      <div className="relative mx-auto mt-6 flex h-14 max-w-[343px] items-center justify-center lg:hidden">
        <BackLink href="/" className="absolute start-0 top-0" />
        <LogoMark className="motion-pop size-14" />
      </div>

      <div className="hidden lg:block lg:pt-8">
        <div className="shell">
          <div className="flex items-center justify-between">
            <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: isRegistration ? "حساب جديد" : "تسجيل الدخول" }]} />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
            >
              {t("الرجوع للرئيسية")}
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="mt-4 flex items-end justify-start gap-8">
            <div className="max-w-xl text-start">
              <h1 className="text-[34px] font-extrabold leading-[1.3]">
                {isRegistration ? t("اعمل حساب جديد وكمل طلبك") : t("سجّل دخولك وكمل طلبك")}
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t("خطوة بسيطة قبل ما تأكد عنوانك وتختار طريقة الدفع.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shell mt-1 lg:mt-7">
        <div className="mx-auto grid w-full max-w-[480px] gap-5 lg:max-w-[720px]">
          <div>{card}</div>
        </div>
      </div>

      {/* The code is shown as selectable text the moment it is issued. */}
      {codeOpen && shownCode ? (
        <OtpCodeDialog
          code={shownCode}
          channel={channel}
          expiresInSeconds={codeSeconds}
          onClose={() => setCodeOpen(false)}
        />
      ) : null}
    </div>
  );
}
