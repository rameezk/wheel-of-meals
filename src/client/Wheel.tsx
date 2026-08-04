import { useEffect, useRef, type CSSProperties } from "react";
import { wheelSpinMillis } from "./motion";

const foods = ["🍕", "🍜", "🥘", "🌮", "🍣", "🥗", "🍝", "🍛"];

const wholeTurns = 4;

const segment = 360 / foods.length;

type TheWheelProps = {
  spinNumber: number;
  onLanded: () => void;
};

export const TheWheel = ({ spinNumber, onLanded }: TheWheelProps) => {
  const landed = useRef(onLanded);

  useEffect(() => {
    landed.current = onLanded;
  });

  useEffect(() => {
    const timer = setTimeout(() => landed.current(), wheelSpinMillis);
    return () => clearTimeout(timer);
  }, []);

  const stopsAt = wholeTurns * 360 + (spinNumber % foods.length) * segment;

  return (
    <button
      type="button"
      onClick={() => landed.current()}
      className="absolute inset-0 flex cursor-pointer items-center justify-center"
    >
      <span className="sr-only">Skip the spin</span>

      <span aria-hidden className="relative flex h-56 w-56 items-center">
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-2xl text-emerald-300">
          ▼
        </span>

        <span
          style={
            {
              "--wheel-stops-at": `${stopsAt}deg`,
              "--wheel-spin-millis": `${wheelSpinMillis}ms`,
            } as CSSProperties
          }
          className="wheel-spin relative mx-auto block h-44 w-44 rounded-full border border-stone-800 bg-stone-900/60 shadow-[0_0_60px_-15px] shadow-emerald-500/40"
        >
          {foods.map((food, position) => (
            <span
              key={food}
              style={{
                transform: `translate(-50%, -50%) rotate(${position * segment}deg) translateY(-4.25rem)`,
              }}
              className="absolute top-1/2 left-1/2 text-3xl"
            >
              {food}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
};
