import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { ShimmerButton } from "./shimmer-button";

interface AnimatedHeroProps {
  onGetStarted: () => void;
}

function AnimatedHero({ onGetStarted }: AnimatedHeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["legal", "medical", "financial", "technical", "academic"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full bg-white border-b border-bolt-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex gap-8 py-20 lg:py-28 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col">
            <h1 className="text-4xl md:text-6xl max-w-3xl tracking-tighter text-center font-regular text-bolt-gray-900">
              <span>Understand any document</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                 {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-bolt-gray-600 max-w-2xl text-center mx-auto">
              One tool that simplifies complex documents. 
              Paste text, select context, get clarity. No jargon, no confusion.
            </p>
          </div>

          <div className="flex flex-row gap-3">
            <Button size="lg" className="gap-2" variant="outline">
              Learn more
            </Button>
            <ShimmerButton 
              className="shadow-2xl h-11 px-8" 
              borderRadius="0.375rem"
              onClick={onGetStarted}
            >
              <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white">
                Start Analyzing
              </span>
            </ShimmerButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AnimatedHero };
