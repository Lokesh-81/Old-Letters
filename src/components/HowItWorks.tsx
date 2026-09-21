import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { Clock, ShieldCheck, Heart, Send, Feather, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface HowItWorksProps {
  onStartWriting: () => void;
}

export function HowItWorks({ onStartWriting }: HowItWorksProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mb-16"
      >
        <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-2">
          THE PHILOSOPHY & METHOD
        </div>
        <h1 className="font-serif text-3xl sm:text-6xl font-light text-[#241D18] leading-tight">
          How OLD-LETTERS works.
        </h1>
        <p className="font-serif text-[#5E5046] text-lg sm:text-xl mt-4 italic font-light leading-relaxed">
          "Some things are worth waiting for."
        </p>
      </motion.div>

      {/* The 4 Ritual Steps with sliding stagger */}
      <div className="space-y-8 sm:space-y-12">
        {/* Step 1 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#FAF8F5] p-6 sm:p-10 rounded-xl border border-[#D8C4A9] shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="md:col-span-4 font-mono">
            <span className="text-3xl sm:text-4xl font-serif text-[#5A2528] font-bold">01</span>
            <div className="text-xs tracking-widest uppercase text-[#886C3E] mt-1">INTENTION & PAPER</div>
          </div>
          <div className="md:col-span-8 space-y-2">
            <h3 className="font-serif text-2xl text-[#241D18]">Select a Postal Category and Fine Stationery</h3>
            <p className="font-serif text-sm sm:text-base text-[#5E5046] leading-relaxed">
              Choose from 11 traditional correspondence categories (Love, Apology, Friendship, I Miss You, etc.)
              and pick from 16 archival paper stocks including vellums, pressed botanicals, Paris airmail, and
              typewriter bond.
            </p>
          </div>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#FAF8F5] p-6 sm:p-10 rounded-xl border border-[#D8C4A9] shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="md:col-span-4 font-mono">
            <span className="text-3xl sm:text-4xl font-serif text-[#5A2528] font-bold">02</span>
            <div className="text-xs tracking-widest uppercase text-[#886C3E] mt-1">THE WRITING DESK</div>
          </div>
          <div className="md:col-span-8 space-y-2">
            <h3 className="font-serif text-2xl text-[#241D18]">Compose Without Distraction</h3>
            <p className="font-serif text-sm sm:text-base text-[#5E5046] leading-relaxed">
              Sit at a quiet virtual desk. As you write, your words appear on your selected paper with realistic
              font weight and line spacing. Optionally enclose a vintage Polaroid photograph or Super-8 film snippet.
            </p>
          </div>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#FAF8F5] p-6 sm:p-10 rounded-xl border border-[#D8C4A9] shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="md:col-span-4 font-mono">
            <span className="text-3xl sm:text-4xl font-serif text-[#5A2528] font-bold">03</span>
            <div className="text-xs tracking-widest uppercase text-[#886C3E] mt-1">DELIBERATE TRANSIT</div>
          </div>
          <div className="md:col-span-8 space-y-2">
            <h3 className="font-serif text-2xl text-[#241D18]">Choose When Your Words Should Arrive</h3>
            <p className="font-serif text-sm sm:text-base text-[#5E5046] leading-relaxed">
              Standard postal transit (48 hours), 1 week, Winter/Summer Solstice, or precise anniversary dates.
              The letter remains sealed in our digital vault until the clock strikes that exact hour.
            </p>
          </div>
        </motion.div>

        {/* Step 4 */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#FAF8F5] p-6 sm:p-10 rounded-xl border border-[#D8C4A9] shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="md:col-span-4 font-mono">
            <span className="text-3xl sm:text-4xl font-serif text-[#5A2528] font-bold">04</span>
            <div className="text-xs tracking-widest uppercase text-[#886C3E] mt-1">THE UNSEALING RITUAL</div>
          </div>
          <div className="md:col-span-8 space-y-2">
            <h3 className="font-serif text-2xl text-[#241D18]">Unseal the Wax and Read in Quiet</h3>
            <p className="font-serif text-sm sm:text-base text-[#5E5046] leading-relaxed">
              When the arrival date comes, the recipient receives their confidential dispatch. They solve a shared memory
              passphrase, break the virtual wax seal, and read in an intimate distraction-free parlor.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-16 text-center"
      >
        <button
          onClick={onStartWriting}
          className="inline-flex items-center gap-2 px-9 py-4 bg-[#5A2528] text-white rounded-full text-xs font-mono tracking-[0.2em] uppercase hover:bg-[#3F191B] transition-all shadow-md hover:shadow-lg font-semibold"
        >
          <span>WRITE A LETTER →</span>
        </button>
      </motion.div>
    </div>
  );
}
