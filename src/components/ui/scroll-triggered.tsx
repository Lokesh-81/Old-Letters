import React from 'react';
import { motion, type Variants } from 'motion/react';

export interface LetterScrollItem {
  id: string;
  type: string;
  recipient: string;
  sender: string;
  date: string;
  excerpt: string;
  paperColor: string;
  textColor: string;
  sealColor: string;
  sealSymbol: string;
  hueA: number;
  hueB: number;
  rotation: number;
}

export const CORRESPONDENCE_PAGES: LetterScrollItem[] = [
  {
    id: 'love-letter',
    type: 'LOVE',
    recipient: 'Recipient Name',
    sender: 'Your Name',
    date: '29 September 2026',
    excerpt: 'I wanted to tell you how much I admire the way you pay attention to the quietest things in a crowded room.',
    paperColor: '#faf7f2',
    textColor: '#134e4a',
    sealColor: '#134e4a',
    sealSymbol: '❦',
    hueA: 165,
    hueB: 185,
    rotation: -8,
  },
  {
    id: 'gratitude-letter',
    type: 'GRATITUDE',
    recipient: 'Recipient Name',
    sender: 'Your Name',
    date: '14 October 2026',
    excerpt: 'Your patience during that winter changed everything for me. Thank you for never demanding that I explain myself.',
    paperColor: '#f7f4ed',
    textColor: '#1c1917',
    sealColor: '#854d0e',
    sealSymbol: '⚜',
    hueA: 38,
    hueB: 65,
    rotation: 6,
  },
  {
    id: 'airmail-letter',
    type: 'FRIENDSHIP',
    recipient: 'Recipient Name',
    sender: 'Your Name',
    date: '02 November 2026',
    excerpt: 'I am posting this from the ferry station at dawn. The morning light on the water made me wish you were here with a notebook.',
    paperColor: '#f4f6f8',
    textColor: '#0f172a',
    sealColor: '#1e3a8a',
    sealSymbol: '✈',
    hueA: 200,
    hueB: 230,
    rotation: -7,
  },
  {
    id: 'apology-letter',
    type: 'APOLOGY',
    recipient: 'Recipient Name',
    sender: 'Your Name',
    date: '18 November 2026',
    excerpt: 'I spoke before thinking. I value our companionship far too deeply to let careless words stand between us.',
    paperColor: '#fbfaf8',
    textColor: '#292524',
    sealColor: '#701a75',
    sealSymbol: '❧',
    hueA: 290,
    hueB: 330,
    rotation: 8,
  },
  {
    id: 'midnight-archive',
    type: 'SOLACE',
    recipient: 'Recipient Name',
    sender: 'Your Name',
    date: '01 December 2026',
    excerpt: 'When the world is too loud, take comfort in knowing that not everything requires an immediate answer.',
    paperColor: '#131e1c',
    textColor: '#f4f2ec',
    sealColor: '#2dd4bf',
    sealSymbol: '☽',
    hueA: 170,
    hueB: 210,
    rotation: -6,
  },
];

interface ScrollTriggeredProps {
  items?: LetterScrollItem[];
  onSelectLetter?: (item: LetterScrollItem) => void;
}

export default function ScrollTriggered({
  items = CORRESPONDENCE_PAGES,
  onSelectLetter,
}: ScrollTriggeredProps) {
  return (
    <div className="w-full py-16">
      <div style={container}>
        {items.map((item, i) => (
          <Card
            key={item.id}
            item={item}
            i={i}
            onSelect={() => onSelectLetter?.(item)}
          />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  item: LetterScrollItem;
  i: number;
  onSelect: () => void;
}

function Card({ item, i, onSelect }: CardProps) {
  const background = `linear-gradient(306deg, ${hue(item.hueA)}, ${hue(item.hueB)})`;

  const cardVariants: Variants = {
    offscreen: {
      y: 300,
      opacity: 0.4,
    },
    onscreen: {
      y: 30,
      rotate: item.rotation,
      opacity: 1,
      transition: {
        type: 'spring',
        bounce: 0.38,
        duration: 0.85,
      },
    },
  };

  return (
    <motion.div
      className={`card-container-${i} group`}
      style={cardContainer}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ amount: 0.5, once: false }}
    >
      {/* Background organic splash glow matching the letter hue */}
      <div style={{ ...splash, background }} className="opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Spring animated paper sheet popping up from below */}
      <motion.div
        style={{
          ...card,
          backgroundColor: item.paperColor,
          color: item.textColor,
        }}
        variants={cardVariants}
        className="card cursor-pointer preserve-3d transition-shadow duration-300 hover:shadow-2xl"
        onClick={onSelect}
      >
        {/* Physical Paper Interior */}
        <div className="w-full h-full p-7 flex flex-col justify-between select-none relative overflow-hidden">
          {/* Top Letterhead */}
          <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-serif text-white shadow-xs"
                style={{ backgroundColor: item.sealColor }}
              >
                {item.sealSymbol}
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase opacity-70">
                {item.type} LETTER
              </span>
            </div>
            <span className="text-[10px] font-mono opacity-60">
              {item.date}
            </span>
          </div>

          {/* Salutation & Letter Prose */}
          <div className="space-y-3 py-3">
            <div className="text-xl font-medium tracking-tight font-serif">
              {item.recipient === 'Recipient Name' || item.recipient === 'Recipient'
                ? 'Dear Recipient,'
                : `Dear ${item.recipient},`}
            </div>
            <p className="text-sm font-serif italic leading-relaxed opacity-85 line-clamp-4">
              "{item.excerpt}"
            </p>
          </div>

          {/* Bottom Signoff & CTA */}
          <div className="pt-3 border-t border-black/10 flex items-center justify-between">
            <div className="text-xs font-serif italic opacity-75">
              Yours, <span className="font-semibold">{item.sender || 'Your Name'}</span>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider px-3 py-1 rounded-sm bg-black/5 hover:bg-black/10 transition-colors font-medium">
              Write this →
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const hue = (h: number) => `hsl(${h}, 65%, 72%)`;

/**
 * ==============   Styles   ================
 */

const container: React.CSSProperties = {
  margin: '40px auto',
  maxWidth: 540,
  paddingBottom: 80,
  width: '100%',
};

const cardContainer: React.CSSProperties = {
  overflow: 'hidden',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  paddingTop: 30,
  marginBottom: -90,
};

const splash: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  clipPath: `path("M 0 303.5 C 0 292.454 8.995 285.101 20 283.5 L 460 219.5 C 470.085 218.033 480 228.454 480 239.5 L 500 430 C 500 441.046 491.046 450 480 450 L 20 450 C 8.954 450 0 441.046 0 430 Z")`,
};

const card: React.CSSProperties = {
  width: 320,
  height: 420,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 16,
  boxShadow:
    '0 10px 30px -10px rgba(19, 78, 74, 0.2), 0 20px 45px -15px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.1)',
  transformOrigin: '10% 60%',
};
