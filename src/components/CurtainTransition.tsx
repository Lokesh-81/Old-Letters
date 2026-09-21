import { motion } from 'motion/react';

interface CurtainTransitionProps {
  currentView: string;
}

export function CurtainTransition({ currentView }: CurtainTransitionProps) {
  return (
    <motion.div
      key={`curtain-${currentView}`}
      initial={{ height: '100%', clipPath: 'inset(0% 0% 0% 0%)' }}
      animate={{
        height: '0%',
        clipPath: 'inset(0% 0% 100% 0%)',
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="pointer-events-none absolute inset-0 z-50 bg-[#EADBCE] overflow-hidden flex flex-col items-center justify-center border-b border-[#D8C4A9]/80 shadow-md"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(90, 37, 40, 0.03) 0%, transparent 70%),
          radial-gradient(#C4AC8D 0.75px, transparent 0.75px)
        `,
        backgroundSize: '100% 100%, 20px 20px',
      }}
    >
      <div className="flex flex-col items-center text-center px-6 py-3 rounded-full border border-[#D8C4A9]/70 bg-[#FAF7F2]/90 backdrop-blur-xs shadow-xs">
        <span className="font-serif text-lg sm:text-xl tracking-[0.2em] uppercase font-medium text-[#2C241F]">
          OLD-LETTERS
        </span>
        <span className="text-[10px] font-serif italic text-[#5A2528] tracking-wide">
          Some things are worth waiting for.
        </span>
      </div>
    </motion.div>
  );
}
