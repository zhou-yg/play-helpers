"use client";

import { useEffect, useRef } from "react";

/** Loads Google's model-viewer custom element for GLB/GLTF preview. */
export default function ModelPreview({ src }: { src: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
    script.onerror = () => console.warn("model-viewer failed to load");
    document.head.appendChild(script);
  }, []);

  return (
    <div
      ref={hostRef}
      className="flex h-full w-full items-center justify-center"
    >
      <model-viewer
        src={src}
        camera-controls
        auto-rotate
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
