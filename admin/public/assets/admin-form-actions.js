;(function initAdminFormSaveBars() {
  const ENHANCED = 'data-save-bar-enhanced'

  function cloneActionButton(source) {
    const clone = source.cloneNode(true)
    clone.addEventListener('click', (event) => {
      event.preventDefault()
      source.click()
    })
    return clone
  }

  function findPrimaryAction(header) {
    if (!header) return null
    return (
      header.querySelector('button[type="submit"]') ||
      header.querySelector('a[role="button"][class*="primary"]') ||
      header.querySelector('button[class*="primary"]') ||
      header.querySelector('button')
    )
  }

  function enhanceDefaultRecordForm() {
    if (document.querySelector('[data-role-permissions-form]')) return
    if (document.querySelector('[data-blog-edit-form]')) return

    const header =
      document.querySelector('[data-css="action-header"]') ||
      document.querySelector('[data-css="action-bar"]') ||
      document.querySelector('[class*="ActionHeader"]')

    const form =
      document.querySelector('form[data-css="form"]') ||
      document.querySelector('section[data-css="drawer-content"] form') ||
      document.querySelector('main form')

    if (!form || form.getAttribute(ENHANCED) === '1') return

    const primary = findPrimaryAction(header)
    if (!primary) return

    form.setAttribute(ENHANCED, '1')

    const bottom = document.createElement('div')
    bottom.className = 'admin-form-save-bar admin-form-save-bar--bottom adminjs-default-form-save-bottom'
    bottom.appendChild(cloneActionButton(primary))
    form.appendChild(bottom)

    if (header) {
      header.classList.add('admin-form-save-bar', 'admin-form-save-bar--top', 'admin-form-save-bar--sticky')
    }
  }

  function run() {
    try {
      enhanceDefaultRecordForm()
    } catch {
      // ignore
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }

  const observer = new MutationObserver(() => run())
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()
