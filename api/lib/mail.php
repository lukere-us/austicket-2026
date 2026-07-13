<?php

declare(strict_types=1);

/**
 * Lightweight mail helper. Uses PHP mail() when available.
 * Failures are logged; callers should not expose mail errors to end users.
 */
function send_app_mail(string $to, string $subject, string $textBody): bool
{
  $to = trim($to);
  if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    return false;
  }

  $from = defined('MAIL_FROM') ? (string)MAIL_FROM : 'noreply@austicketlanka.local';
  $fromName = defined('MAIL_FROM_NAME') ? (string)MAIL_FROM_NAME : 'Aus Ticket Lanka';
  $headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . sprintf('%s <%s>', $fromName, $from),
    'Reply-To: ' . $from,
    'X-Mailer: AusTicketLanka',
  ];

  $ok = @mail($to, $subject, $textBody, implode("\r\n", $headers));
  if (!$ok) {
    error_log('[mail] Failed to send to ' . $to . ' subject=' . $subject);
  }
  return (bool)$ok;
}
