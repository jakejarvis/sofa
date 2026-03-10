"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <head>
        <style>{`
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'DM Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
            background-color: oklch(0.13 0.006 55);
            color: oklch(0.93 0.015 80);
            padding: 1.5rem;
            text-align: center;
            overflow: hidden;
          }
          .ge-glow {
            position: fixed;
            left: 50%;
            top: 40%;
            width: 400px;
            height: 400px;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: oklch(0.8 0.14 65 / 0.04);
            filter: blur(120px);
            pointer-events: none;
          }
          .ge-icon-ring {
            width: 48px;
            height: 48px;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            border: 1px solid oklch(0.8 0.14 65 / 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: oklch(0.8 0.14 65);
          }
          .ge-title {
            font-family: 'DM Serif Display', 'Georgia', ui-serif, serif;
            font-size: 1.75rem;
            font-weight: 400;
            letter-spacing: -0.01em;
            margin: 0 0 0.75rem;
          }
          .ge-desc {
            font-size: 0.875rem;
            line-height: 1.6;
            color: oklch(0.63 0.02 80);
            max-width: 22rem;
            margin: 0 auto 2rem;
          }
          .ge-digest {
            font-size: 0.7rem;
            font-family: monospace;
            color: oklch(0.63 0.02 80 / 0.5);
            margin-bottom: 1.5rem;
          }
          .ge-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
          }
          .ge-btn {
            height: 40px;
            padding: 0 1.5rem;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
          }
          .ge-btn-primary {
            border: none;
            background: oklch(0.8 0.14 65);
            color: oklch(0.13 0.006 55);
          }
          .ge-btn-primary:hover, .ge-btn-primary:focus-visible {
            box-shadow: 0 10px 25px -5px oklch(0.8 0.14 65 / 0.2);
          }
          .ge-btn-secondary {
            border: 1px solid oklch(1 0.015 65 / 0.1);
            background: transparent;
            color: oklch(0.93 0.015 80);
          }
          .ge-btn-secondary:hover, .ge-btn-secondary:focus-visible {
            border-color: oklch(0.8 0.14 65 / 0.4);
            background: oklch(0.8 0.14 65 / 0.05);
          }
        `}</style>
      </head>
      <body>
        <div className="ge-glow" />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="ge-icon-ring">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="Error"
            >
              <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
              <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
              <path d="M13.41 10.59l2.59 -2.59" />
            </svg>
          </div>

          <h1 className="ge-title">Intermission</h1>

          <p className="ge-desc">
            We hit a snag loading this page. This is usually temporary &mdash;
            try refreshing or come back in a moment.
          </p>

          {error.digest && (
            <p className="ge-digest">Error ID: {error.digest}</p>
          )}

          <div className="ge-actions">
            <button
              type="button"
              onClick={reset}
              className="ge-btn ge-btn-primary"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="ge-btn ge-btn-secondary"
            >
              Return home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
