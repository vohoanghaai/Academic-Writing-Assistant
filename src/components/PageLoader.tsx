import { motion } from 'framer-motion';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-[999999]">
      <motion.img 
        src="https://res.cloudinary.com/di7jeb9p1/image/upload/v1779248679/2_ukzp5r.png" 
        alt="Loading..."
        className="w-48 h-48 md:w-64 md:h-64 object-contain"
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
