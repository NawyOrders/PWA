"use client";

/**
 * Root error boundary. It replaces the root layout, so it must render its own
 * <html>/<body> and cannot use AppProvider context (the provider tree is what
 * failed). Copy is hard-coded in both languages to stay dependency-free.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1.25rem",
          backgroundColor: "#fbf3ea",
          color: "#2b211c",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 56, fontWeight: 800, color: "#e8452c", lineHeight: 1.1 }}>oops</p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.35rem", fontWeight: 800 }}>
            حاجة حصلت غلط في الصفحة
          </h1>
          <p style={{ margin: "0.75rem auto 0", maxWidth: 320, fontSize: "0.875rem", lineHeight: 1.8, color: "#7c6f68" }}>
            Something went wrong while loading the app. Try again, and if it keeps happening reach out on 19885.
          </p>
          {error.digest ? (
            <p dir="ltr" style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "#a1948c" }}>
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              height: 48,
              border: 0,
              borderRadius: 9999,
              backgroundColor: "#e8452c",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            حاول تاني
          </button>
        </main>
      </body>
    </html>
  );
}
