import React from 'react';
import styles from '../styles/howitworks.module.css';
import YouTubeVideo from '../Misc/YouTubeVideo';
import Link from "next/link";


const HowItWorks = () => {
  return (

<section className={styles.howItWorks}>
<h2 className={styles.worksTitle}>How to get a website in a day?</h2>
<p className={styles.worksSubtitle}>WORKING PROCESS</p>
<div className={styles.worksContent}>
  
  {/* <img className={styles.worksImage} src="/ai-writer.png" alt="AI Writer Process" /> */}
  <div className={styles.worksSteps}>
    <div className={styles.step}>
      <span className={styles.stepNumber}>1</span>
      <div className={styles.stepText}>
        
        <h3>Check out a live <Link className='text-blue-900' href='https://glowwithcam.vercel.app/'>demo</Link></h3>
        <p>See whats possible with Dosnine. Like it? Lets go!</p>

      </div>
    </div>
    <div className={styles.step}>
      <span className={styles.stepNumber}>2</span>
      <div className={styles.stepText}>
        <h3>Ready to launch?</h3>
        <p>Confirm youre a service-based business that doesnt sell products online.</p>

      </div>
    </div>
    <div className={styles.step}>
      <span className={styles.stepNumber}>3</span>
      <div className={styles.stepText}>
        <h3>Make Your Payment</h3>
        <p>You can also opt for us to buy & configure your domain.

        </p>

      </div>
    </div>
    <div className={styles.step}>
      <span className={styles.stepNumber}>4</span>
      <div className={styles.stepText}>
        <h3>Your Website Goes Live! 🎉</h3>
        <p>Its that simple</p>

      </div>
    </div>
  </div>
</div>
</section>

);
};

export default HowItWorks;
