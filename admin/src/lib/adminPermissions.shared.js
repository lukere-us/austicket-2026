/** Permission catalog — keys stored in `admin_role_permissions.permission_key`. */
export const ADMIN_PERMISSION_GROUPS = [
  {
    id: 'site',
    label: 'Site settings',
    permissions: [
      { key: 'pages.sliderBanner', label: 'Slider & banner settings' },
      { key: 'pages.homeListings', label: 'Homepage listings settings' },
      { key: 'pages.footer', label: 'Footer settings' },
      { key: 'pages.header', label: 'Header settings' },
      { key: 'pages.partners', label: 'Partners slider settings' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    permissions: [
      { key: 'listings.list', label: 'Listings — view list' },
      { key: 'listings.show', label: 'Listings — view record' },
      { key: 'listings.new', label: 'Listings — create' },
      { key: 'listings.edit', label: 'Listings — edit' },
      { key: 'listings.delete', label: 'Listings — delete' },
      { key: 'listings.duplicate', label: 'Listings — duplicate' },
      { key: 'types.list', label: 'Types — view list' },
      { key: 'types.show', label: 'Types — view record' },
      { key: 'types.new', label: 'Types — create' },
      { key: 'types.edit', label: 'Types — edit' },
      { key: 'types.delete', label: 'Types — delete' },
      { key: 'promotions.list', label: 'Promotions — view list' },
      { key: 'promotions.show', label: 'Promotions — view record' },
      { key: 'promotions.new', label: 'Promotions — create' },
      { key: 'promotions.edit', label: 'Promotions — edit' },
      { key: 'promotions.delete', label: 'Promotions — delete' },
      { key: 'listing_gallery_images.list', label: 'Gallery images — view list' },
      { key: 'listing_gallery_images.show', label: 'Gallery images — view record' },
      { key: 'listing_gallery_images.new', label: 'Gallery images — create' },
      { key: 'listing_gallery_images.edit', label: 'Gallery images — edit' },
      { key: 'listing_gallery_images.delete', label: 'Gallery images — delete' },
      { key: 'listing_related.list', label: 'Related listings — view list' },
      { key: 'listing_related.show', label: 'Related listings — view record' },
      { key: 'listing_related.new', label: 'Related listings — create' },
      { key: 'listing_related.edit', label: 'Related listings — edit' },
      { key: 'listing_related.delete', label: 'Related listings — delete' },
      { key: 'blogs.list', label: 'Blogs — view list' },
      { key: 'blogs.show', label: 'Blogs — view record' },
      { key: 'blogs.new', label: 'Blogs — create' },
      { key: 'blogs.edit', label: 'Blogs — edit' },
      { key: 'blogs.delete', label: 'Blogs — delete' },
      { key: 'casts.list', label: 'Cast — view list' },
      { key: 'casts.show', label: 'Cast — view record' },
      { key: 'casts.new', label: 'Cast — create' },
      { key: 'casts.edit', label: 'Cast — edit' },
      { key: 'casts.delete', label: 'Cast — delete' },
    ],
  },
  {
    id: 'locations',
    label: 'Locations',
    permissions: ['countries', 'states', 'cities', 'places'].flatMap((resource) => [
      { key: `${resource}.list`, label: `${resource} — view list` },
      { key: `${resource}.show`, label: `${resource} — view record` },
      { key: `${resource}.new`, label: `${resource} — create` },
      { key: `${resource}.edit`, label: `${resource} — edit` },
      { key: `${resource}.delete`, label: `${resource} — delete` },
    ]),
  },
  {
    id: 'users',
    label: 'Users',
    permissions: [
      { key: 'users.list', label: 'Users — view list' },
      { key: 'users.show', label: 'Users — view record' },
      { key: 'users.new', label: 'Users — create' },
      { key: 'users.edit', label: 'Users — edit' },
      { key: 'users.delete', label: 'Users — delete' },
    ],
  },
  {
    id: 'moderation',
    label: 'Moderation',
    permissions: [
      { key: 'comments.list', label: 'Comments — view list' },
      { key: 'comments.show', label: 'Comments — view record' },
      { key: 'comments.edit', label: 'Comments — edit' },
      { key: 'comments.delete', label: 'Comments — delete' },
      { key: 'ratings.list', label: 'Ratings — view list' },
      { key: 'ratings.show', label: 'Ratings — view record' },
      { key: 'ratings.edit', label: 'Ratings — edit' },
      { key: 'ratings.delete', label: 'Ratings — delete' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    permissions: [
      { key: 'login_events.list', label: 'Login events — view list' },
      { key: 'login_events.show', label: 'Login events — view record' },
      { key: 'page_visits.list', label: 'Page visits — view list' },
      { key: 'page_visits.show', label: 'Page visits — view record' },
      { key: 'booking_clicks.list', label: 'Booking clicks — view list' },
      { key: 'booking_clicks.show', label: 'Booking clicks — view record' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    permissions: [
      { key: 'admins.list', label: 'Admins — view list' },
      { key: 'admins.show', label: 'Admins — view record' },
      { key: 'admins.new', label: 'Admins — create' },
      { key: 'admins.edit', label: 'Admins — edit' },
      { key: 'admins.delete', label: 'Admins — delete' },
      { key: 'admin_roles.list', label: 'Roles — view list' },
      { key: 'admin_roles.show', label: 'Roles — view record' },
      { key: 'admin_roles.new', label: 'Roles — create' },
      { key: 'admin_roles.edit', label: 'Roles — edit' },
      { key: 'admin_roles.delete', label: 'Roles — delete' },
    ],
  },
  {
    id: 'uploads',
    label: 'Uploads',
    permissions: [{ key: 'uploads.use', label: 'Upload images in admin forms' }],
  },
]

export const ADMIN_PERMISSION_CATALOG = ADMIN_PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => ({
    ...permission,
    group: group.label,
  }))
)

export const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSION_CATALOG.map((p) => p.key)

/** Default grants for the `sub_admin` role (main_admin bypasses checks in code). */
export const SUB_ADMIN_DEFAULT_PERMISSION_KEYS = ADMIN_PERMISSION_KEYS.filter((key) => {
  if (key.startsWith('admins.') || key.startsWith('admin_roles.')) {
    return false
  }
  if (key.startsWith('login_events.') || key.startsWith('page_visits.') || key.startsWith('booking_clicks.')) {
    return false
  }
  if (key === 'pages.sliderBanner') return false
  return true
})

export function adminPermissionChoices() {
  return ADMIN_PERMISSION_CATALOG.map((p) => ({
    value: p.key,
    label: `${p.label} (${p.key})`,
  }))
}
