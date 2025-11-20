import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Set target to end of current day (23:59:59.999)
      const targetDate = new Date(now);
      targetDate.setHours(0, 0, 0, 0);
      
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setIsLive(false);
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setIsLive(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-yellow-300 flex items-center justify-center space-x-4 py-6 px-4">
      {isLive ? (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-inherit">🎉 Software is live! Now for <strong>$178USD/1yr.</strong></span>
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-2">
            <Timer className="w-4 h-4 text-inherit" />
            <span className="text-sm font-medium text-inherit">Launch in:</span>
          </div>
          
          <div className="text-inherit flex space-x-3">
            {[
              { label: 'd', value: timeLeft.days },
              { label: 'h', value: timeLeft.hours },
              { label: 'm', value: timeLeft.minutes },
              { label: 's', value: timeLeft.seconds }
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center">
                <div className="bg-white bg-opacity-10 rounded px-2 py-1">
                  <span className="text-sm font-bold text-inherit">
                    {value.toString().padStart(2, '0')}
                  </span>
                </div>
                <span className="ml-1 text-xs text-inherit opacity-90">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CountdownTimer;