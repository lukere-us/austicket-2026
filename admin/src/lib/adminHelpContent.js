/** Full HTML admin guide — rendered inside Site settings → Help. */
export const ADMIN_HELP_HTML = `
<article class="admin-help-doc">
  <header class="admin-help-doc__hero">
    <p class="admin-help-doc__eyebrow">AUS Ticket Lanka</p>
    <h1>Admin management guide</h1>
    <p class="admin-help-doc__lead">
      This guide explains how to manage the public website from the admin panel: site settings,
      events (listings), blogs, locations, users, moderation, analytics, and staff access.
    </p>
    <p class="admin-help-doc__meta"><strong>Admin URL:</strong> <code>/admin</code> &nbsp;|&nbsp; <strong>Public site:</strong> homepage at <code>/</code></p>
  </header>

  <nav class="admin-help-doc__toc" aria-label="Table of contents">
    <h2>Contents</h2>
    <ol>
      <li><a href="#help-start">Getting started</a></li>
      <li><a href="#help-dashboard">Dashboard</a></li>
      <li><a href="#help-site-settings">Site settings</a></li>
      <li><a href="#help-listings">Listings (events)</a></li>
      <li><a href="#help-blogs">Blogs</a></li>
      <li><a href="#help-locations">Locations</a></li>
      <li><a href="#help-users">Public users</a></li>
      <li><a href="#help-moderation">Comments &amp; ratings</a></li>
      <li><a href="#help-analytics">Analytics</a></li>
      <li><a href="#help-staff">Admin users &amp; roles</a></li>
      <li><a href="#help-tips">Tips &amp; troubleshooting</a></li>
    </ol>
  </nav>

  <section id="help-start" class="admin-help-doc__section">
    <h2>1. Getting started</h2>
    <h3>Sign in</h3>
    <ol>
      <li>Open <code>http://localhost:3001/admin</code> (or your production admin URL).</li>
      <li>Enter your admin email and password.</li>
      <li>After login you land on the <strong>Dashboard</strong>.</li>
    </ol>
    <h3>Sidebar navigation</h3>
    <p>The left sidebar groups tools into collapsible sections (same pattern as <strong>Content</strong> or <strong>Locations</strong>):</p>
    <ul>
      <li><strong>Navigation</strong> — listings, blogs, types, promotions, locations, users, etc.</li>
      <li><strong>Site settings</strong> — homepage slider, listings layout, header, footer, partners, and this Help page.</li>
    </ul>
    <p>Click a group name to expand or collapse its child links. Your last open/closed state is remembered in the browser.</p>
    <h3>What you need before publishing events</h3>
    <ol>
      <li>Create or confirm <strong>Countries → States → Cities → Places</strong> (venues).</li>
      <li>Create a <strong>Type</strong> (e.g. Movie, Concert).</li>
      <li>Create a <strong>Listing</strong> with banner image, description, and at least one <strong>Show</strong> with showtimes in the correct country.</li>
      <li>Set listing <strong>Status</strong> to <code>published</code> and a <strong>Publish at</strong> date in the past (or now).</li>
    </ol>
    <div class="admin-help-doc__note">
      <strong>Note:</strong> Listings only appear on the homepage for a country when they have upcoming showtimes linked to places in that country.
    </div>
  </section>

  <section id="help-dashboard" class="admin-help-doc__section">
    <h2>2. Dashboard</h2>
    <p>The dashboard shows quick counts and recent activity:</p>
    <ul>
      <li><strong>Listing count</strong> — total listings in the database.</li>
      <li><strong>User count</strong> — registered public users.</li>
      <li><strong>Comments count</strong> — user comments on listings.</li>
      <li><strong>Recent listings</strong> — shortcut to edit the latest records.</li>
    </ul>
  </section>

  <section id="help-site-settings" class="admin-help-doc__section">
    <h2>3. Site settings</h2>
    <p>Open <strong>Site settings</strong> in the sidebar, then choose a child page.</p>

    <h3 id="help-slider">3.1 Slider &amp; Banner</h3>
    <p>Controls the homepage hero carousel and blurred background video/image.</p>
    <ul>
      <li><strong>Autoplay &amp; interaction</strong> — interval, pause on hover, max featured slides, nav buttons, dots.</li>
      <li><strong>Carousel layout (3D)</strong> — slide gap, spread, scale, rotation, poster heights for mobile/desktop.</li>
      <li><strong>Background</strong> — blur, fade, trailer video toggle, scrim overlays.</li>
      <li><strong>Homepage counters</strong> — four stat tiles (tickets, AUS events, NZ events, customers): labels, base values, animation duration.</li>
    </ul>
    <p>Featured slides are pulled from listings marked <strong>featured</strong> in the selected country. Click <strong>Save settings</strong> at the top or bottom of the form.</p>

    <h3 id="help-home-listings">3.2 Homepage listings</h3>
    <p>Controls the event grid below the hero.</p>
    <ul>
      <li><strong>Grid columns</strong> — per breakpoint (mobile / tablet / desktop).</li>
      <li><strong>Listings per page</strong> — pagination size (<code>0</code> = about 3 rows using desktop column count).</li>
      <li><strong>Section title</strong> — use <code>{location}</code> for city or country name.</li>
      <li><strong>City tabs</strong> — filter listings by city on the homepage.</li>
      <li><strong>Card options</strong> — type badge, hover CTA, aspect ratio, animations.</li>
    </ul>

    <h3 id="help-header">3.3 Header settings</h3>
    <ul>
      <li><strong>Default site name</strong> — fallback brand name in the header.</li>
      <li><strong>Australia / New Zealand site name</strong> — optional per-country override.</li>
      <li><strong>Tagline</strong> — supports <code>{location}</code>.</li>
      <li><strong>Logos & titles</strong> — each country from Locations gets its own logo and site name in Header settings. Add a country (with a code like LK), then set its branding under Pages → Header.</li>
      <li><strong>Navigation links</strong> — optional header links (e.g. Blog → <code>/blogs</code>).</li>
      <li><strong>Visibility</strong> — toggle search, country selector, theme toggle, login/register buttons.</li>
    </ul>

    <h3 id="help-footer">3.4 Footer settings</h3>
    <p>Configure footer columns, link groups, social URLs, copyright text, and optional city-specific footer content.</p>

    <h3 id="help-partners">3.5 Partners slider</h3>
    <p>“Our partners” infinite logo strip between homepage listings and blog.</p>
    <ul>
      <li>Upload partner logos (SVG, PNG, JPEG).</li>
      <li>Set scroll speed, gap, max logo height (default 100px), pause on hover.</li>
      <li><strong>Loading sequence</strong> — Random, Ascending (list order), or Descending.</li>
      <li>Optional name and link URL per logo.</li>
    </ul>
  </section>

  <section id="help-listings" class="admin-help-doc__section">
    <h2>4. Listings (events)</h2>
    <p><strong>Content → Listings</strong> is the main event catalogue. Each listing uses a tabbed editor.</p>

    <h3>4.1 Create a listing</h3>
    <ol>
      <li>Click <strong>Create new</strong>.</li>
      <li>Fill <strong>Basics</strong> — title, slug (auto from title), type, status, publish/unpublish dates.</li>
      <li>Upload <strong>Banner</strong> and optional <strong>Detail banner</strong> images.</li>
      <li>Add <strong>Description</strong> (rich HTML).</li>
      <li>Optional <strong>Trailer URL</strong> for hero background video.</li>
      <li>Mark <strong>Featured</strong> to include in the homepage carousel.</li>
    </ol>

    <h3>4.2 Shows &amp; showtimes</h3>
    <p>On the <strong>Shows</strong> tab, add one or more shows:</p>
    <ul>
      <li>Pick a <strong>Place</strong> (venue) — determines city and country visibility.</li>
      <li>Set start/end dates, booking URL, ticket cost.</li>
      <li>Add <strong>Show times</strong> (date/time rows). These drive “upcoming” display on cards and detail pages.</li>
    </ul>

    <h3>4.3 Cast, gallery, related</h3>
    <ul>
      <li><strong>Cast</strong> — link cast members or create new ones with photos.</li>
      <li><strong>Gallery</strong> — extra images (managed via Gallery images resource or inline grid).</li>
      <li><strong>Related listings</strong> — manual cross-links shown on the detail page.</li>
    </ul>

    <h3>4.4 Status workflow</h3>
    <table class="admin-help-doc__table">
      <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><code>draft</code></td><td>Hidden from the public site.</td></tr>
        <tr><td><code>published</code></td><td>Visible when publish date has passed and showtimes exist.</td></tr>
        <tr><td><code>unpublished</code></td><td>Explicitly hidden even if previously published.</td></tr>
      </tbody>
    </table>

    <h3>4.5 Duplicate listing</h3>
    <p>Use the <strong>Duplicate</strong> action on a listing to clone it (useful for similar events). Review slug, dates, and showtimes after duplicating.</p>

    <h3>4.6 Types &amp; promotions</h3>
    <ul>
      <li><strong>Types</strong> — categories (Movie, Theatre, etc.) with slug used in filters.</li>
      <li><strong>Promotions</strong> — promotional records linked to marketing (if used on site).</li>
    </ul>
  </section>

  <section id="help-blogs" class="admin-help-doc__section">
    <h2>5. Blogs</h2>
    <p><strong>Content → Blogs</strong> — create articles for <code>/blogs</code> and the homepage blog section.</p>
    <p><strong>Content → Pages</strong> — CMS pages with title, banner, optional parent (breadcrumbs), and rich-text detail. Public URL: <code>/{slug}</code> (not <code>/pages/…</code>).</p>
    <ul>
      <li><strong>Title &amp; slug</strong> — slug is generated from title; edit if needed.</li>
      <li><strong>Cover image</strong> — upload or set stored path.</li>
      <li><strong>Excerpt</strong> — short summary for cards.</li>
      <li><strong>Body</strong> — rich text editor.</li>
      <li><strong>Featured</strong> — highlight on homepage when enabled.</li>
      <li><strong>Status</strong> — publish when ready; only published posts appear publicly.</li>
    </ul>
  </section>

  <section id="help-locations" class="admin-help-doc__section">
    <h2>6. Locations</h2>
    <p>Hierarchy: <strong>Country → State → City → Place</strong>.</p>
    <ol>
      <li><strong>Countries</strong> — e.g. Australia, New Zealand; optional flag image.</li>
      <li><strong>States</strong> — linked to a country.</li>
      <li><strong>Cities</strong> — linked to a state; used for homepage city tabs and filters.</li>
      <li><strong>Places</strong> — venues with name, address, map link; linked to cities.</li>
    </ol>
    <p>Listings inherit country visibility through show → place → city → state → country.</p>
  </section>

  <section id="help-users" class="admin-help-doc__section">
    <h2>7. Public users</h2>
    <p><strong>Users → Users</strong> — registered front-end accounts (login, profile, comments, ratings).</p>
    <ul>
      <li>View and edit user records.</li>
      <li>Deactivate or remove users per your policy.</li>
    </ul>
  </section>

  <section id="help-moderation" class="admin-help-doc__section">
    <h2>8. Comments &amp; ratings</h2>
    <p><strong>Moderation</strong> section:</p>
    <ul>
      <li><strong>Comments</strong> — review or delete user comments on listings.</li>
      <li><strong>Ratings</strong> — inspect star ratings submitted by users.</li>
    </ul>
  </section>

  <section id="help-analytics" class="admin-help-doc__section">
    <h2>9. Analytics</h2>
    <p><strong>Analytics</strong> section (main admin typically):</p>
    <ul>
      <li><strong>Login events</strong> — user sign-in activity.</li>
      <li><strong>Page visits</strong> — tracked page views.</li>
      <li><strong>Booking clicks</strong> — outbound booking link clicks from listings.</li>
    </ul>
  </section>

  <section id="help-staff" class="admin-help-doc__section">
    <h2>10. Admin users &amp; roles</h2>
    <h3>Admin users</h3>
    <p><strong>Admin → Admins</strong> — staff accounts for this panel. Each admin has one <strong>role</strong>.</p>
    <h3>Roles &amp; permissions</h3>
    <p><strong>Admin → Roles</strong> — define what each role can do. When editing a role, tick permissions such as:</p>
    <ul>
      <li>Site settings pages (slider, homepage listings, header, footer, partners).</li>
      <li>Content (listings, blogs, types, …) — list / show / new / edit / delete.</li>
      <li>Locations, users, moderation, analytics, admin management.</li>
      <li><strong>Uploads</strong> — required to upload images in forms.</li>
    </ul>
    <p>The <strong>main_admin</strong> role bypasses all permission checks.</p>
  </section>

  <section id="help-tips" class="admin-help-doc__section">
    <h2>11. Tips &amp; troubleshooting</h2>
    <h3>Listing not on homepage?</h3>
    <ul>
      <li>Status must be <code>published</code>.</li>
      <li>Publish date must be in the past (or now).</li>
      <li>At least one show with a place in the visitor’s country and future showtimes.</li>
      <li>Check homepage pagination — it may be on page 2+.</li>
    </ul>
    <h3>Logo or image not updating?</h3>
    <ul>
      <li>Click <strong>Save</strong> on the settings form after upload.</li>
      <li>Hard-refresh the public site (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>).</li>
      <li>Restart the admin server after changing header logos (login page caches branding on startup).</li>
    </ul>
    <h3>Settings save failed?</h3>
    <ul>
      <li>Restart the admin server and hard-refresh the admin page.</li>
      <li>Confirm MySQL (XAMPP) is running and <code>site_settings</code> table exists.</li>
    </ul>
    <h3>Local development URLs</h3>
    <table class="admin-help-doc__table">
      <thead><tr><th>Service</th><th>Default URL</th></tr></thead>
      <tbody>
        <tr><td>Public frontend</td><td><code>http://localhost:3000</code></td></tr>
        <tr><td>Admin panel</td><td><code>http://localhost:3001/admin</code></td></tr>
        <tr><td>API</td><td><code>http://localhost/api</code></td></tr>
      </tbody>
    </table>
  </section>

  <footer class="admin-help-doc__footer">
    <p>Document version: 1.0 &nbsp;·&nbsp; AUS Ticket Lanka admin</p>
  </footer>
</article>
`
