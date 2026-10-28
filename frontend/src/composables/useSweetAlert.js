import Swal from 'sweetalert2';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true
});

export const showSuccess = (title, text = '') => toast.fire({ icon: 'success', title, text });

export const showError = (title, text = '') => toast.fire({ icon: 'error', title, text });
