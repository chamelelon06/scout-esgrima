
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white text-gray-800 p-6 rounded-xl shadow-2xl max-w-lg w-11/12 transform transition-all duration-300 scale-95 animate-modal-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// Add a simple keyframe animation for the modal pop-in effect in the style tag
const style = document.createElement('style');
style.innerHTML = `
@keyframes modal-pop-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-modal-pop-in {
  animation: modal-pop-in 0.2s ease-out forwards;
}
`;
document.head.appendChild(style);


export default Modal;
