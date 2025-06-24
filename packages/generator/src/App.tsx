import { useEffect, useRef } from "react";
import { renderHeading } from "ui-wot-components";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      renderHeading("Hello from Stencil + React!", containerRef.current);
    }
  }, []);

  return <div ref={containerRef}></div>;
}

export default App;
