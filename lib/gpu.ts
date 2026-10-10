// Shared quality flag for the 3D scenes. Starts low on phones and flips to low when the frame rate drops.
export const gpu = {
  low:
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768),
};
