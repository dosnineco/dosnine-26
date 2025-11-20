import React from 'react';
import styles from '../styles/WhatsNew.module.css';


const WhatsNew = () => {
  return (
    <div  className={styles.container}>
      <h2 className={styles.title}>Why Every Business Needs a Website</h2>
      <p className={styles.description}>
      
      A website isnt just an expense—its an investment that helps you attract customers and grow revenue. Dosnine.com makes it easy.  
         </p>

      <button className="box-shadow relative  bg-white text-black text-sm  font-bold py-4 sm:py-3 px-4  rounded w-auto"><a href='https://wa.me/message/5LXYP7EBAUHMD1' >WhatsApp Me</a></button>
    </div>
  );
};

export default WhatsNew;
