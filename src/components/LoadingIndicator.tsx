import { motion } from 'framer-motion';

export default function LoadingIndicator() {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <img 
        src="https://res.cloudinary.com/di7jeb9p1/image/upload/v1779248214/1_bkllre.png" 
        alt="Loading" 
        className="absolute w-8 h-8 object-contain" 
      />
    </div>
  );
}
