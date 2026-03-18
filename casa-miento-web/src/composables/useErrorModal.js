import { ref } from 'vue';

export const useErrorModal = () => {
  const modal = ref({
    open: false,
    title: '',
    detail: '',
  });

  const openForError = (error) => {
    modal.value = {
      open: true,
      title: error.title || 'Ocurrio un problema',
      detail: error.detail || error.message || 'No se pudo completar la accion.',
    };
  };

  const closeModal = () => {
    modal.value = {
      ...modal.value,
      open: false,
    };
  };

  return {
    modal,
    openForError,
    closeModal,
  };
};
