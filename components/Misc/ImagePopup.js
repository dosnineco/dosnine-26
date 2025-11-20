import React, { useState } from 'react';
import styles from '../styles/ImagePopup.module.css';

const ImagePopup = ({ src, alt,width,height }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <div className={styles.imageContainer}>
      <div className={styles.imagewrapper}>
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={styles.image}
          onClick={openModal}
        />
      </div>

      {isOpen && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeModal}>&times;</button>
            <img src={src} alt={alt} className={styles.modalImage} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePopup;
