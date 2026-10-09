import { motion, type Variants } from "framer-motion";
import { TextRepel } from "./text-repel";

interface Hero36Props {
  onStartWriting?: () => void;
  onExploreHowItWorks?: () => void;
  onNavigate?: (view: 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient') => void;
}

export default function Hero36({
  onStartWriting,
  onExploreHowItWorks,
  onNavigate,
}: Hero36Props) {
  // Title: container staggers children line-by-line
  const titleContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.18, delayChildren: 0.32 },
    },
  };

  // Each title line: rises from below with heavy blur
  const titleLineVariants: Variants = {
    hidden: { opacity: 0, y: 50, filter: 'blur(16px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { type: 'spring', damping: 30, stiffness: 82, mass: 1.25 },
    },
  };

  // Subtitle: fades up after both title lines settle
  const subtitleVariants: Variants = {
    hidden: { opacity: 0, y: 18, filter: 'blur(5px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { type: 'spring', damping: 26, stiffness: 110, delay: 0.92 },
    },
  };

  // CTA button: scale-in from slightly small after subtitle
  const ctaVariants: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.94 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', damping: 22, stiffness: 130, delay: 1.12 },
    },
  };

  // Background image: gentle fade + very subtle scale-down reveal
  // Reveals the meadow image as the content is building
  const bgVariants: Variants = {
    hidden: { opacity: 0, scale: 1.05 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0 },
    },
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden antialiased selection:bg-stone-300/50 selection:text-stone-900"
      style={{
        backgroundColor: '#faf9f7',
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      <motion.div
        variants={bgVariants}
        initial="hidden"
        animate="show"
        className="pointer-events-none absolute inset-0 z-0 will-change-transform select-none"
      >
        <img
          src="https://assets.watermelon.sh/bg-hero-36.avif"
          alt="Wildflower meadow representing intentional digital correspondence"
          width={1920}
          height={1080}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover object-bottom outline -outline-offset-1 outline-black/[0.06]"
        />
      </motion.div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col items-center justify-start px-6 pt-12 pb-8 text-center md:pt-16">
          <motion.h1
            variants={titleContainerVariants}
            initial="hidden"
            animate="show"
            className="max-w-5xl text-4xl leading-[1.07] font-extralight tracking-[-0.01em] text-balance text-teal-900 lg:text-[4.75rem] xl:text-[5.5rem] 2xl:text-[6rem]"
          >
            <span className="sr-only">OLD-LETTERS — </span>
            <motion.span
              variants={titleLineVariants}
              className="block will-change-transform"
            >
              <TextRepel
                text="Some things"
                radius={130}
                strength={45}
                stiffness={200}
                damping={15}
                mass={0.35}
                className="justify-center"
              />
            </motion.span>
            <motion.span
              variants={titleLineVariants}
              className="block will-change-transform mt-1 sm:mt-2"
            >
              <TextRepel
                text="are worth waiting for."
                radius={130}
                strength={45}
                stiffness={200}
                damping={15}
                mass={0.35}
                className="justify-center"
              />
            </motion.span>
          </motion.h1>

          {/* Subtitle — sans-serif, muted stone, text-pretty prevents orphans */}
          <motion.p
            variants={subtitleVariants}
            initial="hidden"
            animate="show"
            className="text-md mt-5 max-w-100 leading-[1.7] font-normal text-pretty text-teal-900/80 will-change-transform md:max-w-110"
            style={{ fontFamily: 'sans-serif' }}
          >
            Write something meaningful. Choose when it arrives. Let someone wait for it.
          </motion.p>
          <motion.div
            variants={ctaVariants}
            initial="hidden"
            animate="show"
            className="mt-8 will-change-transform"
          >
            <button
              onClick={onStartWriting}
              className="text-md flex min-h-12 items-center rounded-sm bg-teal-900 px-10 py-3.5 font-medium tracking-[0.01em] text-white shadow-[inset_0_2px_0_2px_rgba(255,255,255,0.10),inset_0_-2px_0_2px_rgba(0,0,0,0.12)] transition-[transform,background-color,box-shadow] duration-150 ease-out text-shadow-2xs hover:bg-teal-800 hover:shadow-[0_2px_6px_rgba(20,83,45,0.22),0_8px_24px_rgba(20,83,45,0.28)] active:scale-[0.96] cursor-pointer"
              style={{ fontFamily: 'sans-serif' }}
            >
              Write a Letter →
            </button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
