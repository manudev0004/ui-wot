import { useEffect, useRef } from "react";
import { renderHeading } from "ui-wot-components";
import { defineCustomElements } from "ui-wot-components/loader";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    defineCustomElements();
    if (containerRef.current) {
      renderHeading("Hello from Stencil + React!", containerRef.current);
    }
  }, []);

  return <div ref={containerRef}></div>;
}

export default App;
