import React from 'react'
import { Box, Button } from '@adminjs/design-system'

function SaveActions({
  onSave,
  saving,
  saveLabel,
  savingLabel,
  disabled,
  extraActions,
  formId,
}) {
  return (
    <Box display="flex" gap="md" flexWrap="wrap" alignItems="center">
      <Button
        type={formId ? 'submit' : 'button'}
        form={formId || undefined}
        variant="primary"
        onClick={formId ? undefined : onSave}
        disabled={disabled || saving}
      >
        {saving ? savingLabel : saveLabel}
      </Button>
      {extraActions}
    </Box>
  )
}

export default function FormSaveChrome({
  children,
  onSave,
  saving = false,
  saveLabel = 'Save',
  savingLabel = 'Saving…',
  disabled = false,
  extraActions = null,
  formId = null,
  stickyTop = true,
}) {
  const topClass = [
    'admin-form-save-bar',
    'admin-form-save-bar--top',
    stickyTop ? 'admin-form-save-bar--sticky' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const actionProps = {
    onSave,
    saving,
    saveLabel,
    savingLabel,
    disabled,
    extraActions,
    formId,
  }

  return (
    <>
      <Box className={topClass} py="md" mb="lg">
        <SaveActions {...actionProps} />
      </Box>
      {children}
      <Box className="admin-form-save-bar admin-form-save-bar--bottom" mt="xxl" py="md">
        <SaveActions {...actionProps} />
      </Box>
    </>
  )
}
