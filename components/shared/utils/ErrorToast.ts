import { toast } from 'react-hot-toast';

export const showErrorToast = (message) => {
  toast(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#f44336',
      color: '#fff',
    },
  });
};
