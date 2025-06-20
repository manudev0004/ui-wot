<h1>
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg">
  <img title="ThingWeb ui-wot" alt="Thingweb ui-wot logo" src="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/ui-wot.svg" width="300">
</picture>
</h1>

> UI for your IoT applications and devices

Welcome to **UI-WoT**, a Google Summer of Code 2025 project with Eclipse Foundation!. We are working to parse any valid WoT Thing Description, extract all its affordances (properties, actions, and events), and then automatically render them as usable UI widgets, and enable real-time interaction

## 🎯 What We Aim

By the end of this GSoC journey, UI-WoT will be able to:

*   **Consume Any TD:** Load and understand any valid W3C WoT Thing Description.
*   **Auto-Generate UI:** Instantly create interactive UI cards for every property, action, and event in that TD.
*   **UI Choices:** Give you options to pick from many UI for each affordance (e.g., a slider for a number, a toggle for a boolean).
*   **Personalized Dashboards:** Let you drag, drop, and resize cards to build your perfect control panel, and even save your layouts.

## 📑 Flow Chart 
![UI-WoT Flow Chart](./public/images/flowchart.png)

## </> The Proposed Tech

These are currently proposed tools, may changes according to further need. 

| Tool | Purpose | Reason |
|---|---|---|
| **Vite** | Build Tool, Development Server | Fast development server, quick build times, optimized for modern web development.|
| **React** | Frontend Framework | Component-based architecture, large community, ideal for dynamic UI generation.|
| **Tailwind CSS** | CSS Framework | Utility-first approach good for rapid UI development, highly customizable, excellent for responsive design.|
| **DaisyUI & Others** | Component Library | Pre-styled accessible UI components on top of Tailwind CSS will enhance UI development.|
| **Node-WoT** | WoT Interaction Library | Official W3C WoT implementation for JavaScript, provides high-level API for interacting with Things.|
| **Vitest** | Testing Framework | Since we're on Vite it is natural fit, Jest-compatible. |
| **React Grid Layout** | Dashboard Layout | For drag and drop and resizable grid layout for building interactive dashboards. |

## 💠 Figma Design
Feel free to give suggestions here, will love to hear from you!
[View the UI-WoT Figma Design](https://www.figma.com/design/PcgN3oVPl6387MqqidCF1H/UI-WOT?node-id=0-1&t=6rQYTFoWH27GqBwQ-1)

I will be sharing the progress with the community. Stay tuned!