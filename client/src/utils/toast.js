// client/src/utils/toast.js
// Centralized notification helper for Track My Watts.
// Wraps react-toastify with standardized durations, error normalization,
// and an intentional toastId API for deduplication where needed.

import { toast } from 'react-toastify';

/**
 * Extracts a human-readable error message from various error shapes.
 * Priority: Axios response message → JS Error message → string literal → fallback.
 */
const extractMessage = (err, fallback = 'Something went wrong.') => {
  if (typeof err === 'string') return err;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return fallback;
};

/**
 * Centralized notification helper.
 *
 * Usage:
 *   notify.success('Meter added!')
 *   notify.error(err, 'Failed to add meter.')
 *   notify.warn('Name cannot be empty.')
 *   notify.info('Tip: You can drag to dismiss.')
 *   notify.success('Active meter updated!', { toastId: 'meter-active-update' })
 */
const notify = {
  success: (message, options = {}) =>
    toast.success(message, { autoClose: 3000, ...options }),

  error: (errOrMessage, fallback = 'Something went wrong.', options = {}) =>
    toast.error(extractMessage(errOrMessage, fallback), {
      autoClose: 4500,
      ...options,
    }),

  warn: (message, options = {}) =>
    toast.warn(message, { autoClose: 4000, ...options }),

  info: (message, options = {}) =>
    toast.info(message, { autoClose: 3500, ...options }),

  loading: (message, options = {}) =>
    toast.loading(message, options),

  dismiss: (toastId) => toast.dismiss(toastId),
};

export default notify;
