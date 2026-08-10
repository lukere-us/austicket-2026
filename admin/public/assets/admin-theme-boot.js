;(function bootAdminTheme() {
  try {
    var match = String(document.cookie || '').match(/(?:^|;\s*)aus_admin_theme=([^;]*)/)
    var theme = match && match[1] === 'dark' ? 'dark' : 'light'
    try {
      var stored = window.localStorage.getItem('aus_admin_theme')
      if (stored === 'dark' || stored === 'light') theme = stored
    } catch (e) {}
    document.documentElement.dataset.adminTheme = theme
    document.documentElement.classList.toggle('admin-theme-dark', theme === 'dark')
    document.documentElement.classList.toggle('admin-theme-light', theme === 'light')
  } catch (e) {}
})()
