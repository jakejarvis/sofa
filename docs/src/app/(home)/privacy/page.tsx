import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Sofa handles your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-sm prose-invert mx-auto max-w-3xl px-6 py-16 [&_a]:text-fd-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-fd-primary/80 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:border-b [&_h2]:pb-2 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-fd-muted-foreground [&_p]:text-[15px] [&_p]:leading-relaxed [&_li]:text-fd-muted-foreground [&_li]:text-[15px] [&_li]:leading-relaxed [&_ul]:space-y-1 [&_strong]:text-fd-foreground [&_strong]:font-medium">
      <h1 className="font-display text-3xl tracking-tight mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-fd-muted-foreground/60 !mt-0 mb-8">
        Last updated: March 16, 2026
      </p>

      <p>
        Sofa is a self-hosted application. When you run Sofa, your data lives on
        your own server and is under your control. This policy describes what
        data Sofa stores, what it sends externally, and how you can control it.
      </p>

      <h2>Data Stored on Your Server</h2>

      <p>
        All of the following data is stored locally in a single SQLite database
        file on the machine running Sofa.
      </p>

      <h3>Account Information</h3>
      <ul>
        <li>Email address, display name, and hashed password</li>
        <li>
          Session tokens, IP address, and user agent string of active sessions
        </li>
        <li>
          If using OIDC/SSO: provider account IDs and OAuth tokens from your
          identity provider
        </li>
      </ul>

      <h3>Viewing Activity</h3>
      <ul>
        <li>
          Watchlist status (e.g. &ldquo;watching&rdquo;,
          &ldquo;completed&rdquo;) for movies and TV shows
        </li>
        <li>Individual movie and episode watch timestamps</li>
        <li>Personal ratings</li>
        <li>
          Source of each watch event (manual entry, or imported from Plex,
          Jellyfin, or Emby)
        </li>
      </ul>

      <h3>Media Metadata</h3>
      <p>
        Movie, TV show, season, episode, and cast/crew metadata is fetched from{" "}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          The Movie Database (TMDB)
        </a>{" "}
        and cached locally. This includes titles, descriptions, images, genres,
        streaming availability, and related recommendations. No personal data is
        included in this metadata.
      </p>

      <h3>Backups</h3>
      <p>
        Manual and scheduled backups are full copies of the database stored on
        your server. They contain all of the data described above. Backup
        management (creation, download, deletion) requires admin authentication.
      </p>

      <h2>External Services</h2>

      <p>
        Sofa communicates with the following external services during normal
        operation.
      </p>

      <h3>The Movie Database (TMDB)</h3>
      <p>
        Your server makes API requests to TMDB to fetch and refresh movie and TV
        metadata. These requests include your TMDB API key and the IDs or search
        queries for titles being looked up. A single API key is used for the
        entire instance &mdash; TMDB cannot identify individual users. No
        personal data (watch history, ratings, etc.) is ever sent to TMDB.
      </p>
      <p>
        When the local image cache is enabled (the default), poster and backdrop
        images are downloaded from the TMDB CDN and served from your server.
        When disabled, images are loaded directly from TMDB&rsquo;s CDN by the
        client.
      </p>

      <h3>Sofa Public API</h3>
      <p>Your server may contact the Sofa public API for two purposes:</p>
      <ul>
        <li>
          <strong>Update checks</strong> &mdash; a periodic request to{" "}
          <code>public-api.sofa.watch</code> to check for new releases. Only a
          user agent string is sent; no instance or user data is included. Can
          be disabled in admin settings.
        </li>
        <li>
          <strong>Telemetry</strong> &mdash; an optional, anonymous report sent
          at most once every 24 hours. It includes a random instance ID, the
          Sofa version, CPU architecture, bucketed user and title counts (e.g.
          &ldquo;2-5&rdquo;), and which optional features are enabled. No
          personal data, watch history, or exact counts are included. Telemetry
          is <strong>disabled by default</strong> and must be explicitly enabled
          by an admin. See the{" "}
          <Link href="/docs/telemetry">telemetry documentation</Link> for full
          details.
        </li>
      </ul>

      <h3>PostHog (Mobile App Only)</h3>
      <p>
        The native iOS and Android app includes optional, anonymous analytics
        powered by PostHog. This tracks screen views and app lifecycle events
        &mdash; no personal data, search queries, or watch history is collected.
        Analytics is <strong>disabled by default</strong> and requires explicit
        opt-in. On iOS, Apple&rsquo;s App Tracking Transparency prompt is shown
        first. You can change your preference at any time in the app&rsquo;s
        settings.
      </p>

      <h3>Media Server Integrations</h3>
      <p>
        If you connect Plex, Jellyfin, or Emby, those services send webhook
        events <em>to</em> your Sofa server when you finish watching something.
        This data is processed and stored locally. Sofa does not send data back
        to your media servers.
      </p>

      <h3>Sonarr & Radarr</h3>
      <p>
        If you use Sonarr or Radarr integration, those services pull your
        watchlist from Sofa via authenticated API requests. Sofa does not push
        data to them.
      </p>

      <h2>Cookies</h2>
      <p>
        Sofa uses a session cookie to keep you logged in. This cookie is
        HTTP-only, same-site, and contains only a session token. No third-party
        cookies are set by the web app.
      </p>

      <h2>Data Sharing</h2>
      <p>
        Because Sofa is self-hosted, there is no central service that has access
        to your data. The project maintainers have no access to your database,
        your watch history, or your account information. The only data that
        leaves your server is described in the{" "}
        <a href="#external-services">External Services</a> section above.
      </p>

      <h2>Data Retention & Deletion</h2>
      <p>
        All data is stored in a single SQLite file on your server. You have full
        control over it:
      </p>
      <ul>
        <li>
          Admin users can delete other user accounts, which cascades to all
          associated viewing history and ratings
        </li>
        <li>
          Scheduled backups are automatically pruned after a configurable
          retention limit (default: 7)
        </li>
        <li>Sessions and verification tokens expire automatically</li>
        <li>Deleting the database file removes all data entirely</li>
      </ul>

      <h2>Children</h2>
      <p>
        Sofa is not directed at children under 13. Since the application is
        self-hosted, account creation is controlled entirely by the server
        administrator.
      </p>

      <h2>Open Source</h2>
      <p>
        Sofa is open source under the MIT License. You can audit exactly what
        data is collected and how it is handled by reviewing the{" "}
        <a
          href="https://github.com/jakejarvis/sofa"
          target="_blank"
          rel="noopener noreferrer"
        >
          source code
        </a>
        .
      </p>

      <h2>Changes</h2>
      <p>
        This policy may be updated as new features are added. Changes will be
        reflected in the &ldquo;Last updated&rdquo; date above and committed to
        the repository.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or concerns about privacy can be raised via{" "}
        <a
          href="https://github.com/jakejarvis/sofa/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Issues
        </a>
        .
      </p>
    </article>
  );
}
