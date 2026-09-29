import React from 'react';
import Hero36 from '../ui/index';

interface LandingHeroProps {
  onStartWriting: () => void;
  onExploreHowItWorks: () => void;
  onNavigate?: (view: 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient') => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartWriting,
  onExploreHowItWorks,
  onNavigate,
}) => {
  return (
    <Hero36
      onStartWriting={onStartWriting}
      onExploreHowItWorks={onExploreHowItWorks}
      onNavigate={onNavigate}
    />
  );
};
