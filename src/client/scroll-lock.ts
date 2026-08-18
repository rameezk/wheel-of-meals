import { useEffect } from "react";

export const useScrollLock = () => {
  useEffect(() => {
    const { body } = document;
    const scrollY = window.scrollY;
    const before = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      body.style.position = before.position;
      body.style.top = before.top;
      body.style.left = before.left;
      body.style.right = before.right;
      body.style.width = before.width;
      if (scrollY) window.scrollTo(0, scrollY);
    };
  }, []);
};
