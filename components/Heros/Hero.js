import React from 'react';
import styles from '../styles/PromoSection.module.css';
import ImagePopup from '../Misc/ImagePopup';
import { CheckCircle2 } from 'lucide-react';
import { Waitlist } from '@clerk/nextjs';
import YouTubeVideo from '../Misc/YouTubeVideo';

const Hero = () => {
  return (
    <section className={styles.promoSection}>
      <div className={styles.imageWrapper}>
        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center items-center">
          {/* <ImagePopup src='/hero.png' alt='Expense Goose' width='100%' height='100%' /> */}
          <YouTubeVideo url="https://youtu.be/Ms65Pii8CUE" />
        </div>
      </div>

      <div className={styles.content}>
        <h1>
          Expense management software <br />
          <span className="text-primary-color"> Made Easy</span>!
        </h1>
        <p className={styles.description}>
          Track, manage, and optimize your spending with real-time insights. Set budgets, analyze trends, and stay in control—all in one place for Expense management software for business and personal use.
        </p>

        {/* Product Hunt Badge */}
        <div className="mt-6">
          <a
            href="https://www.producthunt.com/posts/expense-goose?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-expense&#0045;goose"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=950226&theme=light&t=1743996217555"
              alt="Expense&#0032;Goose - Track&#0032;spending&#0032;with&#0032;100&#0043;&#0032;free&#0032;financial&#0032;tools&#0046; | Product Hunt"
              style={{ width: '250px', height: '54px' }}
              width="250"
              height="54"
            />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;